

// controller/meta/metaAuthController.js
// Node 18+ (global fetch). CommonJS.

const crypto = require('crypto');
const { Types } = require('mongoose');
const FacebookAuth = require('../../schemas/meta/MetaUserSchema'); // adjust path

const {
  FB_APP_ID,
  FB_APP_SECRET,
  FB_GRAPH_VERSION = 'v19.0',
  STATE_SECRET,
  ALLOWED_FE_ORIGINS = '',
} = process.env;
 const ALLOWED = ALLOWED_FE_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);

const WA_REDIRECT_PATH = '/auth/whatsapp/callback';



// ---- logging helpers ----
const ts = () => new Date().toISOString();
const LOG = (...a) => console.log(`[WA][${ts()}]`, ...a);
const WARN = (...a) => console.warn(`[WA][WARN][${ts()}]`, ...a);
const ERR = (label, e) => {
  const boom = e?.output
    ? { statusCode: e.output.statusCode, payload: e.output.payload }
    : undefined;
  console.error(`[WA][ERR][${ts()}] ${label}`, {
    name: e?.name, message: e?.message, code: e?.code, status: e?.status,
    stack: e?.stack, boom
  });
};

function humanDiscReason(code) {
  const map = {
    [DisconnectReason.badSession]: 'badSession',
    [DisconnectReason.connectionClosed]: 'connectionClosed',
    [DisconnectReason.connectionLost]: 'connectionLost',
    [DisconnectReason.connectionReplaced]: 'connectionReplaced',
    [DisconnectReason.loggedOut]: 'loggedOut',
    [DisconnectReason.restartRequired]: 'restartRequired',
    [DisconnectReason.timedOut]: 'timedOut'
  };
  return map[code] || code;
}



// ---------- helpers ----------
const safeRet = (ret) => (typeof ret === 'string' && ret.startsWith('/')) ? ret : '/settings/meta';

function pickOrigin(req) {
  const q = req.query.origin;
  if (q && ALLOWED.includes(q)) return q;
  const host  = req.get('x-forwarded-host') || req.get('host');
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${host}`;
}

const CALLBACK_PATH = '/auth/facebook/callback';

function buildRedirectUri(req) {
  const origin = pickOrigin(req);
  return `${origin}${CALLBACK_PATH}`;
}

function originFromRedirect(redirectUri) {
  const u = new URL(redirectUri);
  return `${u.protocol}//${u.host}`;
}

function signState(obj) {
  const json = JSON.stringify(obj);
  const mac  = crypto.createHmac('sha256', STATE_SECRET).update(json).digest('hex');
   return Buffer.from(JSON.stringify({ json, mac })).toString('base64url');
}

function verifyState(stateB64) {
  const parsed = JSON.parse(Buffer.from(stateB64, 'base64url').toString());
  const { json, mac } = parsed || {};
  const expect = crypto.createHmac('sha256', STATE_SECRET).update(json).digest('hex');
  if (!mac || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) {
    throw new Error('Invalid state');
  }
  return JSON.parse(json);
}

function addQuery(url, obj) {
  const u = new URL(url);
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  });
  return u.toString();
}

// ---------- controllers ----------
// auth controller---->

// this two are same but when chose form two then it not redirect that the issue
// fbLoginStart
exports.fbLoginStart = async (req, res, next) => {
  console.log('fb login start-----controller start--->', req.query);
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

    const redirect_uri = buildRedirectUri(req);      // https://<ngrok>/auth/facebook/callback
    const uid  = req.user._id.toString();
    const ret  = safeRet(req.query.return);
    const scope = [
      'public_profile','email','business_management',
      'pages_show_list','pages_read_engagement','pages_manage_metadata','pages_messaging',
      'whatsapp_business_management','whatsapp_business_messaging'
    ].join(',');
    const state = signState({ uid, ret, redir: redirect_uri, ts: Date.now() });

    const u = new URL(`https://www.facebook.com/${FB_GRAPH_VERSION}/dialog/oauth`);
    u.searchParams.set('client_id', FB_APP_ID);
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('state', state);
    u.searchParams.set('scope', scope);

 
    const force = String(req.query.force || '');  // 'reauth' | 'rerequest' | ''
    if (force === 'reauth') {
      u.searchParams.set('auth_type', 'reauthenticate');
      u.searchParams.set('auth_nonce', require('crypto').randomUUID());
    } else if (force === 'rerequest') {
      u.searchParams.set('auth_type', 'rerequest');
    }

    const url = u.toString();
    console.log('[FB][start][url]', url);
    return res.json({ url });
  } catch (err) { console.error(err); next(err); }
};



