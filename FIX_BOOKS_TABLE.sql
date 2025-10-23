-- ============================================
-- FIX BOOKS TABLE - ADD MISSING COLUMNS
-- ============================================
-- Adds: available_quantity column for inventory tracking
-- ============================================

-- Add available_quantity column (tracks books currently available)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 0;

-- Update available_quantity for existing books to match quantity
UPDATE books 
SET available_quantity = quantity 
WHERE available_quantity IS NULL OR available_quantity = 0;

-- Add constraint to ensure available_quantity never exceeds quantity
ALTER TABLE books 
ADD CONSTRAINT IF NOT EXISTS check_available_quantity 
CHECK (available_quantity >= 0 AND available_quantity <= quantity);

-- Add index for faster availability queries
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);

-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'books'
  AND column_name IN ('quantity', 'available_quantity', 'status')
ORDER BY ordinal_position;

-- Show sample data
SELECT 
  title,
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
  RAISE NOTICE '📋 Column Added:';
  RAISE NOTICE '   ✓ available_quantity - Tracks currently available books';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Constraint Added:';
  RAISE NOTICE '   ✓ check_available_quantity - Ensures 0 <= available_quantity <= quantity';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Indexes Added:';
  RAISE NOTICE '   ✓ idx_books_available_quantity - For availability queries';
  RAISE NOTICE '   ✓ idx_books_status - For status filtering';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Data Migration:';
  RAISE NOTICE '   ✓ Existing books updated: available_quantity = quantity';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🚀 Bulk book upload is now ready to use!';
  RAISE NOTICE '====================================================================';
END $$;
