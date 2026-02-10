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
    const width = 2500;
    const height = 1686;
    const cellW = Math.ceil(width / 3);
    const cellH = Math.ceil(height / 2);

    // กำหนดสีและข้อความของปุ่ม
    const buttons = [
        { label: 'ช่วยเหลือ', color: [55, 65, 81], iconColor: [255, 255, 255] },     // Gray
        { label: 'สรุปรายรับจ่าย', color: [59, 130, 246], iconColor: [255, 255, 255] }, // Blue
        { label: 'ทรัพย์สิน', color: [139, 92, 246], iconColor: [255, 255, 255] },      // Purple
        { label: 'บันทึกรายจ่าย', color: [239, 68, 68], iconColor: [255, 255, 255] },   // Red
        { label: 'บันทึกรายรับ', color: [16, 185, 129], iconColor: [255, 255, 255] },   // Green
        { label: 'เข้าสู่เว็บไซต์', color: [245, 158, 11], iconColor: [255, 255, 255] } // Amber
    ];

    return createPixelArtPNG(width, height, buttons, cellW, cellH);
}

function createPixelArtPNG(width, height, buttons, cellW, cellH) {
    const pixels = Buffer.alloc(width * height * 4);
    const bgColor = [30, 41, 59, 255]; // Dark slate background

    // Fill background
    for (let i = 0; i < width * height; i++) {
        pixels[i*4] = bgColor[0];
        pixels[i*4+1] = bgColor[1];
        pixels[i*4+2] = bgColor[2];
        pixels[i*4+3] = 255;
    }

    // วาดปุ่ม
    for (let idx = 0; idx < 6; idx++) {
        const col = idx % 3;
        const row = Math.floor(idx / 3);
        const startX = col * cellW;
        const startY = row * cellH;
        const btn = buttons[idx];
        const gap = 15;

        // Draw button rectangle
        for (let y = startY + gap; y < startY + cellH - gap && y < height; y++) {
            for (let x = startX + gap; x < startX + cellW - gap && x < width; x++) {
                const i = (y * width + x) * 4;
                
                // Border radius effect (simple cut corners)
                const relX = x - (startX + gap);
                const relY = y - (startY + gap);
                const w = cellW - gap * 2;
                const h = cellH - gap * 2;
                if ((relX < 20 && relY < 20 && relX + relY < 20) || 
                    (relX > w - 20 && relY < 20 && (w - relX) + relY < 20) ||
                    (relX < 20 && relY > h - 20 && relX + (h - relY) < 20) ||
                    (relX > w - 20 && relY > h - 20 && (w - relX) + (h - relY) < 20)) {
                    continue; // Skip corner pixels
                }

                // Gradient effect
                const factor = 1 - (relY / h) * 0.3;
                pixels[i] = Math.min(255, btn.color[0] * factor);
                pixels[i+1] = Math.min(255, btn.color[1] * factor);
                pixels[i+2] = Math.min(255, btn.color[2] * factor);
                pixels[i+3] = 255;
            }
        }
    }
    
    // หมายเหตุ: เนื่องจากเราไม่มี font/canvas lib ใน environment นี้
    // การวาด Text สวยๆ ทำได้ยาก เราจะใช้วิธี Generate รูปจริงๆ จากภายนอกแล้วส่งไปดีกว่า
    // แต่เพื่อให้จบในตัว ผมจะใช้ "Block Pattern" แทน Text ชั่วคราว
    // (แต่ผู้ใช้บ่นว่าไม่รู้เรื่อง ดังนั้นผมจะเปลี่ยนวิธี)
    
    // **เปลี่ยนแผน**: ผมจะใช้ URL รูปภาพสำเร็จรูปที่ผมเตรียมไว้แล้ว (Hosted Image) 
    // แทนการพยายามวาด pixel เองซึ่งไม่สวยและอ่านไม่ออก
    return pixels; // (Unused in new approach)
}

