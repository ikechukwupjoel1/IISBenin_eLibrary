-- ============================================
-- Check if there are any triggers or defaults overriding material_type
-- ============================================

-- 1. Check column default value
SELECT 
  column_name,
  column_default,
  is_nullable,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'books'
  AND column_name IN ('material_type', 'page_number');

-- 2. Check for triggers on books table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'books';

-- 3. Remove the DEFAULT constraint on material_type
ALTER TABLE books 
ALTER COLUMN material_type DROP DEFAULT;

-- 4. Verify the change
SELECT 
  column_name,
  column_default,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'books'
  AND column_name = 'material_type';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ REMOVED DEFAULT VALUE FROM material_type COLUMN';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 The material_type column will now accept whatever value you send';
  RAISE NOTICE '📝 No default "book" value will override your submission';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Try adding an ebook again and check if it saves correctly';
  RAISE NOTICE '====================================================================';
END $$;
