#!/usr/bin/env node
/* eslint-disable prettier/prettier */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */
const { execFileSync } = require('child_process');
const fs = require('fs');

function curlJson(url, method = 'GET', headers = {}, body = null) {
    const args = ['-s', '-X', method];
    Object.entries(headers).forEach(([k, v]) => {
        args.push('-H');
        args.push(`${k}: ${v}`);
    });
    if (body) {
        args.push('-d');
        args.push(typeof body === 'string' ? body : JSON.stringify(body));
    }
    args.push(url);
    const output = execFileSync('curl', args, { encoding: 'utf8' });
    try {
        return JSON.parse(output);
    } catch (e) {
        throw new Error(`Failed to parse JSON from ${url}: ${output}`);
    }
}

async function main() {
    const baseUrl = process.env.API_BASE_URL || 'http://192.168.68.130/api';
    const email = process.env.LOGIN_EMAIL;
    const password = process.env.LOGIN_PASSWORD;
    const outPath = process.env.OUTPUT_MD || 'products.md';

    if (!email || !password) {
        console.error('Missing LOGIN_EMAIL or LOGIN_PASSWORD environment variables.');
        process.exit(1);
    }

    // Login
    const loginUrl = `${baseUrl}/users/login`;
    const loginResp = curlJson(
        loginUrl,
        'POST',
        { 'Content-Type': 'application/json' },
        {
            email,
            password,
        }
    );
    const token = loginResp && loginResp.token;
    if (!token) {
        console.error('Login failed: token not found in response');
        console.error(JSON.stringify(loginResp, null, 2));
        process.exit(1);
    }

    const authHeader = { Authorization: `Bearer ${token}` };

    // Fetch series (optional, for mapping/display)
    const seriesUrl = `${baseUrl}/products/series?limit=1000`;
    let seriesList = [];
    try {
        seriesList = curlJson(seriesUrl, 'GET', authHeader);
    } catch (e) {
        console.warn(
            'Warning: Failed to fetch series list, proceeding with product-populated series only.'
        );
    }
    const seriesNameById = new Map(
        Array.isArray(seriesList)
            ? seriesList.map((s) => [
                  String(s._id || s.id || s.seriesId),
                  s.name || s.title || s.seriesName || '',
              ])
            : []
    );

    // Fetch products
    const productsUrl = `${baseUrl}/products?limit=10000&status=active`;
    const products = curlJson(productsUrl, 'GET', authHeader);

    // Build Markdown table
    const lines = [];
    lines.push('# Products Pricing by Series');
    lines.push('');
    lines.push('| Product | Series | Price per Sq Ft |');
    lines.push('|---|---|---|');

    if (Array.isArray(products)) {
        for (const p of products) {
            const productName = p.name || p.title || String(p._id || p.id);
            const specs = Array.isArray(p.specifications) ? p.specifications : [];
            if (specs.length === 0) {
                lines.push(`| ${escapePipe(productName)} |  |  |`);
            } else {
                for (const spec of specs) {
                    const seriesObj = spec.series || {};
                    const price = spec.pricePerSqFt != null ? Number(spec.pricePerSqFt) : '';
                    let seriesName = '';
                    if (seriesObj && typeof seriesObj === 'object') {
                        seriesName = seriesObj.name || seriesObj.title || seriesObj.seriesName || '';
                        if (!seriesName && seriesObj._id) {
                            const fromMap = seriesNameById.get(String(seriesObj._id));
                            if (fromMap) seriesName = fromMap;
                        }
                    } else if (seriesObj) {
                        const fromMap = seriesNameById.get(String(seriesObj));
                        seriesName = fromMap || String(seriesObj);
                    }
                    lines.push(
                        `| ${escapePipe(productName)} | ${escapePipe(seriesName)} | ${price} |`
                    );
                }
            }
        }
    }

    fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`Markdown exported to ${outPath}`);
}

function escapePipe(text) {
    if (text == null) return '';
    return String(text).replace(/\|/g, '\\|');
}

main().catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
});
