-- ============================================
-- FIX BOOKS TABLE - ADD MISSING COLUMNS
-- ============================================
-- Adds columns needed for physical book inventory and bulk upload
-- ============================================

-- Add publisher column (separate from author_publisher)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publisher TEXT;

-- Add publication_year column
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publication_year INTEGER;

-- Add pages column (different from page_number for ebooks)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS pages INTEGER;

-- Add quantity column (total copies in library)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add available_quantity column (copies currently available to borrow)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1;

-- Add location column (shelf location for physical books)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add description column (book summary/description)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update available_quantity for existing books (set to quantity, or 1 if quantity not set)
UPDATE books 
SET available_quantity = COALESCE(quantity, 1)
WHERE available_quantity IS NULL;

-- Update quantity for existing books where it's null
UPDATE books 
SET quantity = 1
WHERE quantity IS NULL;

-- Add constraint to ensure available_quantity never exceeds quantity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_available_quantity'
  ) THEN
    ALTER TABLE books 
    ADD CONSTRAINT check_available_quantity 
    CHECK (available_quantity >= 0 AND available_quantity <= quantity);
  END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_books_quantity ON books(quantity);
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_material_type ON books(material_type);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'books'
ORDER BY ordinal_position;

-- Show sample data
SELECT 
  title,
  material_type,
  quantity,
  available_quantity,
  status
FROM books
LIMIT 5;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ BOOKS TABLE UPDATED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Columns Added:';
  RAISE NOTICE '   ✓ publisher - Book publisher';
  RAISE NOTICE '   ✓ publication_year - Year of publication';
  RAISE NOTICE '   ✓ pages - Number of pages (for physical books)';
  RAISE NOTICE '   ✓ quantity - Total copies in library';
  RAISE NOTICE '   ✓ available_quantity - Copies currently available';
  RAISE NOTICE '   ✓ location - Shelf location (e.g., "Shelf A1")';
  RAISE NOTICE '   ✓ description - Book summary/description';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Constraint Added:';
  RAISE NOTICE '   ✓ check_available_quantity - Ensures 0 <= available_quantity <= quantity';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Indexes Added:';
  RAISE NOTICE '   ✓ idx_books_quantity - For quantity queries';
  RAISE NOTICE '   ✓ idx_books_available_quantity - For availability queries';
  RAISE NOTICE '   ✓ idx_books_status - For status filtering';
  RAISE NOTICE '   ✓ idx_books_material_type - For filtering by type (book/ebook)';
  RAISE NOTICE '   ✓ idx_books_category - For category filtering';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Data Migration:';
  RAISE NOTICE '   ✓ Existing books: quantity = 1, available_quantity = 1';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚀 Bulk book upload is now ready to use!';
  RAISE NOTICE '====================================================================';
END $$;
