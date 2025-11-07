-- Create Content Oversight Module
-- This module provides tools for Super Admins to monitor and manage book content quality across all institutions

-- =============================================================================
-- PART 1: Views for Content Oversight
-- =============================================================================

DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'metadata'
  ) THEN
    EXECUTE $view$
    CREATE OR REPLACE VIEW global_book_catalog AS
    SELECT 
      b.id,
      b.title,
      b.author_publisher,
      b.isbn,
      b.category,
      b.status,
      b.created_at,
      b.updated_at,
      i.id AS institution_id,
      i.name AS institution_name,
      i.is_active AS institution_active,
      -- Note: total_copies and available_copies may not exist in all databases
      -- If they don't exist, this will cause an error - see note below
      1 AS total_copies,
      1 AS available_copies,
      -- Storage metadata if available
      b.metadata,
      -- Calculate quality score
      (
        CASE WHEN b.title IS NOT NULL AND LENGTH(TRIM(b.title)) > 3 THEN 25 ELSE 0 END +
        CASE WHEN b.author_publisher IS NOT NULL AND LENGTH(TRIM(b.author_publisher)) > 2 THEN 25 ELSE 0 END +
        CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 30 ELSE 0 END +
        CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 20 ELSE 0 END
      ) AS quality_score,
      -- Flags for issues
      CASE WHEN b.isbn IS NULL OR LENGTH(TRIM(b.isbn)) < 10 THEN true ELSE false END AS missing_isbn,
      CASE WHEN b.category IS NULL OR b.category = '' THEN true ELSE false END AS missing_category,
      CASE WHEN LENGTH(TRIM(b.title)) < 3 THEN true ELSE false END AS title_too_short
    FROM books b
    LEFT JOIN institutions i ON i.id = b.institution_id
    WHERE b.institution_id IS NOT NULL;
    $view$;
  ELSE
    EXECUTE $view$
    CREATE OR REPLACE VIEW global_book_catalog AS
    SELECT 
      b.id,
      b.title,
      b.author_publisher,
      b.isbn,
      b.category,
      b.status,
      b.created_at,
      b.updated_at,
      i.id AS institution_id,
      i.name AS institution_name,
      i.is_active AS institution_active,
      1 AS total_copies,
      1 AS available_copies,
      -- metadata column not present in this DB, provide safe fallback
      NULL::jsonb AS metadata,
      (
        CASE WHEN b.title IS NOT NULL AND LENGTH(TRIM(b.title)) > 3 THEN 25 ELSE 0 END +
        CASE WHEN b.author_publisher IS NOT NULL AND LENGTH(TRIM(b.author_publisher)) > 2 THEN 25 ELSE 0 END +
        CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 30 ELSE 0 END +
        CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 20 ELSE 0 END
      ) AS quality_score,
      CASE WHEN b.isbn IS NULL OR LENGTH(TRIM(b.isbn)) < 10 THEN true ELSE false END AS missing_isbn,
      CASE WHEN b.category IS NULL OR b.category = '' THEN true ELSE false END AS missing_category,
      CASE WHEN LENGTH(TRIM(b.title)) < 3 THEN true ELSE false END AS title_too_short
    FROM books b
    LEFT JOIN institutions i ON i.id = b.institution_id
    WHERE b.institution_id IS NOT NULL;
    $view$;
  END IF;
END
$do$;

-- Duplicate ISBN Detection View
CREATE OR REPLACE VIEW duplicate_isbns AS
SELECT 
  isbn,
  COUNT(*) AS duplicate_count,
  ARRAY_AGG(DISTINCT b.institution_id) AS institution_ids,
  ARRAY_AGG(DISTINCT i.name) AS institution_names,
  ARRAY_AGG(b.id) AS book_ids,
  ARRAY_AGG(b.title) AS titles,
  MIN(b.created_at) AS first_added,
  MAX(b.created_at) AS last_added
FROM books b
LEFT JOIN institutions i ON i.id = b.institution_id
WHERE b.isbn IS NOT NULL 
  AND LENGTH(TRIM(b.isbn)) >= 10
