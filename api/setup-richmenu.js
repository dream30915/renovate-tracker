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

function createRichMenuImage() {
    // สร้างรูป Rich Menu ขนาด 2500x1686 เป็น PNG
    // ใช้ Canvas-like approach ผ่าน raw PNG creation
    // เนื่องจาก Vercel ไม่มี canvas, ใช้ SVG แปลง buffer แทน

    const width = 2500;
    const height = 1686;
    const cellW = Math.floor(width / 3);
    const cellH = Math.floor(height / 2);

    // สร้าง minimal BMP image (simple approach)
    // Rich Menu ต้องเป็น PNG/JPEG ขนาด 2500x1686
    // ใช้ approach สร้าง raw bitmap data

    const buttons = [
        { emoji: '❓', text: 'ช่วยเหลือ', color: [16, 185, 129] },     // emerald
        { emoji: '📊', text: 'สรุปยอด', color: [59, 130, 246] },       // blue
        { emoji: '🏠', text: 'ทรัพย์สิน', color: [168, 85, 247] },     // purple
        { emoji: '💸', text: 'บันทึกรายจ่าย', color: [239, 68, 68] },  // red
        { emoji: '💰', text: 'บันทึกรายรับ', color: [34, 197, 94] },   // green
        { emoji: '📋', text: 'Dashboard', color: [245, 158, 11] }      // amber
    ];

    // Since we can't use canvas in serverless, create a simple colored PNG
    // Using a minimal PNG encoder
    const png = createMinimalPNG(width, height, buttons, cellW, cellH);
    return png;
}

function createMinimalPNG(width, height, buttons, cellW, cellH) {
    // Create raw RGBA pixel data
    const pixels = Buffer.alloc(width * height * 4);
    const bgColor = [26, 26, 46, 255]; // #1a1a2e

    // Fill background
    for (let i = 0; i < width * height; i++) {
        pixels[i * 4] = bgColor[0];
        pixels[i * 4 + 1] = bgColor[1];
        pixels[i * 4 + 2] = bgColor[2];
        pixels[i * 4 + 3] = bgColor[3];
    }

    // Draw 6 colored rectangles (3x2 grid)
    for (let idx = 0; idx < 6; idx++) {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const startX = col * cellW;
        const startY = row * cellH;
        const btn = buttons[idx];
        const padding = 20;

        // Fill button area with color (slightly transparent overlay)
        for (let y = startY + padding; y < startY + cellH - padding && y < height; y++) {
            for (let x = startX + padding; x < startX + cellW - padding && x < width; x++) {
                const i = (y * width + x) * 4;
                // Dark background with colored border effect
                if (y < startY + padding + 6 || y > startY + cellH - padding - 6 ||
                    x < startX + padding + 6 || x > startX + cellW - padding - 6) {
                    pixels[i] = btn.color[0];
                    pixels[i + 1] = btn.color[1];
                    pixels[i + 2] = btn.color[2];
                    pixels[i + 3] = 255;
                } else {
                    // Inner area - slightly colored dark
                    pixels[i] = Math.floor(btn.color[0] * 0.15 + 26);
                    pixels[i + 1] = Math.floor(btn.color[1] * 0.15 + 26);
                    pixels[i + 2] = Math.floor(btn.color[2] * 0.15 + 46);
                    pixels[i + 3] = 255;
                }
            }
        }

        // Draw center dot/circle as visual indicator
        const centerX = startX + Math.floor(cellW / 2);
        const centerY = startY + Math.floor(cellH / 2);
        const radius = 60;
        for (let y = centerY - radius; y <= centerY + radius; y++) {
            for (let x = centerX - radius; x <= centerX + radius; x++) {
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
                    if (dist <= radius) {
                        const i = (y * width + x) * 4;
                        pixels[i] = btn.color[0];
                        pixels[i + 1] = btn.color[1];
                        pixels[i + 2] = btn.color[2];
                        pixels[i + 3] = 255;
                    }
                }
            }
        }
    }

    // Draw grid lines
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // Vertical lines
            if ((x >= cellW - 2 && x <= cellW + 2) || (x >= cellW * 2 - 2 && x <= cellW * 2 + 2)) {
                const i = (y * width + x) * 4;
                pixels[i] = 50; pixels[i + 1] = 50; pixels[i + 2] = 70; pixels[i + 3] = 255;
            }
            // Horizontal line
            if (y >= cellH - 2 && y <= cellH + 2) {
                const i = (y * width + x) * 4;
                pixels[i] = 50; pixels[i + 1] = 50; pixels[i + 2] = 70; pixels[i + 3] = 255;
            }
        }
    }

    // Encode as PNG
    return encodePNG(width, height, pixels);
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
