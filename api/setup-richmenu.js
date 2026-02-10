/**
 * API endpoint เพื่อสร้าง Rich Menu ให้ LINE Bot
 * เรียกใช้: GET /api/setup-richmenu
 */
module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!TOKEN) {
        return res.status(500).json({ error: 'Missing LINE_CHANNEL_ACCESS_TOKEN' });
    }

    const headers = {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json'
    };

    try {
        // Step 1: สร้าง Rich Menu Object
        const richMenuObj = {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'RenovateTrack Menu',
            chatBarText: '📋 เมนู',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'ช่วยเหลือ' }
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: 'สรุป' }
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: 'ทรัพย์สิน' }
                },
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: 'จ่าย ' }
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'message', text: 'รับ ' }
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'https://renovate-tracker.vercel.app' }
                }
            ]
        };

        const createRes = await fetch('https://api.line.me/v2/bot/richmenu', {
            method: 'POST',
            headers,
            body: JSON.stringify(richMenuObj)
        });

        if (!createRes.ok) {
            const err = await createRes.text();
            return res.status(500).json({ error: 'Failed to create rich menu', details: err });
        }

        const { richMenuId } = await createRes.json();

        // Step 2: สร้างรูป Rich Menu (ใช้ SVG → PNG)
        const imageBuffer = createRichMenuImage();

        const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Type': 'image/png'
            },
            body: imageBuffer
        });

        if (!uploadRes.ok) {
            const err = await uploadRes.text();
            return res.status(500).json({ error: 'Failed to upload rich menu image', details: err, richMenuId });
        }

        // Step 3: ตั้งเป็น default rich menu
        const defaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
            method: 'POST',
            headers
        });

        if (!defaultRes.ok) {
            const err = await defaultRes.text();
            return res.status(500).json({ error: 'Failed to set default rich menu', details: err, richMenuId });
        }

        return res.status(200).json({
            success: true,
            richMenuId,
            message: 'Rich Menu สร้างสำเร็จ!'
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};

// Modern Rich Menu Generator
// Uses anti-aliased drawing and gradients for a premium look

async function createRichMenuImage() {
    return createModernDesign();
}

function createModernDesign() {
    const width = 2500;
    const height = 1686;
    const buffer = Buffer.alloc(width * height * 4);
    
    // 1. Background: Modern Dark Gradient (Top-Left Darker to Bottom-Right Lighter)
    // #1e293b (Slate 800) to #0f172a (Slate 900)
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const t = (x / width + y / height) / 2;
            const r = 30 * (1-t) + 15 * t;
            const g = 41 * (1-t) + 23 * t;
            const b = 59 * (1-t) + 42 * t;
            const i = (y * width + x) * 4;
            buffer[i] = r; buffer[i+1] = g; buffer[i+2] = b; buffer[i+3] = 255;
        }
    }

    const cellW = width / 3;
    const cellH = height / 2;
    
    // Configuration for 6 buttons (THAI ONLY)
    const buttons = [
        { label: 'ช่วยเหลือ', icon: '?', color: [96, 165, 250] },     // Blue
        { label: 'สรุปยอด', icon: 'bar', color: [248, 113, 113] },    // Red
        { label: 'ทรัพย์สิน', icon: 'home', color: [192, 132, 252] }, // Purple
        { label: 'รายจ่าย', icon: '-', color: [251, 146, 60] },       // Orange
        { label: 'รายรับ', icon: '+', color: [74, 222, 128] },        // Green
        { label: 'เว็บไซต์', icon: 'globe', color: [45, 212, 191] }   // Teal
    ];

    buttons.forEach((btn, idx) => {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const x = col * cellW;
        const y = row * cellH;
        const cx = x + cellW / 2;
        const cy = y + cellH / 2;

        // 2. Button Container (Glassmorphism Effect)
        drawRoundedRect(buffer, width, height, x + 20, y + 20, cellW - 40, cellH - 40, 40, [255, 255, 255], 0.05);

        // 3. Icon (Modern Vector-like shapes)
        drawModernIcon(buffer, width, cx, cy - 40, btn.icon, btn.color);

        // 4. Label (THAI Vector Font)
        drawThaiVectorText(buffer, width, cx, cy + 120, btn.label, [220, 220, 220]);
    });

    return encodePNG(width, height, buffer);
}

// ... (Helper functions: drawRoundedRect, drawCircle, drawRect unchanged) ...

// ... (ส่วนต้นเหมือนเดิม)

