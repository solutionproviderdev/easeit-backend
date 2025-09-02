function parseMessage(msg) {
    if (!msg.message) return { type: 'unknown', content: null };

    // Extract possible keys from message
    const keys = Object.keys(msg.message);

    if (keys.includes('conversation') || keys.includes('extendedTextMessage')) {
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
        return { type: 'text', content: text };
    }

    if (keys.includes('imageMessage')) {
        const img = msg.message.imageMessage;
        return { type: 'image', content: img.caption || '', url: img.url };
    }

    if (keys.includes('videoMessage')) {
        const vid = msg.message.videoMessage;
        if (vid.gifPlayback) {
            return { type: 'gif', content: vid.caption || '', url: vid.url };
        }
        return { type: 'video', content: vid.caption || '', url: vid.url };
    }

    if (keys.includes('audioMessage')) {
        const aud = msg.message.audioMessage;
        return { type: 'audio', content: `${aud.seconds || 0}s`, url: aud.url };
    }

    if (keys.includes('stickerMessage')) {
        const st = msg.message.stickerMessage;
        return { type: 'sticker', content: 'sticker', url: st.url };
    }

    if (keys.includes('ptvMessage')) {
        const ptv = msg.message.ptvMessage;
        return {
            type: 'circle_video',
            content: `${ptv.seconds || 0}s`,
            url: ptv.url,
        };
    }

    if (keys.includes('reactionMessage')) {
        const react = msg.message.reactionMessage;
        return { type: 'reaction', content: react.text, key: react.key };
    }

    // fallback: unknown message type
    return { type: keys[0], content: null };
}

function logMessageType(msg) {
    const { type, content, url } = parseMessage(msg);
    console.log(`📌 Message type: ${type}`);
    if (content) console.log(`   ➡️ Content: ${content}`);
    if (url) console.log(`   🔗 Media URL: ${url}`);
}

const handleNewMessage = (m) => {
    // console.log('📩 New message event:', JSON.stringify(m, null, 2));

    const msg = m.messages[0];
    if (!msg.message) return; // skip empty updates

    logMessageType(msg);
};

module.exports = {
    handleNewMessage,
};
