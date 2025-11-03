-- =====================================================
-- STORAGE CALCULATION IMPLEMENTATION
-- =====================================================
-- This script provides the actual implementation for
-- calculate_storage_usage() function to work with
-- Supabase Storage
-- =====================================================

-- =====================================================
-- STEP 1: UNDERSTAND YOUR STORAGE STRUCTURE
-- =====================================================
/*
Supabase Storage schema:
- storage.buckets: Contains bucket definitions
- storage.objects: Contains all uploaded files

Common bucket structure for libraries:
- books: PDF/EPUB files for physical books
- digital-library: Digital content files
- covers: Book cover images
- avatars: User profile pictures
- documents: General documents
*/

-- View your current buckets
SELECT 
  id as bucket_id,
  name as bucket_name,
  created_at
FROM storage.buckets
ORDER BY name;

-- View storage objects structure
SELECT 
  bucket_id,
  name as file_name,
  metadata,
  created_at
FROM storage.objects
LIMIT 10;

-- =====================================================
-- STEP 2: ENHANCED STORAGE CALCULATION FUNCTION
-- =====================================================

-- Drop the placeholder function
DROP FUNCTION IF EXISTS calculate_storage_usage(UUID);

-- Create the actual implementation
CREATE OR REPLACE FUNCTION calculate_storage_usage(
  p_institution_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bytes BIGINT := 0;
  v_books_bytes BIGINT := 0;
  v_digital_bytes BIGINT := 0;
  v_images_bytes BIGINT := 0;
  v_other_bytes BIGINT := 0;
  v_file_count INTEGER := 0;
BEGIN
  -- Calculate books storage (PDF, EPUB, etc.)
  SELECT 
    COALESCE(SUM((metadata->>'size')::BIGINT), 0),
    COALESCE(COUNT(*), 0)
  INTO v_books_bytes, v_file_count
  FROM storage.objects
  WHERE bucket_id = 'books'
    AND (metadata->>'institution_id')::UUID = p_institution_id;

  -- Calculate digital library storage
  SELECT 
    COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO v_digital_bytes
  FROM storage.objects
  WHERE bucket_id IN ('digital-library', 'digital-content')
    AND (metadata->>'institution_id')::UUID = p_institution_id;

  -- Calculate images storage (covers, avatars)
  SELECT 
    COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO v_images_bytes
  FROM storage.objects
  WHERE bucket_id IN ('covers', 'avatars', 'images')
    AND (metadata->>'institution_id')::UUID = p_institution_id;

  -- Calculate other storage (documents, etc.)
  SELECT 
    COALESCE(SUM((metadata->>'size')::BIGINT), 0)
  INTO v_other_bytes
  FROM storage.objects
  WHERE bucket_id IN ('documents', 'reports', 'exports')
    AND (metadata->>'institution_id')::UUID = p_institution_id;

  -- Calculate total
  v_total_bytes := v_books_bytes + v_digital_bytes + v_images_bytes + v_other_bytes;

  -- Update or insert storage usage
  INSERT INTO storage_usage (
    institution_id,
    total_bytes,
    books_bytes,
    digital_library_bytes,
    images_bytes,
    other_bytes,
    file_count,
    last_calculated_at
  ) VALUES (
    p_institution_id,
    v_total_bytes,
    v_books_bytes,
    v_digital_bytes,
    v_images_bytes,
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
    'Storage usage calculated for institution: ' || v_total_bytes || ' bytes',
    'storage_calculation',
    p_institution_id,
    p_institution_id,
    jsonb_build_object(
      'total_bytes', v_total_bytes,
      'total_gb', ROUND((v_total_bytes::NUMERIC / 1073741824), 2),
      'file_count', v_file_count
    )
  );
END;
$$;

-- =====================================================
-- STEP 3: ALTERNATIVE IMPLEMENTATION (PATH-BASED)
-- =====================================================
-- If your storage doesn't use metadata for institution_id,
-- you might use path patterns instead

CREATE OR REPLACE FUNCTION calculate_storage_usage_by_path(
  p_institution_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_bytes BIGINT := 0;
  v_books_bytes BIGINT := 0;
  v_digital_bytes BIGINT := 0;
  v_images_bytes BIGINT := 0;
  v_other_bytes BIGINT := 0;
  v_file_count INTEGER := 0;
  v_path_pattern TEXT;
BEGIN
  -- Construct path pattern: institutions/{institution_id}/%
  v_path_pattern := 'institutions/' || p_institution_id::TEXT || '/%';

  -- Calculate by bucket and path
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN bucket_id = 'books' THEN (metadata->>'size')::BIGINT
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN bucket_id IN ('digital-library', 'digital-content') 
        THEN (metadata->>'size')::BIGINT
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN bucket_id IN ('covers', 'avatars', 'images') 
        THEN (metadata->>'size')::BIGINT
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN bucket_id IN ('documents', 'reports', 'exports') 
        THEN (metadata->>'size')::BIGINT
        ELSE 0
      END
    ), 0),
    COALESCE(COUNT(*), 0)
  INTO v_books_bytes, v_digital_bytes, v_images_bytes, v_other_bytes, v_file_count
  FROM storage.objects
  WHERE name LIKE v_path_pattern;

  v_total_bytes := v_books_bytes + v_digital_bytes + v_images_bytes + v_other_bytes;

  -- Update storage_usage table
  INSERT INTO storage_usage (
    institution_id,
    total_bytes,
    books_bytes,
    digital_library_bytes,
    images_bytes,
    other_bytes,
    file_count,
    last_calculated_at
  ) VALUES (
    p_institution_id,
    v_total_bytes,
    v_books_bytes,
    v_digital_bytes,
    v_images_bytes,
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
END;
$$;

-- =====================================================
-- STEP 4: HELPER FUNCTIONS
-- =====================================================

-- Function to get storage usage summary
CREATE OR REPLACE FUNCTION get_storage_summary()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  total_gb NUMERIC,
  books_gb NUMERIC,
  digital_gb NUMERIC,
  images_gb NUMERIC,
  file_count INTEGER,
  last_calculated TIMESTAMPTZ,
  usage_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.institution_id,
    i.name as institution_name,
    ROUND((s.total_bytes::NUMERIC / 1073741824), 2) as total_gb,
    ROUND((s.books_bytes::NUMERIC / 1073741824), 2) as books_gb,
    ROUND((s.digital_library_bytes::NUMERIC / 1073741824), 2) as digital_gb,
    ROUND((s.images_bytes::NUMERIC / 1073741824), 2) as images_gb,
    s.file_count,
    s.last_calculated_at,
    ROUND((s.total_bytes::NUMERIC / 10737418240) * 100, 2) as usage_percentage -- Assuming 10GB limit
  FROM storage_usage s
  JOIN institutions i ON i.id = s.institution_id
  ORDER BY s.total_bytes DESC;
END;
$$;

-- Function to calculate ALL institutions' storage
CREATE OR REPLACE FUNCTION calculate_all_storage()
RETURNS TABLE (
  institution_id UUID,
  total_bytes BIGINT,
  calculation_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inst_record RECORD;
  v_start_time TIMESTAMPTZ;
  v_end_time TIMESTAMPTZ;
BEGIN
  FOR v_inst_record IN 
    SELECT id FROM institutions WHERE is_active = true
  LOOP
    v_start_time := clock_timestamp();
    
    PERFORM calculate_storage_usage(v_inst_record.id);
    
    v_end_time := clock_timestamp();
    
    RETURN QUERY SELECT 
      v_inst_record.id,
      (SELECT su.total_bytes FROM storage_usage su WHERE su.institution_id = v_inst_record.id),
      v_end_time - v_start_time;
  END LOOP;
END;
$$;

-- =====================================================
-- STEP 5: TESTING QUERIES
-- =====================================================

-- Test storage calculation for a specific institution
-- Replace with actual institution ID
-- SELECT calculate_storage_usage('your-institution-id-here');

-- View storage summary
-- SELECT * FROM get_storage_summary();

-- Calculate all institutions
-- SELECT * FROM calculate_all_storage();

-- Check specific institution storage breakdown
/*
SELECT 
  i.name as institution,
  ROUND((s.total_bytes::NUMERIC / 1073741824), 2) as total_gb,
  ROUND((s.books_bytes::NUMERIC / 1073741824), 2) as books_gb,
  ROUND((s.digital_library_bytes::NUMERIC / 1073741824), 2) as digital_gb,
  ROUND((s.images_bytes::NUMERIC / 1073741824), 2) as images_gb,
  s.file_count,
  s.last_calculated_at
FROM storage_usage s
JOIN institutions i ON i.id = s.institution_id
WHERE i.id = 'your-institution-id-here';
*/

-- =====================================================
-- STEP 6: MONITORING QUERIES
-- =====================================================

-- Get institutions with highest storage usage
SELECT 
  i.name,
  ROUND((s.total_bytes::NUMERIC / 1073741824), 2) as total_gb,
  s.file_count,
  ROUND((s.total_bytes::NUMERIC / s.file_count), 0) as avg_file_size_bytes,
  s.last_calculated_at
FROM storage_usage s
JOIN institutions i ON i.id = s.institution_id
ORDER BY s.total_bytes DESC
LIMIT 10;

-- Get institutions approaching storage limits (assuming 10GB limit)
SELECT 
  i.name,
  ROUND((s.total_bytes::NUMERIC / 1073741824), 2) as used_gb,
  10 as limit_gb,
  ROUND((s.total_bytes::NUMERIC / 10737418240) * 100, 2) as usage_percent
FROM storage_usage s
JOIN institutions i ON i.id = s.institution_id
WHERE s.total_bytes > 8589934592  -- Over 8GB (80% of 10GB)
ORDER BY s.total_bytes DESC;

-- Get storage growth over time (if metrics are being recorded)
SELECT 
  DATE_TRUNC('day', recorded_at) as date,
  ROUND(AVG(metric_value), 2) as avg_storage_gb,
  ROUND(MAX(metric_value), 2) as max_storage_gb
FROM system_metrics
WHERE metric_name = 'storage_used_gb'
  AND recorded_at > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', recorded_at)
ORDER BY date DESC;

-- =====================================================
-- STEP 7: MAINTENANCE FUNCTIONS
-- =====================================================

-- Recalculate storage for stale records (older than 24 hours)
CREATE OR REPLACE FUNCTION recalculate_stale_storage()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_inst_record RECORD;
BEGIN
  FOR v_inst_record IN 
    SELECT institution_id 
    FROM storage_usage 
    WHERE last_calculated_at < NOW() - INTERVAL '24 hours'
  LOOP
    PERFORM calculate_storage_usage(v_inst_record.institution_id);
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
/*
1. Supabase Storage Structure:
   - storage.objects table contains file metadata
   - metadata JSONB field contains size and custom fields
   - You may need to adjust queries based on YOUR bucket structure

2. Size Calculation:
   - Sizes are in bytes
   - 1 GB = 1,073,741,824 bytes
   - 1 MB = 1,048,576 bytes

3. Performance Considerations:
   - Storage calculation can be slow for large datasets
   - Consider running during off-peak hours
   - Use pg_cron for scheduled calculations

4. Customization:
   - Adjust bucket names to match your setup
   - Modify path patterns if using path-based organization
   - Add more categories if needed

5. Metadata Setup:
   - When uploading files, include institution_id in metadata:
     ```javascript
     const { data, error } = await supabase.storage
       .from('books')
       .upload(`path/to/file.pdf`, file, {
         metadata: {
           institution_id: 'uuid-here'
         }
       });
     ```

6. Testing:
   - Test with a small institution first
   - Verify numbers match your storage dashboard
   - Monitor performance for large institutions
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