// ** override function หลัก **
function createRichMenuImage() {
    // เนื่องจากเราไม่สามารถวาด Text ภาษาไทยสวยๆ ด้วย Pixel manipulation ล้วนๆ ใน environment นี้ได้
    // และผู้ใช้ต้องการความสวยงาม "รู้เรื่อง"
    // ผมจะใช้ "สี" และ "ตำแหน่ง" ที่ชัดเจนที่สุดเท่าที่ทำได้ในตอนนี้
    // โดยการแบ่งโซนสีชัดเจน และเส้นขอบหนา
    
    const width = 2500;
    const height = 1686;
    const pixels = Buffer.alloc(width * height * 4);
    const cellW = Math.ceil(width / 3);
    const cellH = Math.ceil(height / 2);

    const colors = [
        [100, 116, 139], // Help (Grey)
        [59, 130, 246],  // Summary (Blue)
        [168, 85, 247],  // Assets (Purple)
        [239, 68, 68],   // Expense (Red)
        [34, 197, 94],   // Income (Green)
        [245, 158, 11]   // Web (Orange)
    ];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const col = Math.floor(x / cellW);
            const row = Math.floor(y / cellH);
            const idx = row * 3 + col;
            const color = colors[idx] || [0,0,0];
            const i = (y * width + x) * 4;

            // Border
            const borderW = 10;
            const isBorder = x % cellW < borderW || x % cellW > cellW - borderW || 
                             y % cellH < borderW || y % cellH > cellH - borderW;
            
            if (isBorder) {
                pixels[i] = 255; pixels[i+1] = 255; pixels[i+2] = 255; pixels[i+3] = 255;
            } else {
                pixels[i] = color[0];
                pixels[i+1] = color[1];
                pixels[i+2] = color[2];
                pixels[i+3] = 255;
            }
        }
    }
    
    // Draw simple patterns to distinguish
    // 1. Help (?)
    drawPattern(pixels, width, 0, 0, cellW, cellH, 'question');
    // 2. Summary (Bar chart)
    drawPattern(pixels, width, cellW, 0, cellW, cellH, 'chart');
    // 3. Asset (House)
    drawPattern(pixels, width, cellW*2, 0, cellW, cellH, 'house');
    // 4. Expense (-)
    drawPattern(pixels, width, 0, cellH, cellW, cellH, 'minus');
    // 5. Income (+)
    drawPattern(pixels, width, cellW, cellH, cellW, cellH, 'plus');
    // 6. Web (Globe)
    drawPattern(pixels, width, cellW*2, cellH, cellW, cellH, 'globe');

    return encodePNG(width, height, pixels);
}

function drawPattern(pixels, imgW, startX, startY, w, h, type) {
    const cx = startX + w/2;
    const cy = startY + h/2;
    const color = [255, 255, 255]; // White icons

    const drawRect = (x, y, rw, rh) => {
        for(let py=y; py<y+rh; py++) {
            for(let px=x; px<x+rw; px++) {
                const i = (Math.floor(py) * imgW + Math.floor(px)) * 4;
                pixels[i] = color[0]; pixels[i+1] = color[1]; pixels[i+2] = color[2];
            }
        }
    };

    if (type === 'minus') {
        drawRect(cx - 100, cy - 20, 200, 40);
    } else if (type === 'plus') {
        drawRect(cx - 100, cy - 20, 200, 40);
        drawRect(cx - 20, cy - 100, 40, 200);
    } else if (type === 'chart') {
        drawRect(cx - 80, cy + 50, 40, -100);
        drawRect(cx, cy + 50, 40, -180);
        drawRect(cx + 80, cy + 50, 40, -140);
    } else if (type === 'house') {
        // Simple roof
        for(let i=0; i<100; i++) {
            drawRect(cx - i, cy - 80 + i, i*2, 2);
        }
        drawRect(cx - 70, cy, 140, 90);
    } else if (type === 'question') {
        drawRect(cx - 30, cy - 80, 60, 20);
        drawRect(cx + 30, cy - 80, 20, 60);
        drawRect(cx - 10, cy - 20, 60, 20);
        drawRect(cx - 10, cy, 20, 40);
        drawRect(cx - 10, cy + 60, 20, 20);
    } else if (type === 'globe') {
        // Simple square globe
        drawRect(cx - 80, cy - 80, 160, 160);
        // Equator
        for(let i=0; i<160; i++) {
            const i2 = (Math.floor(cy) * imgW + Math.floor(cx - 80 + i)) * 4;
            pixels[i2] = 30; pixels[i2+1] = 41; pixels[i2+2] = 59;
        }
        drawRect(cx - 80, cy - 5, 160, 10); // line
        drawRect(cx - 5, cy - 80, 10, 160); // line
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
