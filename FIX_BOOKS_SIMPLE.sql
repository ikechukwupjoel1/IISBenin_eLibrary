-- ============================================
-- FIX BOOKS TABLE - SIMPLE VERSION (NO VERIFICATION)
-- ============================================
-- Single file - copy and paste entire content
-- ============================================

-- Add all columns
ALTER TABLE books ADD COLUMN IF NOT EXISTS publisher TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS publication_year INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS pages INTEGER;
ALTER TABLE books ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE books ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1;
ALTER TABLE books ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE books ADD COLUMN IF NOT EXISTS description TEXT;

-- Update data
UPDATE books SET quantity = 1 WHERE quantity IS NULL;
UPDATE books SET available_quantity = COALESCE(quantity, 1) WHERE available_quantity IS NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_books_quantity ON books(quantity);
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_material_type ON books(material_type);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

-- Add constraint
ALTER TABLE books ADD CONSTRAINT check_available_quantity 
CHECK (available_quantity >= 0 AND available_quantity <= quantity);
