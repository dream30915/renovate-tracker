const line = require('./lib/line');
const db = require('./lib/db');
const { parseMessage } = require('./lib/parser');

module.exports = async function handler(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(200).json({ status: 'ok' });
    }

    // Verify LINE signature
    const signature = req.headers['x-line-signature'];
    const body = JSON.stringify(req.body);

    if (!line.verifySignature(body, signature)) {
        console.error('Invalid signature');
        return res.status(403).json({ error: 'Invalid signature' });
    }

    const events = req.body.events || [];

    for (const event of events) {
        try {
            await handleEvent(event);
        } catch (err) {
            console.error('Error handling event:', err);
        }
    }

    return res.status(200).json({ status: 'ok' });
};

async function handleEvent(event) {
    if (event.type !== 'message') return;

    const userId = event.source.userId;
    const replyToken = event.replyToken;

    // ========== Handle Image Messages ==========
    if (event.message.type === 'image') {
        await handleImage(event, userId, replyToken);
        return;
    }

    // ========== Handle Text Messages ==========
    if (event.message.type !== 'text') return;

    const text = event.message.text.trim();

    // เช็ค pending image ก่อน (ผู้ใช้ส่งรูปแล้วรอพิมพ์ยอด)
    const pending = await db.getPendingImage(userId);
    if (pending) {
        await handlePendingImageResponse(text, pending, userId, replyToken);
        return;
    }

    // Parse ข้อความ
    const parsed = parseMessage(text);

    switch (parsed.type) {
        case 'command':
            await handleCommand(parsed, replyToken);
            break;
        case 'transaction':
            await handleTransaction(parsed, userId, replyToken);
            break;
        default:
            // ไม่เข้าใจ → ส่งวิธีใช้
            await line.reply(replyToken, getHelpMessage());
            break;
    }
}

// ========== Handle Image ==========
async function handleImage(event, userId, replyToken) {
    // บันทึกว่ามีรูปรอ → ถามผู้ใช้
    const imageUrl = `https://api-data.line.me/v2/bot/message/${event.message.id}/content`;
    await db.savePendingImage(userId, imageUrl);

    await line.reply(replyToken, [
        '📸 ได้รับรูปบิลแล้ว!',
        'กรุณาพิมพ์ข้อมูลตามรูปแบบนี้:\n\nจ่าย [จำนวนเงิน] [รายละเอียด] [ชื่อทรัพย์]\n\nตัวอย่าง:\nจ่าย 3500 ค่าปูน บ้านรามคำแหง\n\nหรือพิมพ์ "ยกเลิก" เพื่อยกเลิก'
    ]);
}

// ========== Handle Pending Image Response ==========
async function handlePendingImageResponse(text, pending, userId, replyToken) {
    if (text === 'ยกเลิก' || text === 'cancel') {
        await db.clearPendingImage(userId);
        await line.reply(replyToken, '❌ ยกเลิกการบันทึกรูปบิลแล้ว');
        return;
    }

    const parsed = parseMessage(text);
    if (parsed.type !== 'transaction') {
        await line.reply(replyToken, '❌ ไม่เข้าใจ กรุณาพิมพ์ใหม่ เช่น:\nจ่าย 3500 ค่าปูน บ้านรามคำแหง\n\nหรือพิมพ์ "ยกเลิก"');
        return;
    }

    // บันทึกพร้อม image
    await handleTransaction(parsed, userId, replyToken, pending.image_url);
    await db.clearPendingImage(userId);
}

// ========== Handle Transaction ==========
async function handleTransaction(parsed, userId, replyToken, imageUrl) {
    let property = null;

    // หา property
    if (parsed.propertyName) {
        property = await db.getPropertyByName(parsed.propertyName);
        if (!property) {
            // Auto-สร้าง property ใหม่
            property = await db.addProperty(parsed.propertyName);
        }
    } else {
        // ถ้าไม่ระบุ property → ใช้ property ล่าสุด หรือถามผู้ใช้
        const properties = await db.getProperties();
        if (properties.length === 1) {
            property = properties[0];
        } else if (properties.length === 0) {
            property = await db.addProperty('ทรัพย์สินทั่วไป');
        } else {
            // สร้าง quick reply ให้เลือก
            await line.reply(replyToken, {
                type: 'text',
                text: '🏠 กรุณาระบุชื่อทรัพย์สิน\nพิมพ์ข้อความใหม่พร้อมชื่อทรัพย์ เช่น:\n\n' +
                    `${parsed.txType === 'income' ? 'รับ' : 'จ่าย'} ${parsed.amount} ${parsed.description} บ้านXXX\n\n` +
                    '📋 ทรัพย์ที่มี:\n' + properties.map(p => `• ${p.name}`).join('\n')
            });
            return;
        }
    }

    // Get profile
    const profile = await line.getProfile(userId);

    // บันทึก transaction
    const tx = await db.addTransaction({
        property_id: property.id,
        type: parsed.txType,
        amount: parsed.amount,
        category: parsed.category || 'อื่นๆ',
        description: parsed.description,
        image_url: imageUrl || null,
        recorded_by: profile.displayName || userId
    });

    // ตอบกลับด้วย Flex Message สวยๆ
    await line.reply(replyToken, line.flexTransaction(
        parsed.txType,
        parsed.amount,
        parsed.description,
        property.name
    ));
}