GROUP BY isbn
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- Book Metadata Quality View
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'metadata'
  ) THEN
    EXECUTE $view$
    CREATE OR REPLACE VIEW book_quality_metrics AS
    SELECT 
      b.institution_id,
      i.name AS institution_name,
      COUNT(*) AS total_books,
      COUNT(CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 1 END) AS books_with_isbn,
      COUNT(CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 1 END) AS books_with_category,
      COUNT(CASE WHEN LENGTH(TRIM(b.title)) >= 3 THEN 1 END) AS books_with_valid_title,
      COUNT(CASE WHEN LENGTH(TRIM(b.author_publisher)) >= 2 THEN 1 END) AS books_with_author,
      ROUND(AVG(
        CASE WHEN b.title IS NOT NULL AND LENGTH(TRIM(b.title)) > 3 THEN 25 ELSE 0 END +
        CASE WHEN b.author_publisher IS NOT NULL AND LENGTH(TRIM(b.author_publisher)) > 2 THEN 25 ELSE 0 END +
        CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 30 ELSE 0 END +
        CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 20 ELSE 0 END
      ), 2) AS avg_quality_score,
      COUNT(CASE WHEN b.metadata IS NOT NULL THEN 1 END) AS books_with_metadata
    FROM books b
    LEFT JOIN institutions i ON i.id = b.institution_id
    WHERE b.institution_id IS NOT NULL
    GROUP BY b.institution_id, i.name
    ORDER BY avg_quality_score ASC;
    $view$;
  ELSE
    EXECUTE $view$
    CREATE OR REPLACE VIEW book_quality_metrics AS
    SELECT 
      b.institution_id,
      i.name AS institution_name,
      COUNT(*) AS total_books,
      COUNT(CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 1 END) AS books_with_isbn,
      COUNT(CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 1 END) AS books_with_category,
      COUNT(CASE WHEN LENGTH(TRIM(b.title)) >= 3 THEN 1 END) AS books_with_valid_title,
      COUNT(CASE WHEN LENGTH(TRIM(b.author_publisher)) >= 2 THEN 1 END) AS books_with_author,
      ROUND(AVG(
        CASE WHEN b.title IS NOT NULL AND LENGTH(TRIM(b.title)) > 3 THEN 25 ELSE 0 END +
        CASE WHEN b.author_publisher IS NOT NULL AND LENGTH(TRIM(b.author_publisher)) > 2 THEN 25 ELSE 0 END +
        CASE WHEN b.isbn IS NOT NULL AND LENGTH(TRIM(b.isbn)) >= 10 THEN 30 ELSE 0 END +
        CASE WHEN b.category IS NOT NULL AND b.category != '' THEN 20 ELSE 0 END
      ), 2) AS avg_quality_score,
      0 AS books_with_metadata
    FROM books b
    LEFT JOIN institutions i ON i.id = b.institution_id
    WHERE b.institution_id IS NOT NULL
    GROUP BY b.institution_id, i.name
    ORDER BY avg_quality_score ASC;
    $view$;
  END IF;
END
$do$;

-- =============================================================================
-- PART 2: Storage Usage by Institution
-- =============================================================================

-- Note: This view assumes storage.objects table is accessible
-- If using Supabase Storage, this will need to be adjusted based on your storage setup
DO $do$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'metadata'
  ) THEN
    EXECUTE $view$
    CREATE OR REPLACE VIEW institution_storage_usage AS
    SELECT 
      i.id AS institution_id,
      i.name AS institution_name,
      COUNT(b.id) AS total_books,
      -- Estimate storage based on metadata if available
      COALESCE(SUM(CAST(b.metadata->>'file_size' AS BIGINT)), 0) AS total_storage_bytes,
      COALESCE(SUM(
        CASE WHEN b.metadata->>'content_type' LIKE 'image%' 
        THEN CAST(b.metadata->>'file_size' AS BIGINT) 
        ELSE 0 END
      ), 0) AS image_storage_bytes,
      COALESCE(SUM(
        CASE WHEN b.metadata->>'content_type' LIKE 'application/pdf%' 
        THEN CAST(b.metadata->>'file_size' AS BIGINT) 
        ELSE 0 END
      ), 0) AS pdf_storage_bytes,
      COUNT(CASE WHEN b.metadata->>'cover_image_url' IS NOT NULL THEN 1 END) AS books_with_covers
    FROM institutions i
    LEFT JOIN books b ON b.institution_id = i.id
    GROUP BY i.id, i.name
    ORDER BY total_storage_bytes DESC;
    $view$;
  ELSE
    EXECUTE $view$
    CREATE OR REPLACE VIEW institution_storage_usage AS
    SELECT 
      i.id AS institution_id,
      i.name AS institution_name,
      COUNT(b.id) AS total_books,
      -- metadata column not present in this DB, provide safe fallback
      0 AS total_storage_bytes,
      0 AS image_storage_bytes,
      0 AS pdf_storage_bytes,
      0 AS books_with_covers
    FROM institutions i
    LEFT JOIN books b ON b.institution_id = i.id
    GROUP BY i.id, i.name
    ORDER BY total_storage_bytes DESC;
    $view$;
  END IF;
