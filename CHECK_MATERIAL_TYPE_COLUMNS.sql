-- ============================================
-- Quick check to see if material_type and page_number columns exist
-- ============================================

-- Check if columns exist
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'books'
  AND column_name IN ('material_type', 'page_number')
ORDER BY column_name;

-- If columns exist, show sample data
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'books' 
    AND column_name = 'material_type'
  ) THEN
    RAISE NOTICE '✅ material_type column EXISTS';
    RAISE NOTICE 'Running sample query...';
  ELSE
    RAISE NOTICE '❌ material_type column DOES NOT EXIST';
    RAISE NOTICE '⚠️  YOU MUST RUN: ADD_MATERIAL_TYPE_COLUMNS.sql';
  END IF;
END $$;

-- Show sample of books with their material types
SELECT 
  id,
  title,
  category,
  material_type,
  page_number,
  CASE 
    WHEN material_type IS NULL THEN '❌ NULL - NEEDS FIX'
    WHEN material_type = 'book' THEN '📚 Physical'
    WHEN material_type = 'ebook' THEN '📱 eBook'
    WHEN material_type = 'electronic_material' THEN '💻 Electronic'
    ELSE '⚠️  Unknown: ' || material_type
  END as type_display
FROM books
ORDER BY created_at DESC
LIMIT 10;
