/**
 * Message Parser
 * แปลงข้อความจาก LINE เป็น transaction data
 * 
 * รูปแบบที่รองรับ:
 *   จ่าย 3500 ค่าปูน บ้านรามคำแหง
 *   รับ 50000 ค่ามัดจำ บ้านลาดพร้าว
 *   จ่าย3500ค่าปูน บ้านรามคำแหง   (ติดกันก็ได้)
 *   จ่าย 3,500 ค่าปูน              (มี comma ก็ได้)
 *   -3500 ค่าปูน บ้านรามคำแหง      (ใช้ - หน้าตัวเลข = รายจ่าย)
 *   +50000 ค่ามัดจำ บ้านลาดพร้าว   (ใช้ + หน้าตัวเลข = รายรับ)
 */

const EXPENSE_KEYWORDS = ['จ่าย', 'จ่า', 'ซื้อ', 'ค่า', 'หัก', 'out', 'pay', 'expense'];
const INCOME_KEYWORDS = ['รับ', 'ได้', 'เข้า', 'ขาย', 'in', 'income', 'receive'];
const COMMAND_KEYWORDS = ['สรุป', 'ทรัพย์สิน', 'ทรัพย์', 'บ้าน', 'ช่วยเหลือ', 'help', 'วิธีใช้', 'คำสั่ง'];

function parseMessage(text) {
    text = text.trim();

    // ตรวจจับคำสั่งพิเศษ
    const lowerText = text.toLowerCase();

    // คำสั่ง: ช่วยเหลือ
    if (['ช่วยเหลือ', 'help', 'วิธีใช้', 'คำสั่ง', '?', 'เมนู', 'menu'].some(k => lowerText === k)) {
        return { type: 'command', command: 'help' };
    }

    // คำสั่ง: สรุป
    if (lowerText.startsWith('สรุป')) {
        const propertyName = text.replace(/^สรุป\s*/, '').trim();
        return { type: 'command', command: 'summary', propertyName: propertyName || null };
    }

    // คำสั่ง: ทรัพย์สิน
    if (['ทรัพย์สิน', 'ทรัพย์', 'property', 'ดูบ้าน', 'บ้านทั้งหมด'].some(k => lowerText === k)) {
        return { type: 'command', command: 'properties' };
    }

    // คำสั่ง: เพิ่มทรัพย์สิน
    const addPropertyMatch = text.match(/^(?:เพิ่มทรัพย์|เพิ่มบ้าน|สร้างทรัพย์|สร้างบ้าน)\s+(.+)/);
    if (addPropertyMatch) {
        return { type: 'command', command: 'addProperty', propertyName: addPropertyMatch[1].trim() };
    }

    // Parse transaction
    return parseTransaction(text);
}

function parseTransaction(text) {
    let type = null;
    let amount = null;
    let description = '';
    let propertyName = '';

    // ลบ comma จากตัวเลข
    text = text.replace(/(\d),(\d)/g, '$1$2');

    // Pattern 1: +/- นำหน้าตัวเลข: "+3500 ค่ามัดจำ บ้านXX" หรือ "-3500 ค่าปูน บ้านXX"
    const signMatch = text.match(/^([+-])\s*(\d+(?:\.\d+)?)\s*(.*)/);
    if (signMatch) {
        type = signMatch[1] === '+' ? 'income' : 'expense';
        amount = parseFloat(signMatch[2]);
        const rest = signMatch[3].trim();
        return { type: 'transaction', txType: type, amount, ...parseDescAndProperty(rest) };
    }

    // Pattern 2: "จ่าย 3500 ค่าปูน บ้านXX" หรือ "รับ 50000 ค่ามัดจำ บ้านXX"
    const expenseMatch = text.match(new RegExp(`^(${EXPENSE_KEYWORDS.join('|')})\\s*(\\d+(?:\\.\\d+)?)\\s*(.*)`, 'i'));
    if (expenseMatch) {
        type = 'expense';
        amount = parseFloat(expenseMatch[2]);
        const rest = expenseMatch[3].trim();
        return { type: 'transaction', txType: type, amount, ...parseDescAndProperty(rest) };
    }

    const incomeMatch = text.match(new RegExp(`^(${INCOME_KEYWORDS.join('|')})\\s*(\\d+(?:\\.\\d+)?)\\s*(.*)`, 'i'));
    if (incomeMatch) {
        type = 'income';
        amount = parseFloat(incomeMatch[2]);
        const rest = incomeMatch[3].trim();
        return { type: 'transaction', txType: type, amount, ...parseDescAndProperty(rest) };
    }

    // Pattern 3: ตัวเลขนำหน้า "3500 ค่าปูน บ้านXX" (default = expense)
    const numFirst = text.match(/^(\d+(?:\.\d+)?)\s+(.+)/);
    if (numFirst) {
        amount = parseFloat(numFirst[1]);
        const rest = numFirst[2].trim();
        // Check if rest starts with income/expense keywords
        const restLower = rest.toLowerCase();
        if (INCOME_KEYWORDS.some(k => restLower.startsWith(k))) {
            type = 'income';
        } else {
            type = 'expense';
        }
        return { type: 'transaction', txType: type, amount, ...parseDescAndProperty(rest) };
    }

    // ไม่สามารถ parse ได้
    return { type: 'unknown' };
}