END
$do$;

-- =============================================================================
-- PART 3: Content Oversight Tables
-- =============================================================================

-- Duplicate Resolution Log
CREATE TABLE IF NOT EXISTS duplicate_resolution_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn TEXT NOT NULL,
  resolution_type TEXT NOT NULL, -- 'merged', 'marked_valid', 'deleted'
  kept_book_id UUID REFERENCES books(id) ON DELETE SET NULL,
  removed_book_ids UUID[],
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_resolution_type CHECK (resolution_type IN ('merged', 'marked_valid', 'deleted', 'ignored'))
);

-- Book Quality Flags
CREATE TABLE IF NOT EXISTS book_quality_flags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  flag_type TEXT NOT NULL, -- 'missing_isbn', 'missing_category', 'poor_title', 'missing_author', 'duplicate_suspected'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  flagged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT valid_flag_type CHECK (flag_type IN ('missing_isbn', 'missing_category', 'poor_title', 'missing_author', 'duplicate_suspected', 'invalid_metadata', 'missing_cover')),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_flag_status CHECK (status IN ('open', 'resolved', 'dismissed'))
);

-- Content Review Log
CREATE TABLE IF NOT EXISTS content_review_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  review_type TEXT NOT NULL, -- 'quality_check', 'metadata_verification', 'duplicate_check'
  review_score INTEGER, -- 0-100
  issues_found TEXT[],
  recommendations TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_review_type CHECK (review_type IN ('quality_check', 'metadata_verification', 'duplicate_check', 'content_audit')),
  CONSTRAINT valid_review_score CHECK (review_score >= 0 AND review_score <= 100)
);

-- =============================================================================
-- PART 4: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_duplicate_resolution_isbn ON duplicate_resolution_log(isbn);
CREATE INDEX IF NOT EXISTS idx_duplicate_resolution_resolved_by ON duplicate_resolution_log(resolved_by);
CREATE INDEX IF NOT EXISTS idx_duplicate_resolution_created_at ON duplicate_resolution_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quality_flags_book_id ON book_quality_flags(book_id);
CREATE INDEX IF NOT EXISTS idx_quality_flags_status ON book_quality_flags(status);
CREATE INDEX IF NOT EXISTS idx_quality_flags_flag_type ON book_quality_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_quality_flags_severity ON book_quality_flags(severity);

CREATE INDEX IF NOT EXISTS idx_content_review_book_id ON content_review_log(book_id);
CREATE INDEX IF NOT EXISTS idx_content_review_reviewer_id ON content_review_log(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_content_review_reviewed_at ON content_review_log(reviewed_at DESC);

-- =============================================================================
-- PART 5: RLS Policies
-- =============================================================================

ALTER TABLE duplicate_resolution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_quality_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_review_log ENABLE ROW LEVEL SECURITY;

-- Super admins can view all content oversight data
CREATE POLICY "super_admins_view_duplicate_resolutions" ON duplicate_resolution_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admins_manage_duplicate_resolutions" ON duplicate_resolution_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admins_view_quality_flags" ON book_quality_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admins_manage_quality_flags" ON book_quality_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admins_view_content_reviews" ON content_review_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "super_admins_create_content_reviews" ON content_review_log
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- =============================================================================
-- PART 6: Helper Functions
-- =============================================================================

-- Function to automatically flag books with quality issues
CREATE OR REPLACE FUNCTION auto_flag_book_quality_issues()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_book RECORD;
BEGIN
  -- Clear old auto-generated flags
  DELETE FROM book_quality_flags 
  WHERE flagged_by IS NULL AND status = 'open';
  
  -- Flag books with missing ISBN
  INSERT INTO book_quality_flags (book_id, flag_type, severity, notes)
  SELECT 
    id,
    'missing_isbn',
    'medium',
    'Book is missing ISBN number'
  FROM books
  WHERE (isbn IS NULL OR LENGTH(TRIM(isbn)) < 10)
    AND id NOT IN (SELECT book_id FROM book_quality_flags WHERE flag_type = 'missing_isbn' AND status != 'open');
  
  -- Flag books with missing category
  INSERT INTO book_quality_flags (book_id, flag_type, severity, notes)
  SELECT 
    id,
    'missing_category',
    'low',
    'Book is missing category classification'
  FROM books
  WHERE (category IS NULL OR category = '')
    AND id NOT IN (SELECT book_id FROM book_quality_flags WHERE flag_type = 'missing_category' AND status != 'open');
  
  -- Flag books with poor titles
  INSERT INTO book_quality_flags (book_id, flag_type, severity, notes)
  SELECT 
    id,
    'poor_title',
    'high',
    'Book title is too short or missing'
  FROM books
  WHERE LENGTH(TRIM(title)) < 3
    AND id NOT IN (SELECT book_id FROM book_quality_flags WHERE flag_type = 'poor_title' AND status != 'open');
  
  -- Flag books with missing author
  INSERT INTO book_quality_flags (book_id, flag_type, severity, notes)
  SELECT 
    id,
    'missing_author',
    'medium',
    'Book is missing author/publisher information'
  FROM books
  WHERE (author_publisher IS NULL OR LENGTH(TRIM(author_publisher)) < 2)
    AND id NOT IN (SELECT book_id FROM book_quality_flags WHERE flag_type = 'missing_author' AND status != 'open');
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    NULL,
    'system_event',
    'book_quality_flags',
    NULL,
    'Auto-flagged books with quality issues',
    jsonb_build_object('action', 'auto_flag_quality_issues'),
    NULL,
    NULL,
    'success'
  );