exports.fbLoginCallback = async (req, res, next) => {
  console.log('[FB][callback][query]', req.query);
  try {
    if (req.query.error) {
      const msg = req.query.error_description || req.query.error;
      console.warn('[FB][callback][oauth_error]', msg);
      return res.status(400).send(`Facebook error: ${msg}`);
    }

    const code = req.query.code;
    const stateParam = req.query.state;
    if (!code || !stateParam) {
      console.warn('[FB][callback][missing]', { code: !!code, state: !!stateParam });
      const origin = originFromRedirect(buildRedirectUri(req));
      const fallback = new URL('/admin/settings/meta', origin).toString();
      return res.redirect(302, addQuery(fallback, { connected: 0, error: 'missing_code_or_state' }));
    }

    // verify state ONCE
    const state = verifyState(stateParam);
    const redirect_uri = state.redir;
    const ret = state.ret;
    const userObjectId = new Types.ObjectId(state.uid);

    console.log('[FB][callback][state_ok]', { redirect_uri, uid: state.uid, ret });

    // 1) code -> short-lived
    const tokenUrl =
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token` +
      `?client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&client_secret=${encodeURIComponent(FB_APP_SECRET)}` +
      `&redirect_uri=${encodeURIComponent(redirect_uri)}` +
      `&code=${encodeURIComponent(code)}`;

    const tokRes = await fetch(tokenUrl);
    console.log('[FB][callback][exchange_slt_status]', tokRes.status);
    if (!tokRes.ok) throw new Error(`Token exchange failed: ${tokRes.status} ${await tokRes.text()}`);
    const shortTok = await tokRes.json();

    // 2) SLT -> long-lived
    const llUrl =
      `https://graph.facebook.com/${FB_GRAPH_VERSION}/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${encodeURIComponent(FB_APP_ID)}` +
      `&client_secret=${encodeURIComponent(FB_APP_SECRET)}` +
      `&fb_exchange_token=${encodeURIComponent(shortTok.access_token)}`;

    const llRes = await fetch(llUrl);
    console.log('[FB][callback][exchange_llt_status]', llRes.status);
    if (!llRes.ok) throw new Error(`Long-lived exchange failed: ${llRes.status} ${await llRes.text()}`);
    const longTok = await llRes.json();

    // 3) /me
    const meUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/me?fields=id,name,email&access_token=${encodeURIComponent(longTok.access_token)}`;
    const meRes = await fetch(meUrl);
    console.log('[FB][callback][me_status]', meRes.status);
    if (!meRes.ok) throw new Error(`GET /me failed: ${meRes.status} ${await meRes.text()}`);
    const me = await meRes.json();
    console.log('[FB][callback][me]', { id: me.id, name: me.name });

    // 4) upsert (key by CRM user)
    await FacebookAuth.findOneAndUpdate(
      { userId: userObjectId },
      {
        userId: userObjectId,                  // store as ObjectId
        fbUserId: me.id,
        fbUserName: me.name,
        email: me.email || null,
        longLivedUserToken: longTok.access_token,
        longLivedTokenIssuedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('[FB][callback][db_upsert_ok]', { userId: userObjectId.toString() });

    // 5) redirect back
    const origin = originFromRedirect(redirect_uri);
    const finalUrl = new URL(ret || '/settings/meta', origin).toString();
    return res.redirect(addQuery(finalUrl, { connected: 1, fb_name: me.name }));
  } catch (err) {
    console.error('[FB][callback][error]', err);
    try {
      const origin = originFromRedirect(buildRedirectUri(req));
      const fallback = new URL('/admin/settings/meta', origin).toString();
      const reason = (err && err.message) ? err.message.slice(0, 120) : 'fb_oauth_failed';
      return res.redirect(addQuery(fallback, { connected: 0, error: 'fb_oauth_failed', reason }));
    } catch {
      return next(err);
    }
  }
};

// controller/meta/metaAuthController.js
exports.fbUnlink = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

    const doc = await FacebookAuth.findOne({ userId: req.user._id }).lean();
    if (!doc) return res.json({ ok: true, deleted: false });

    // 1) Unsubscribe from pages (only if you subscribed previously)
    const unsub = (doc.pages || [])
      .filter(p => p?.pageId && p?.accessToken)
      .map(p => fetch(
        `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/${p.pageId}/subscribed_apps?access_token=${encodeURIComponent(p.accessToken)}`,
        { method: 'DELETE' }
      ).catch(() => null));

    // 2) Revoke your app for this user
    const revoke = doc.longLivedUserToken
      ? fetch(
          `https://graph.facebook.com/${process.env.FB_GRAPH_VERSION}/me/permissions?access_token=${encodeURIComponent(doc.longLivedUserToken)}`,
          { method: 'DELETE' }
        ).catch(() => null)
      : Promise.resolve();

    await Promise.allSettled([...unsub, revoke]);

    // 3) Delete local record
    await FacebookAuth.deleteOne({ userId: req.user._id });

    return res.json({ ok: true, revoked: true, deleted: true });
  } catch (e) { next(e); }
};