function parseDescAndProperty(text) {
    if (!text) return { description: '', propertyName: '' };

    // แยก property name: มักมีคำว่า "บ้าน" นำหน้า
    const propertyPatterns = [
        /\s+(บ้าน\S+)/,
        /\s+(ที่ดิน\S+)/,
        /\s+(คอนโด\S+)/,
        /\s+(ตึก\S+)/,
        /\s+(ห้อง\S+)/,
        /\s+(โครงการ\S+)/,
    ];

    let propertyName = '';
    let description = text;

    for (const pattern of propertyPatterns) {
        const match = text.match(pattern);
        if (match) {
            propertyName = match[1].trim();
            description = text.replace(match[0], '').trim();
            break;
        }
    }

    // ถ้ายังไม่เจอ property ลองเช็คคำสุดท้าย
    if (!propertyName) {
        const words = text.split(/\s+/);
        if (words.length >= 2) {
            // ถ้ามี 2 คำขึ้นไป คำสุดท้ายอาจเป็นชื่อทรัพย์
            // แต่ต้องระวังไม่เอาคำทั่วไป
            const lastWord = words[words.length - 1];
            if (lastWord.length > 2 && !['บาท', 'เงิน', 'หมด', 'แล้ว'].includes(lastWord)) {
                // เก็บไว้แต่ไม่ตัดออกจาก description ยกเว้นมีมากกว่า 1 คำ
            }
        }
    }

    // Auto-detect category from description
    const category = detectCategory(description);

    return { description, propertyName, category };
}

function detectCategory(desc) {
    const lower = desc.toLowerCase();
    const categoryMap = [
        { keywords: ['ปูน', 'อิฐ', 'ทราย', 'เหล็ก', 'ไม้', 'สี', 'กระเบื้อง', 'วัสดุ', 'อุปกรณ์', 'ท่อ', 'สาย'], category: 'วัสดุ' },
        { keywords: ['แรง', 'ช่าง', 'คนงาน', 'ผู้รับเหมา', 'ค่าจ้าง', 'เงินเดือน'], category: 'ค่าแรง' },
        { keywords: ['โอน', 'ธรรมเนียม', 'จดทะเบียน', 'นิติกรรม'], category: 'ค่าโอน' },
        { keywords: ['น้ำ', 'ไฟ', 'ประปา', 'ไฟฟ้า'], category: 'ค่าน้ำ/ไฟ' },
        { keywords: ['นายหน้า', 'คอมมิชชั่น', 'commission'], category: 'ค่านายหน้า' },
        { keywords: ['ภาษี', 'tax', 'สรรพากร'], category: 'ภาษี' },
        { keywords: ['ซื้อบ้าน', 'ซื้อที่ดิน', 'ค่าบ้าน', 'ค่าที่ดิน', 'มัดจำ'], category: 'ค่าซื้อทรัพย์' },
        { keywords: ['ขาย', 'ขายบ้าน', 'ขายที่ดิน'], category: 'ขายทรัพย์' },
        { keywords: ['เช่า', 'ค่าเช่า', 'rental'], category: 'ค่าเช่า' },
    ];

    for (const { keywords, category } of categoryMap) {
        if (keywords.some(k => lower.includes(k))) {
            return category;
        }
    }

    return 'อื่นๆ';
}

module.exports = { parseMessage };