function drawThaiVectorText(buf, w, cx, cy, text, col) {
    // ใช้ Bitmap Font 8x8 (Simplified Thai) เพื่อประสิทธิภาพและความชัวร์
    // สร้าง Bitmap ของตัวอักษรที่ต้องใช้ (ช่วยเหลือ, สรุปยอด, ทรัพย์สิน, รายจ่าย, รายรับ, เว็บไซต์)
    
    const chars = {
        'ช': [
            "0011100",
            "0100010",
            "0100010",
            "0011100",
            "0010000",
            "0010010",
            "0001100"
        ],
        '่': [
            "0010000",
            "0100000",
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0000000"
        ],
        'ว': [
            "0011100",
            "0100010",
            "0000010",
            "0001100",
            "0010000",
            "0010000",
            "0001100"
        ],
        'ย': [
            "0100010",
            "0100010",
            "0010100",
            "0001000",
            "0010000",
            "0010000",
            "0011110"
        ],
        'เ': [
            "0011000",
            "0100100",
            "0100000",
            "0111100",
            "0100100",
            "0100100",
            "0001100"
        ],
        'ห': [
            "0100010",
            "0100010",
            "0110110",
            "0101010",
            "0100010",
            "0100010",
            "0100010"
        ],
        'ล': [
            "0001110",
            "0010001",
            "0010000",
            "0011100",
            "0100010",
            "0100010",
            "0100010"
        ],
        'ื': [
            "0010100",
            "0101000",
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0000000"
        ],
        'อ': [
            "0011100",
            "0100010",
            "0000110",
            "0001000",
            "0001000",
            "0010000",
            "0011110"
        ],
        'ส': [
            "0001100",
            "0010010",
            "0011100",
            "0100010",
            "0100110",
            "0100000",
            "0100000"
        ],
        'ร': [
            "0011100",
            "0100010",
            "0100000",
            "0100000",
            "0100000",
            "0100000",
            "0100000"
        ],
        'ป': [
            "0100010",
            "0100010",
            "0100010",
            "0100010",
            "0100010",
            "0100010",
            "0111110"
        ],
        'ุ': [
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0001000",
            "0010000"
        ],
        'ท': [
            "0111110",
            "0100010",
            "0000100",
            "0001000",
            "0010000",
            "0010000",
            "0010000"
        ],
        'ั': [
            "0011000",
            "0100100",
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0000000"
        ],
        'พ': [
            "0100010",
            "0100010",
            "0101010",
            "0101010",
            "0110110",
            "0100010",
            "0100010"
        ],
        '์': [
            "0000100",
            "0001000",
            "0000000",
            "0000000",
            "0000000",
            "0000000",
            "0000000"
        ],
        'ซ': [
            "0001000",
            "0010100",
            "0100010",
            "0001100",
            "0010100",
            "0100010",
            "0111110"
        ],
        'น': [
            "0011000",
            "0100100",
            "0000100",
            "0000100",
            "0000100",
            "0001000",
            "0010000"
        ],
        'า': [
            "0011100",
            "0000010",
            "0000010",
            "0000010",
            "0000010",
            "0000010",
            "0001110"
        ],
        'จ': [
            "0011100",
            "0100010",
            "0000010",
            "0001100",
            "0010000",
            "0100000",
            "0100000"
        ],
        'บ': [
            "0100000",
            "0100000",
            "0100000",
            "0100000",
            "0100000",
            "0100000",
            "0111110"
        ],
        '็': [
            "0010000",
            "0100000",
            "0100000",
            "0000000",
            "0000000",
            "0000000",
            "0000000"
        ],
        'ไ': [
            "0010000",
            "0101000",
            "0100000",
            "0100000",
            "0100000",
            "0100000",
            "0100000"
        ],
        'บ': [
             "0100010",
             "0100010",
             "0100010",
             "0100010",
             "0100010",
             "0100010",
             "0011100"
        ],
        'ต': [ // ต
             "0011110",
             "0100101",
             "0000101",
             "0000100",
             "0010000",
             "0010000",
             "0010000"
        ],
        '์': [ // การันต์
             "0000110",
             "0001001",
             "0000000",
             "0000000",
             "0000000",
             "0000000",
             "0000000"
        ],
        'ไ': [ // สระไอไม้มลาย
             "0001000",
             "0010100",
             "0010000",
             "0010000",
             "0010000",
             "0010000",
             "0010000"
        ],
        'ร': [ // ร เรือ
             "0011100",
             "0100010",
             "0000010",
             "0000100",
             "0001000",
             "0010000",
             "0010000"
        ],
        'ซ': [ // ซ โซ่
             "0001010",
             "0010101",
             "0000100",
             "0001000",
             "0010000",
             "0010000",
             "0111110"
        ],
        'ท': [ // ท ทหาร
             "0011100",
             "0100010",
             "0000100",
             "0000100",
             "0000100",
             "0000100",
             "0000100"
        ],
        'น': [ // น หนู
             "0010010",
             "0010010",
             "0010010",
             "0010010",
             "0010010",
             "0010010",
             "0001100"
        ],
        '?': [ // Fallback Block
             "1111111",
             "1000001",
             "1000001",
             "1000001",
             "1000001",
             "1000001",
             "1111111"
        ]
    };

    const scale = 5; // Upscale factor
    const charW = 7 * scale;
    const spacing = 2 * scale;
    const startX = cx - (text.length * (charW + spacing)) / 2;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const bitmap = chars[char] || chars['?']; // Fallback
        
        if (bitmap) {
            for (let r = 0; r < 7; r++) {
                const rowStr = bitmap[r] || "0000000";
                for (let c = 0; c < 7; c++) {
                    if (rowStr[c] === '1') {
                         drawRect(buf, w, 
                            startX + i * (charW + spacing) + c * scale + scale/2, 
                            cy + r * scale - 20, 
                            scale, scale, 
                            col
                         );
                    }
                }
            }
        }
    }
}

function encodePNG(width, height, pixels) {
    const zlib = require('zlib');

    // PNG signature
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    // IHDR chunk
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type (RGBA)
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    const ihdr = createPNGChunk('IHDR', ihdrData);

    // IDAT chunk - create filtered scanlines
    const rawData = Buffer.alloc(height * (1 + width * 4));
    for (let y = 0; y < height; y++) {
        rawData[y * (1 + width * 4)] = 0; // no filter
        pixels.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
    }
    const compressed = zlib.deflateSync(rawData, { level: 1 });
    const idat = createPNGChunk('IDAT', compressed);

    // IEND chunk
    const iend = createPNGChunk('IEND', Buffer.alloc(0));

    return Buffer.concat([signature, ihdr, idat, iend]);
}

function createPNGChunk(type, data) {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuffer, data]));
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);
    return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            if (c & 1) c = 0xEDB88320 ^ (c >>> 1);
            else c = c >>> 1;
        }
        table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) {
        crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}