// facebook other works------->
// List status (connected? name? cached pages?)
exports.fbStatus = async (req, res, next) => {
  console.log('fb status check-----controller start--->');
  try {
    const doc = await FacebookAuth.findOne({ userId: new Types.ObjectId(req.user._id) }).lean();
    if (!doc) return res.json({ connected: false, pages: [] });

    res.json({
      connected: !!doc.longLivedUserToken,
      fbUserId: doc.fbUserId || null,
      fbUserName: doc.fbUserName || null,
      pages: (doc.pages || []).map(p => ({
        pageId: p.pageId, name: p.name
      })),
      activePageId: doc.activePageId || null,
    });
  } catch (e) { next(e); }
};

// GET /auth/facebook/pages
exports.fbListPages = async (req, res, next) => {
  try {
    const doc = await FacebookAuth.findOne({ userId: req.user._id }).lean();
    if (!doc?.longLivedUserToken) return res.status(400).json({ error: 'NO_USER_TOKEN' });

    const fields = 'id,name,access_token,tasks,instagram_business_account';
    const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100&access_token=${encodeURIComponent(doc.longLivedUserToken)}`;

    const r = await fetch(url);
    const j = await r.json();
    if (!r.ok) return res.status(400).json(j);

    // persist pages (keep only needed fields)
    await FacebookAuth.updateOne(
      { userId: req.user._id },
      {
        $set: {
          pages: (j.data || []).map(p => ({
            pageId: p.id,
            name: p.name,
            accessToken: p.access_token,
            tasks: p.tasks || [],
            instagramBusinessAccount: p.instagram_business_account?.id || null,
          })),
          updatedAt: new Date(),
        }
      }
    );
    res.json({ pages: j.data || [] });
  } catch (e) { next(e); }
};

// POST /auth/facebook/pages/select  { pageId }
exports.fbSelectPage = async (req, res, next) => {
  try {
    const { pageId } = req.body || {};
    if (!pageId) return res.status(400).json({ error: 'PAGE_ID_REQUIRED' });

    const doc = await FacebookAuth.findOne({ userId: req.user._id });
    const page = doc?.pages?.find(p => p.pageId === pageId);
    if (!page?.accessToken) return res.status(404).json({ error: 'PAGE_NOT_FOUND' });

    // Subscribe app to the page (Messenger/webhooks)
    const subscribed_fields = [
      'messages',
      'messaging_postbacks',
      'messaging_optins',
      'messaging_referrals',
      'message_deliveries',
      'message_reads',
      'messaging_handovers',
      'standby'
    ].join(',');

    const subUrl = `https://graph.facebook.com/${FB_GRAPH_VERSION}/${pageId}/subscribed_apps`;
    const subRes = await fetch(subUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:
        `subscribed_fields=${encodeURIComponent(subscribed_fields)}&access_token=${encodeURIComponent(page.accessToken)}`
    });
    const subJ = await subRes.json();
    if (!subRes.ok) return res.status(400).json(subJ);

    // mark active
    doc.activePageId = pageId;
    await doc.save();

    res.json({ ok: true, pageId, subscribed: true });
  } catch (e) { next(e); }
};

