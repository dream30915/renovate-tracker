const db = require('./lib/db');

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // Simple password check
    const password = req.headers.authorization?.replace('Bearer ', '');
    if (password !== process.env.DASHBOARD_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const data = await db.getDashboardData();
        return res.status(200).json(data);
    } catch (err) {
        console.error('Dashboard API error:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