END;
$$;

-- Function to merge duplicate books
CREATE OR REPLACE FUNCTION merge_duplicate_books(
  p_keep_book_id UUID,
  p_remove_book_ids UUID[],
  p_isbn TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resolution_id UUID;
  v_book_id UUID;
BEGIN
  -- Verify the kept book exists
  IF NOT EXISTS (SELECT 1 FROM books WHERE id = p_keep_book_id) THEN
    RAISE EXCEPTION 'Book to keep (%) does not exist', p_keep_book_id;
  END IF;
  
  -- Update borrow records to point to kept book
  FOREACH v_book_id IN ARRAY p_remove_book_ids
  LOOP
    UPDATE borrow_records
    SET book_id = p_keep_book_id
    WHERE book_id = v_book_id;
    
    -- Transfer quality flags
    UPDATE book_quality_flags
    SET book_id = p_keep_book_id
    WHERE book_id = v_book_id;
  END LOOP;
  
  -- Delete duplicate books
  DELETE FROM books WHERE id = ANY(p_remove_book_ids);
  
  -- Log the resolution
  INSERT INTO duplicate_resolution_log (
    isbn,
    resolution_type,
    kept_book_id,
    removed_book_ids,
    resolved_by,
    resolution_notes
  ) VALUES (
    p_isbn,
    'merged',
    p_keep_book_id,
    p_remove_book_ids,
    auth.uid(),
    p_notes
  ) RETURNING id INTO v_resolution_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    NULL,
    'bulk_delete',
    'books',
    p_keep_book_id::TEXT,
    format('Merged %s duplicate books with ISBN %s', array_length(p_remove_book_ids, 1), p_isbn),
    jsonb_build_object(
      'kept_book_id', p_keep_book_id,
      'removed_book_ids', p_remove_book_ids,
      'isbn', p_isbn
    ),
    NULL,
    NULL,
    'success'
  );
  
  RETURN v_resolution_id;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Content Oversight module created successfully!';
  RAISE NOTICE '📊 Views created:';
  RAISE NOTICE '   - global_book_catalog (cross-institution book view)';
  RAISE NOTICE '   - duplicate_isbns (duplicate ISBN detection)';
  RAISE NOTICE '   - book_quality_metrics (quality scoring by institution)';
  RAISE NOTICE '   - institution_storage_usage (storage analytics)';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '   - duplicate_resolution_log (merge/deletion tracking)';
  RAISE NOTICE '   - book_quality_flags (quality issue flagging)';
  RAISE NOTICE '   - content_review_log (review audit trail)';
  RAISE NOTICE '🔒 RLS policies: 6 policies created';
  RAISE NOTICE '⚙️ Helper functions:';
  RAISE NOTICE '   - auto_flag_book_quality_issues() - Auto-detect quality issues';
  RAISE NOTICE '   - merge_duplicate_books() - Merge duplicate book records';
END $$;
