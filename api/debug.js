module.exports = async function handler(req, res) {
    const envCheck = {
        LINE_CHANNEL_ACCESS_TOKEN: process.env.LINE_CHANNEL_ACCESS_TOKEN ? 'SET (' + process.env.LINE_CHANNEL_ACCESS_TOKEN.substring(0, 10) + '...)' : 'NOT SET',
        LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET ? 'SET (' + process.env.LINE_CHANNEL_SECRET.substring(0, 10) + '...)' : 'NOT SET',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET (' + process.env.SUPABASE_URL + ')' : 'NOT SET',
        SUPABASE_KEY: process.env.SUPABASE_KEY ? 'SET (' + process.env.SUPABASE_KEY.substring(0, 15) + '...)' : 'NOT SET',
        DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD ? 'SET' : 'NOT SET'
    };

    return res.status(200).json({
        method: req.method,
        envCheck,
        bodyType: typeof req.body,
        bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 100) : 'null',
        headers: {
            'content-type': req.headers['content-type'],
            'x-line-signature': req.headers['x-line-signature'] ? 'present' : 'missing'
        }
    });
};
