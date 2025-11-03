-- =====================================================
-- CUSTOM STORAGE CALCULATION FOR YOUR SETUP
-- =====================================================
-- Based on your actual bucket structure: ebooks
-- =====================================================

-- Drop the placeholder function
DROP FUNCTION IF EXISTS calculate_storage_usage(UUID);

-- Create the real storage calculation function
CREATE OR REPLACE FUNCTION calculate_storage_usage(
  p_institution_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bytes BIGINT := 0;
  v_ebooks_bytes BIGINT := 0;
  v_pdf_bytes BIGINT := 0;
  v_doc_bytes BIGINT := 0;
  v_other_bytes BIGINT := 0;
  v_file_count INTEGER := 0;
BEGIN
  -- Get total storage from ebooks bucket for this institution
  -- Note: Adjust the path pattern based on how you organize files by institution
  SELECT 
    COALESCE(SUM((metadata->>'size')::BIGINT), 0),
    COUNT(*)
  INTO v_ebooks_bytes, v_file_count
  FROM storage.objects
  WHERE bucket_id = 'ebooks'
    -- If your files are organized by institution, uncomment and adjust:
    -- AND name LIKE p_institution_id::TEXT || '/%'
  ;

  -- Calculate by file type
  -- PDFs
  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO v_pdf_bytes
  FROM storage.objects
  WHERE bucket_id = 'ebooks'
    AND (metadata->>'mimetype') = 'application/pdf';
    -- AND name LIKE p_institution_id::TEXT || '/%'

  -- Documents (Word, Excel, etc.)
  SELECT COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO v_doc_bytes
  FROM storage.objects
  WHERE bucket_id = 'ebooks'
    AND (metadata->>'mimetype') LIKE 'application/vnd.openxmlformats-officedocument%';
    -- AND name LIKE p_institution_id::TEXT || '/%'

  -- Other files
  v_other_bytes := v_ebooks_bytes - v_pdf_bytes - v_doc_bytes;
  v_total_bytes := v_ebooks_bytes;

  -- Insert or update storage usage
  INSERT INTO storage_usage (
    institution_id,
    total_bytes,
    books_bytes,              -- PDFs (ebooks)
    digital_library_bytes,    -- Documents
    images_bytes,             -- Not used yet (0)
    other_bytes,              -- Other file types
    file_count,
    last_calculated_at
  ) VALUES (
    p_institution_id,
    v_total_bytes,
    v_pdf_bytes,
    v_doc_bytes,
    0,                        -- No images yet
    v_other_bytes,
    v_file_count,
    NOW()
  )
  ON CONFLICT (institution_id)
  DO UPDATE SET
    total_bytes = EXCLUDED.total_bytes,
    books_bytes = EXCLUDED.books_bytes,
    digital_library_bytes = EXCLUDED.digital_library_bytes,
    images_bytes = EXCLUDED.images_bytes,
    other_bytes = EXCLUDED.other_bytes,
    file_count = EXCLUDED.file_count,
    last_calculated_at = NOW();

  -- Log the activity
  PERFORM log_activity(
    'system_setting_changed',
    'Storage usage calculated: ' || 
      ROUND(v_total_bytes::NUMERIC / 1048576, 2)::TEXT || ' MB (' || 
      v_file_count || ' files)',
    'storage',
    NULL,
    p_institution_id,
    jsonb_build_object(
      'total_bytes', v_total_bytes,
      'file_count', v_file_count,
      'pdf_bytes', v_pdf_bytes,
      'doc_bytes', v_doc_bytes
    )
  );
END;
$$;

-- =====================================================
-- HELPER: Calculate for ALL institutions
-- =====================================================

DROP FUNCTION IF EXISTS calculate_all_storage();

CREATE OR REPLACE FUNCTION calculate_all_storage()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  total_mb NUMERIC,
  file_count INTEGER,
  duration_ms INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inst_record RECORD;
  start_time TIMESTAMPTZ;
  end_time TIMESTAMPTZ;
BEGIN
  FOR inst_record IN 
    SELECT id, name FROM institutions WHERE is_active = true
  LOOP
    start_time := clock_timestamp();
    
    PERFORM calculate_storage_usage(inst_record.id);
    
    end_time := clock_timestamp();
    
    RETURN QUERY
    SELECT 
      inst_record.id,
      inst_record.name,
      ROUND((su.total_bytes::NUMERIC / 1048576), 2),
      su.file_count,
      EXTRACT(MILLISECONDS FROM (end_time - start_time))::INTEGER
    FROM storage_usage su
    WHERE su.institution_id = inst_record.id;
  END LOOP;
END;
$$;

-- =====================================================
-- HELPER: Get storage summary
-- =====================================================

DROP FUNCTION IF EXISTS get_storage_summary();

CREATE OR REPLACE FUNCTION get_storage_summary()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  total_gb NUMERIC,
  total_mb NUMERIC,
  file_count INTEGER,
  pdf_mb NUMERIC,
  doc_mb NUMERIC,
  other_mb NUMERIC,
  last_calculated TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.name,
    ROUND((su.total_bytes::NUMERIC / 1073741824), 3) as total_gb,
    ROUND((su.total_bytes::NUMERIC / 1048576), 2) as total_mb,
    su.file_count,
    ROUND((su.books_bytes::NUMERIC / 1048576), 2) as pdf_mb,
    ROUND((su.digital_library_bytes::NUMERIC / 1048576), 2) as doc_mb,
    ROUND((su.other_bytes::NUMERIC / 1048576), 2) as other_mb,
    su.last_calculated_at
  FROM institutions i
  LEFT JOIN storage_usage su ON su.institution_id = i.id
  WHERE i.is_active = true
  ORDER BY su.total_bytes DESC NULLS LAST;
END;
$$;

-- =====================================================
-- HELPER: Recalculate stale storage (>24 hours old)
-- =====================================================

DROP FUNCTION IF EXISTS recalculate_stale_storage();

CREATE OR REPLACE FUNCTION recalculate_stale_storage()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  was_calculated_at TIMESTAMPTZ,
  new_total_mb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inst_record RECORD;
BEGIN
  FOR inst_record IN 
    SELECT i.id, i.name, su.last_calculated_at
    FROM institutions i
    LEFT JOIN storage_usage su ON su.institution_id = i.id
    WHERE i.is_active = true
      AND (
        su.last_calculated_at IS NULL 
        OR su.last_calculated_at < NOW() - INTERVAL '24 hours'
      )
  LOOP
    PERFORM calculate_storage_usage(inst_record.id);
    
    RETURN QUERY
    SELECT 
      inst_record.id,
      inst_record.name,
      inst_record.last_calculated_at,
      ROUND((su.total_bytes::NUMERIC / 1048576), 2)
    FROM storage_usage su
    WHERE su.institution_id = inst_record.id;
  END LOOP;
END;
$$;

-- =====================================================
-- TEST THE FUNCTIONS
-- =====================================================

-- Calculate storage for ALL institutions
SELECT * FROM calculate_all_storage();

-- View the storage summary
SELECT * FROM get_storage_summary();

-- =====================================================
-- MONITORING QUERIES
-- =====================================================

-- Total storage across all institutions
SELECT 
  COUNT(*) as total_institutions,
  SUM(file_count) as total_files,
  ROUND(SUM(total_bytes)::NUMERIC / 1073741824, 2) as total_storage_gb,
  ROUND(SUM(total_bytes)::NUMERIC / 1048576, 2) as total_storage_mb,
  ROUND(AVG(total_bytes)::NUMERIC / 1048576, 2) as avg_storage_mb_per_institution
FROM storage_usage;

-- Storage by file type
SELECT 
  'PDFs' as file_type,
  SUM(file_count) as files,
  ROUND(SUM(books_bytes)::NUMERIC / 1048576, 2) as size_mb
FROM storage_usage
UNION ALL
SELECT 
  'Documents' as file_type,
  SUM(file_count) as files,
  ROUND(SUM(digital_library_bytes)::NUMERIC / 1048576, 2) as size_mb
FROM storage_usage
UNION ALL
SELECT 
  'Other' as file_type,
  SUM(file_count) as files,
  ROUND(SUM(other_bytes)::NUMERIC / 1048576, 2) as size_mb
FROM storage_usage;

-- Largest institutions by storage
SELECT 
  i.name,
  su.file_count,
  ROUND(su.total_bytes::NUMERIC / 1048576, 2) as storage_mb,
  su.last_calculated_at
FROM storage_usage su
JOIN institutions i ON i.id = su.institution_id
ORDER BY su.total_bytes DESC
LIMIT 10;

-- Institutions with stale storage data (>24 hours)
SELECT 
  i.name,
  su.last_calculated_at,
  EXTRACT(HOURS FROM (NOW() - su.last_calculated_at)) as hours_old
FROM storage_usage su
JOIN institutions i ON i.id = su.institution_id
WHERE su.last_calculated_at < NOW() - INTERVAL '24 hours'
ORDER BY su.last_calculated_at ASC;

-- =====================================================
-- NOTES FOR MULTI-INSTITUTION SETUP
-- =====================================================

/*
IMPORTANT: If your files are organized by institution in the ebooks bucket
(e.g., ebooks/institution-uuid/filename.pdf), you need to:

1. Uncomment the path filtering lines in calculate_storage_usage():
   -- AND name LIKE p_institution_id::TEXT || '/%'

2. This will ensure each institution only sees their own files

3. Current version calculates ALL files in ebooks bucket for each institution
   (which works if you have one institution or shared storage)

4. Check your bucket structure:
   SELECT DISTINCT 
     bucket_id,
     split_part(name, '/', 1) as first_path_segment
   FROM storage.objects
   WHERE bucket_id = 'ebooks'
   LIMIT 20;

5. If you see institution UUIDs or IDs in the first_path_segment,
   then uncomment the path filtering for accurate per-institution tracking
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
-- Your storage calculation is now ready!
-- The dashboard will show real storage usage data.
-- =====================================================
