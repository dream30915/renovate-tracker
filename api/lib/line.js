const crypto = require('crypto');

const LINE_API = 'https://api.line.me/v2/bot';

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
    };
}

const line = {
    // ตอบกลับข้อความ
    async reply(replyToken, messages) {
        if (!Array.isArray(messages)) messages = [messages];

        const body = {
            replyToken,
            messages: messages.map(m =>
                typeof m === 'string' ? { type: 'text', text: m } : m
            )
        };

        const res = await fetch(`${LINE_API}/message/reply`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const err = await res.text();
            console.error('LINE reply error:', err);
        }
    },

    // ส่ง push message
    async push(userId, messages) {
        if (!Array.isArray(messages)) messages = [messages];

        const body = {
            to: userId,
            messages: messages.map(m =>
                typeof m === 'string' ? { type: 'text', text: m } : m
            )
        };

        await fetch(`${LINE_API}/message/push`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });
    },

    // ดึงรูปจาก LINE
    async getImageBuffer(messageId) {
        const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
            headers: { 'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}` }
        });
        if (!res.ok) return null;
        return await res.arrayBuffer();
    },

    // ดึง profile ผู้ส่ง
    async getProfile(userId) {
        const res = await fetch(`${LINE_API}/profile/${userId}`, {
            headers: getHeaders()
        });
        if (!res.ok) return { displayName: 'ไม่ทราบ' };
        return await res.json();
    },

    // Verify webhook signature
    verifySignature(body, signature) {
        const hash = crypto
            .createHmac('SHA256', process.env.LINE_CHANNEL_SECRET)
            .update(body)
            .digest('base64');
        return hash === signature;
    },

    // สร้าง Flex Message สวยๆ
    flexTransaction(type, amount, description, propertyName) {
        const isIncome = type === 'income';
        const color = isIncome ? '#10b981' : '#ef4444';
        const icon = isIncome ? '💰' : '📝';
        const label = isIncome ? 'รายรับ' : 'รายจ่าย';

        return {
            type: 'flex',
            altText: `${isIncome ? '✅' : '📝'} บันทึก${label} ฿${Number(amount).toLocaleString()}`,
            contents: {
                type: 'bubble',
                size: 'kilo',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${isIncome ? '✅' : '📝'} บันทึก${label}สำเร็จ`,
                            weight: 'bold',
                            size: 'md',
                            color: color
                        },
                        { type: 'separator', margin: 'md' },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'md',
                            spacing: 'sm',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'จำนวน', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: `฿${Number(amount).toLocaleString()}`, size: 'sm', weight: 'bold', color: color, flex: 3, align: 'end' }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'รายการ', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: description || '-', size: 'sm', flex: 3, align: 'end' }
                                    ]
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: 'ทรัพย์สิน', size: 'sm', color: '#888888', flex: 2 },
                                        { type: 'text', text: `🏠 ${propertyName}`, size: 'sm', flex: 3, align: 'end' }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                styles: {
                    body: { backgroundColor: '#1a1a2e' }
                }
            }
        };
    },

    flexSummary(summary, propertyName) {
        const contents = [
            {
                type: 'text',
                text: propertyName ? `📊 สรุป: ${propertyName}` : '📊 สรุปรายรับรายจ่ายทั้งหมด',
                weight: 'bold',
                size: 'md',
                color: '#10b981'
            },
            { type: 'separator', margin: 'md' },
            {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: [
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '💰 รายรับ', size: 'sm', color: '#888888', flex: 2 },
                            { type: 'text', text: `฿${Number(summary.totalIncome).toLocaleString()}`, size: 'sm', weight: 'bold', color: '#10b981', flex: 3, align: 'end' }
                        ]
                    },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: '📝 รายจ่าย', size: 'sm', color: '#888888', flex: 2 },
                            { type: 'text', text: `฿${Number(summary.totalExpense).toLocaleString()}`, size: 'sm', weight: 'bold', color: '#ef4444', flex: 3, align: 'end' }
                        ]
                    },
                    { type: 'separator', margin: 'sm' },
                    {
                        type: 'box',
                        layout: 'horizontal',
                        contents: [
                            { type: 'text', text: summary.profit >= 0 ? '✅ กำไร' : '⚠️ ขาดทุน', size: 'sm', color: '#888888', flex: 2 },
                            { type: 'text', text: `฿${Number(Math.abs(summary.profit)).toLocaleString()}`, size: 'md', weight: 'bold', color: summary.profit >= 0 ? '#10b981' : '#ef4444', flex: 3, align: 'end' }
                        ]
                    }
                ]
            },
            {
                type: 'text',
                text: `📋 ทั้งหมด ${summary.count} รายการ`,
                size: 'xs',
                color: '#888888',
                margin: 'md'
            }
        ];

        return {
            type: 'flex',
            altText: `📊 สรุป: รับ ฿${Number(summary.totalIncome).toLocaleString()} | จ่าย ฿${Number(summary.totalExpense).toLocaleString()}`,
            contents: {
                type: 'bubble',
                size: 'kilo',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents
                },
                styles: {
                    body: { backgroundColor: '#1a1a2e' }
                }
            }
        };
    }
};

module.exports = line;
