-- ============================================
-- Supabase SQL Setup สำหรับ RenovateTrack
-- ============================================
-- วิธีใช้: ก๊อปทั้งหมดไปวางใน Supabase SQL Editor แล้วกด Run

-- Table: ทรัพย์สิน
CREATE TABLE IF NOT EXISTS properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: รายรับ-รายจ่าย
CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'อื่นๆ',
    description TEXT,
    date DATE DEFAULT CURRENT_DATE,
    image_url TEXT,
    recorded_by TEXT DEFAULT 'LINE',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: รูปที่รอยืนยัน
CREATE TABLE IF NOT EXISTS pending_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    image_url TEXT,
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index สำหรับ query เร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_transactions_property ON transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_pending_user ON pending_images(user_id);

-- Enable Row Level Security (optional, เปิดถ้าต้องการ)
-- ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Grant access (for anon key)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for service role" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for service role" ON pending_images FOR ALL USING (true) WITH CHECK (true);
