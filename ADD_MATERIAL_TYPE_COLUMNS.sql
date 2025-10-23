-- ============================================
-- Add material_type and page_number columns to books table
-- ============================================

-- Add material_type column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'books' 
    AND column_name = 'material_type'
  ) THEN
    ALTER TABLE books ADD COLUMN material_type TEXT DEFAULT 'book';
    RAISE NOTICE '✅ Added material_type column';
  ELSE
    RAISE NOTICE '⚠️  material_type column already exists';
  END IF;
END $$;

-- Add page_number column (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'books' 
    AND column_name = 'page_number'
  ) THEN
    ALTER TABLE books ADD COLUMN page_number TEXT;
    RAISE NOTICE '✅ Added page_number column';
  ELSE
    RAISE NOTICE '⚠️  page_number column already exists';
  END IF;
END $$;

-- Update existing ebooks to have correct material_type
UPDATE books 
SET material_type = 'ebook'
WHERE (
  LOWER(category) LIKE '%ebook%' OR 
  LOWER(category) LIKE '%e-book%'
) AND (material_type IS NULL OR material_type = 'book');

-- Update existing electronic materials to have correct material_type
UPDATE books 
SET material_type = 'electronic_material'
WHERE (
  LOWER(category) LIKE '%electronic%' OR 
  LOWER(category) LIKE '%digital%'
) AND LOWER(category) NOT LIKE '%ebook%' 
  AND (material_type IS NULL OR material_type = 'book');

-- Verification
SELECT 
  material_type,
  COUNT(*) as count,
  STRING_AGG(DISTINCT category, ', ' ORDER BY category) as categories
FROM books
GROUP BY material_type
ORDER BY material_type;

-- Success message
DO $$
DECLARE
  book_count INTEGER;
  ebook_count INTEGER;
  electronic_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO book_count FROM books WHERE material_type = 'book';
  SELECT COUNT(*) INTO ebook_count FROM books WHERE material_type = 'ebook';
  SELECT COUNT(*) INTO electronic_count FROM books WHERE material_type = 'electronic_material';
  
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ MATERIAL TYPE COLUMNS ADDED SUCCESSFULLY!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Physical Books: %', book_count;
  RAISE NOTICE '📱 eBooks: %', ebook_count;
  RAISE NOTICE '💻 Electronic Materials: %', electronic_count;
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✨ All existing books have been updated with correct material types';
  RAISE NOTICE '✨ New uploads will automatically be tagged correctly';
  RAISE NOTICE '====================================================================';
END $$;