// POST /meta/messages  { psid, text }
exports.fbSendMessage = async (req, res, next) => {
  try {
    const { psid, text } = req.body || {};
    if (!psid || !text) return res.status(400).json({ error: 'PSID_TEXT_REQUIRED' });

    const auth = await FacebookAuth.findOne({ userId: req.user._id }).lean();
    const page = auth?.pages?.find(p => p.pageId === auth?.activePageId);
    if (!page?.accessToken) return res.status(400).json({ error: 'NO_ACTIVE_PAGE' });

    const url = `https://graph.facebook.com/${FB_GRAPH_VERSION}/me/messages?access_token=${encodeURIComponent(page.accessToken)}`;
    const payload = { recipient: { id: psid }, message: { text } };

    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json();
    if (!r.ok) return res.status(400).json(j);
    res.json({ ok: true, result: j });
  } catch (e) { next(e); }
};



// =============== WHATSAPP (Embedded Signup 'controllers' – Link/Unlink/Status) ===============


// Build WA redirect URI (same origin logic; different path)
function buildWaRedirectUri(req) {
  const origin = pickOrigin(req);
  return `${origin}${WA_REDIRECT_PATH}`;
}

/**
 * ========== WhatsApp: Start ESU ==========
 * GET /auth/whatsapp/link/start?tenant_id=...
 * - Requires CRM auth (checkUserId adds req.user)
 * - Returns { ok:true, url } for popup
 */

// const ESU_URL = `https://www.facebook.com/${process.env.API_VERSION}/dialog/whatsapp_business_account_linking`;

// const ESU_URL = `https://www.facebook.com/${process.env.API_VERSION}/dialog/oauth`;

const ESU_URL = `https://www.facebook.com/v19.0/dialog/oauth`;

exports.waLinkStart = async (req, res, next) => {
  console.log('WhatsApp ESU start received--------------->', req.query);
  try {
    if (!req.user?._id)
      return res.status(401).json({ error: 'LOGIN_REQUIRED' });

    const redirect_uri = buildWaRedirectUri(req);
    console.log('WhatsApp Redirect URI:', redirect_uri);

    const state = signState({
      uid: req.user._id.toString(),
      redir: redirect_uri,
      ts: Date.now(),
      nonce: crypto.randomUUID(),
    });

    console.log('Generated State:', state);

    const u = new URL(ESU_URL);
    u.searchParams.set('app_id', process.env.FB_APP_ID); // app id as string
    u.searchParams.set('redirect_uri', redirect_uri);
    u.searchParams.set('state', state);
    u.searchParams.set('config_id', process.env.FACEBOOK_CONFIG_ID);
    u.searchParams.set('response_type', 'code'); // required for code grant
    u.searchParams.set('override_default_response_type', 'true'); // to ensure code response

    // Optional: add extra setup information here if desired, else omit
    // u.searchParams.set('extras', JSON.stringify({setup: {...}}));

    console.log('Generated OAuth URL:', u.toString());

    return res.json({ ok: true, url: u.toString() });
  } catch (err) {
    console.error('[WA][ESU][start][error]', err.stack || err);
    next(err);
  }
};