// ========== Handle Commands ==========
async function handleCommand(parsed, replyToken) {
    switch (parsed.command) {
        case 'help':
            await line.reply(replyToken, getHelpMessage());
            break;

        case 'summary':
            let summary, propertyName;
            if (parsed.propertyName) {
                const property = await db.getPropertyByName(parsed.propertyName);
                if (property) {
                    summary = await db.getSummary(property.id);
                    propertyName = property.name;
                } else {
                    await line.reply(replyToken, `❌ ไม่พบทรัพย์สิน "${parsed.propertyName}"`);
                    return;
                }
            } else {
                summary = await db.getSummary();
            }
            await line.reply(replyToken, line.flexSummary(summary, propertyName));
            break;

        case 'properties':
            const properties = await db.getProperties();
            if (properties.length === 0) {
                await line.reply(replyToken, '📋 ยังไม่มีทรัพย์สิน\n\nเพิ่มทรัพย์ได้โดยพิมพ์:\nเพิ่มบ้าน [ชื่อ]\n\nหรือบันทึกรายจ่ายพร้อมชื่อทรัพย์:\nจ่าย 3500 ค่าปูน บ้านXXX');
            } else {
                let msg = '🏠 ทรัพย์สินทั้งหมด:\n\n';
                for (const p of properties) {
                    const s = await db.getSummary(p.id);
                    msg += `• ${p.name}\n`;
                    msg += `  รับ: ฿${Number(s.totalIncome).toLocaleString()} | จ่าย: ฿${Number(s.totalExpense).toLocaleString()}\n`;
                    msg += `  ${s.profit >= 0 ? '✅ กำไร' : '⚠️ ขาดทุน'}: ฿${Number(Math.abs(s.profit)).toLocaleString()}\n\n`;
                }
                await line.reply(replyToken, msg.trim());
            }
            break;

        case 'addProperty':
            const existing = await db.getPropertyByName(parsed.propertyName);
            if (existing) {
                await line.reply(replyToken, `⚠️ มีทรัพย์สิน "${existing.name}" อยู่แล้ว`);
            } else {
                const newProp = await db.addProperty(parsed.propertyName);
                await line.reply(replyToken, `✅ เพิ่มทรัพย์สิน "${newProp.name}" สำเร็จ!\n\nตอนนี้สามารถบันทึกรายจ่ายได้:\nจ่าย 3500 ค่าปูน ${newProp.name}`);
            }
            break;
    }
}

function getHelpMessage() {
    return {
        type: 'flex',
        altText: '📖 วิธีใช้งาน RenovateTrack Bot',
        contents: {
            type: 'bubble',
            size: 'mega',
            body: {
                type: 'box',
                layout: 'vertical',
                contents: [
                    { type: 'text', text: '📖 วิธีใช้งาน', weight: 'bold', size: 'lg', color: '#10b981' },
                    { type: 'separator', margin: 'md' },
                    { type: 'text', text: '💰 บันทึกรายจ่าย', weight: 'bold', size: 'sm', margin: 'lg', color: '#ef4444' },
                    { type: 'text', text: 'จ่าย 3500 ค่าปูน บ้านรามคำแหง', size: 'xs', color: '#aaaaaa', margin: 'sm', wrap: true },
                    { type: 'text', text: '💵 บันทึกรายรับ', weight: 'bold', size: 'sm', margin: 'lg', color: '#10b981' },
                    { type: 'text', text: 'รับ 50000 ค่ามัดจำ บ้านลาดพร้าว', size: 'xs', color: '#aaaaaa', margin: 'sm', wrap: true },
                    { type: 'text', text: '📸 ส่งรูปบิล', weight: 'bold', size: 'sm', margin: 'lg', color: '#3b82f6' },
                    { type: 'text', text: 'ส่งรูป → Bot จะถามยอดเงิน', size: 'xs', color: '#aaaaaa', margin: 'sm', wrap: true },
                    { type: 'separator', margin: 'lg' },
                    { type: 'text', text: '📋 คำสั่งอื่นๆ', weight: 'bold', size: 'sm', margin: 'lg', color: '#f59e0b' },
                    { type: 'text', text: '• "สรุป" → สรุปทั้งหมด\n• "สรุป บ้านXX" → สรุปเฉพาะบ้าน\n• "ทรัพย์สิน" → ดูทรัพย์ทั้งหมด\n• "เพิ่มบ้าน ชื่อ" → เพิ่มทรัพย์ใหม่', size: 'xs', color: '#aaaaaa', margin: 'sm', wrap: true }
                ]
            },
            styles: {
                body: { backgroundColor: '#1a1a2e' }
            }
        }
    };
}
