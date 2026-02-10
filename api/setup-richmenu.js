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

// Helper function to draw lines with anti-aliasing (Xiaolin Wu's algorithm simplified)
function drawLine(buf, w, x0, y0, x1, y1, col) {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy, e2;

    while (true) {
        // Draw pixel with some alpha for smoothness (simplified)
        const i = (Math.floor(y0) * w + Math.floor(x0)) * 4;
        if(i >= 0 && i < buf.length) {
             buf[i] = col[0]; buf[i+1] = col[1]; buf[i+2] = col[2];
        }
        if (Math.abs(x0 - x1) < 1 && Math.abs(y0 - y1) < 1) break;
        e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
    }
}

function drawThaiVectorText(buf, w, cx, cy, text, col) {
    // Custom Vector Font for specific Thai words
    // 'ช่วยเหลือ', 'สรุปยอด', 'ทรัพย์สิน', 'รายจ่าย', 'รายรับ', 'เว็บไซต์'
    // Scale and positioning
    const s = 4; // Scale
    
    // Hardcoded stroke paths for Thai characters (Simplified strokes)
    const getCharStrokes = (char) => {
        // Returns array of line segments [x1, y1, x2, y2] relative to 0-10 box
        switch(char) {
            case 'ช': return [[2,8,2,2], [2,2,8,2], [8,2,8,6], [8,6,4,6], [4,6,2,8], [2,8,8,8], [8,8,8,10]];
            case '่': return [[6,0,6,2]]; // Mai Ek
            case 'ว': return [[8,8,8,2], [8,2,2,2], [2,2,2,6], [2,6,6,6], [6,6,8,8]];
            case 'ย': return [[2,4,4,6], [4,6,2,8], [2,8,8,8], [8,8,8,2]];
            case 'เ': return [[4,10,4,2], [4,2,6,1], [6,1,4,0]];
            case 'ห': return [[2,10,2,4], [2,4,8,4], [8,4,8,10], [2,6,6,6], [6,6,8,2]]; // Simplified
            case 'ล': return [[2,10,2,4], [2,4,8,4], [8,4,8,8], [8,8,10,6]];
            case 'ื': return [[4,0,4,2], [6,0,6,2], [2,2,8,2]]; // Sara Uee
            case 'อ': return [[8,4,2,4], [2,4,2,10], [2,10,8,10], [8,10,8,4]]; 
            case 'ส': return [[2,10,2,4], [2,4,8,4], [8,4,8,10], [8,4,10,2], [4,4,6,6]]; 
            case 'ร': return [[2,10,2,4], [2,4,8,2], [8,2,8,4]];
            case 'ป': return [[2,4,2,10], [2,10,8,10], [8,10,8,2]];
            case 'ุ': return [[8,11,8,13]]; // Sara U
            case 'ท': return [[2,4,2,10], [2,4,8,2], [8,2,8,10]];
            case 'ั': return [[6,0,8,1], [8,1,4,0]]; // Mai Han Akat
            case 'พ': return [[2,4,2,10], [2,10,4,6], [4,6,6,10], [6,10,8,4]];
            case '์': return [[6,0,8,1], [8,1,6,2], [8,1,10,0]]; // Karan
            case 'ซ': return [[2,10,2,4], [2,4,4,5], [4,5,6,4], [6,4,8,10], [2,6,6,6]];
            case 'น': return [[2,4,2,10], [2,10,8,10], [8,10,8,4]]; 
            case 'า': return [[6,4,6,10], [6,4,8,2]];
            case 'จ': return [[4,6,2,8], [2,8,8,8], [8,8,8,4], [8,4,4,2]];
            case 'บ': return [[2,4,2,10], [2,10,8,10], [8,10,8,6]];
            case '็': return [[4,1,6,0], [6,0,8,1], [8,1,6,2]]; // Mai Tai Khu
            case 'ไ': return [[2,10,2,2], [2,2,4,4], [4,4,6,2], [6,2,2,6]]; // Simplified
            default: return []; // Unknown char
        }
    };

    const charWidth = 12 * s;
    const startX = cx - (text.length * charWidth) / 2;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const strokes = getCharStrokes(char);
        const xOffset = startX + i * charWidth;
        const yOffset = cy;

        strokes.forEach(line => {
             drawLine(buf, w, 
                 xOffset + line[0]*s, yOffset + line[1]*s, 
                 xOffset + line[2]*s, yOffset + line[3]*s, 
                 col
             );
        });
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