exports.waCallbackGet = async (req, res, next) => {
  console.log('WhatsApp ESU get callback received:----------->', req.query);
  try {
    const { state: stateB64 } = req.query || {};
    if (!stateB64) return res.status(400).send('Missing state');

    const state = verifyState(stateB64);
    const { tenant_id, uid, redir } = state || {};

    const waba_id = req.query.waba_id;
    const phone_number_id = req.query.phone_number_id;
    const display_phone_number = req.query.display_phone_number;
    const business_id = req.query.business_id;

    if (!waba_id || !phone_number_id) {
      return res.status(400).send('Missing WhatsApp IDs from ESU (waba_id/phone_number_id)');
    }

    await FacebookAuth.findOneAndUpdate(
      { userId: new Types.ObjectId(uid) },
      {
        $set: {
          waTenantId: tenant_id,
          wabaId: waba_id,
          phoneNumberId: phone_number_id,
          displayPhoneNumber: display_phone_number || null,
          waBusinessId: business_id || null,
          waLinkedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[WA][ESU][callback][GET][ok]', { tenant_id, waba_id, phone_number_id });

    // redirect back to your front-end "linked" page (keep it simple)
    const origin = originFromRedirect(redir || buildWaRedirectUri(req));
    const back = new URL('/settings/meta', origin);
    back.searchParams.set('wa_connected', '1');
    back.searchParams.set('tenant_id', tenant_id);
    return res.redirect(back.toString());
  } catch (err) { console.error('[WA][ESU][callback][GET][error]', err); next(err); }
};

/**
 * ========== WhatsApp: Callback (POST – body delivery) ==========
 * Some ESU variants POST the same fields. Accept both forms.
 */
exports.waCallbackPost = async (req, res, next) => {
  console.log('WhatsApp ESU POST callback received:----------->', req.body);
  try {
    const { state: stateB64, waba_id, phone_number_id, display_phone_number, business_id } = req.body || {};
    if (!stateB64) return res.status(400).json({ ok: false, error: 'Missing state' });

    const state = verifyState(stateB64);
    const { tenant_id, uid } = state || {};
    if (!waba_id || !phone_number_id) {
      return res.status(400).json({ ok: false, error: 'Missing WhatsApp IDs' });
    }

    await FacebookAuth.findOneAndUpdate(
      { userId: new Types.ObjectId(uid) },
      {
        $set: {
          waTenantId: tenant_id,
          wabaId: waba_id,
          phoneNumberId: phone_number_id,
          displayPhoneNumber: display_phone_number || null,
          waBusinessId: business_id || null,
          waLinkedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('[WA][ESU][callback][POST][ok]', { tenant_id, waba_id, phone_number_id });
    return res.json({ ok: true });
  } catch (err) { console.error('[WA][ESU][callback][POST][error]', err); next(err); }
};

/**
 * ========== WhatsApp: Unlink ==========
 * Forget stored WA identifiers for this user/tenant.
 * (Advanced: also revoke app access to WABA if you added that later.)
 */
exports.waUnlink = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({ error: 'LOGIN_REQUIRED' });

    await FacebookAuth.findOneAndUpdate(
      { userId: req.user._id },
      {
        $unset: {
          waTenantId: 1,
          wabaId: 1,
          phoneNumberId: 1,
          displayPhoneNumber: 1,
          waBusinessId: 1,
          waLinkedAt: 1,
        },
      },
      { new: true }
    );

    return res.json({ ok: true, unlinked: true });
  } catch (err) { console.error('[WA][unlink][error]', err); next(err); }
};





