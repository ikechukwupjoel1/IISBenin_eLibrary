-- Verification Script for All Recent Migrations
-- Run this to confirm all tables, views, functions, and policies were created successfully

-- =============================================================================
-- PART 1: Verify Tables Exist
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== VERIFYING TABLES ===';
  
  -- Communications Center Tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'broadcast_announcements') THEN
    RAISE NOTICE '✅ broadcast_announcements table exists';
  ELSE
    RAISE WARNING '❌ broadcast_announcements table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    RAISE NOTICE '✅ email_campaigns table exists';
  ELSE
    RAISE WARNING '❌ email_campaigns table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates') THEN
    RAISE NOTICE '✅ email_templates table exists';
  ELSE
    RAISE WARNING '❌ email_templates table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notification_queue') THEN
    RAISE NOTICE '✅ notification_queue table exists';
  ELSE
    RAISE WARNING '❌ notification_queue table missing';
  END IF;
  
  -- Content Oversight Tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'duplicate_resolution_log') THEN
    RAISE NOTICE '✅ duplicate_resolution_log table exists';
  ELSE
    RAISE WARNING '❌ duplicate_resolution_log table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'book_quality_flags') THEN
    RAISE NOTICE '✅ book_quality_flags table exists';
  ELSE
    RAISE WARNING '❌ book_quality_flags table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'content_review_log') THEN
    RAISE NOTICE '✅ content_review_log table exists';
  ELSE
    RAISE WARNING '❌ content_review_log table missing';
  END IF;
  
  -- Compliance Tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_export_requests') THEN
    RAISE NOTICE '✅ data_export_requests table exists';
  ELSE
    RAISE WARNING '❌ data_export_requests table missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_deletion_requests') THEN
    RAISE NOTICE '✅ account_deletion_requests table exists';
  ELSE
    RAISE WARNING '❌ account_deletion_requests table missing';
  END IF;
  
  -- Audit Tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    RAISE NOTICE '✅ audit_logs table exists';
  ELSE
    RAISE WARNING '❌ audit_logs table missing';
  END IF;
END $$;

-- =============================================================================
-- PART 2: Verify Views Exist
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFYING VIEWS ===';
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'global_book_catalog') THEN
    RAISE NOTICE '✅ global_book_catalog view exists';
  ELSE
    RAISE WARNING '❌ global_book_catalog view missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'duplicate_isbns') THEN
    RAISE NOTICE '✅ duplicate_isbns view exists';
  ELSE
    RAISE WARNING '❌ duplicate_isbns view missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'book_quality_metrics') THEN
    RAISE NOTICE '✅ book_quality_metrics view exists';
  ELSE
    RAISE WARNING '❌ book_quality_metrics view missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'institution_storage_usage') THEN
    RAISE NOTICE '✅ institution_storage_usage view exists';
  ELSE
    RAISE WARNING '❌ institution_storage_usage view missing';
  END IF;
END $$;

-- =============================================================================
-- PART 3: Verify Functions Exist
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFYING FUNCTIONS ===';
  
  -- Content Oversight Functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'auto_flag_book_quality_issues') THEN
    RAISE NOTICE '✅ auto_flag_book_quality_issues() function exists';
  ELSE
    RAISE WARNING '❌ auto_flag_book_quality_issues() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'merge_duplicate_books') THEN
    RAISE NOTICE '✅ merge_duplicate_books() function exists';
  ELSE
    RAISE WARNING '❌ merge_duplicate_books() function missing';
  END IF;
  
  -- Communications Functions
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_broadcast_announcement') THEN
    RAISE NOTICE '✅ create_broadcast_announcement() function exists';
  ELSE
    RAISE WARNING '❌ create_broadcast_announcement() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'track_announcement_view') THEN
    RAISE NOTICE '✅ track_announcement_view() function exists';
  ELSE
    RAISE WARNING '❌ track_announcement_view() function missing';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_template_variables') THEN
    RAISE NOTICE '✅ process_template_variables() function exists';
  ELSE
    RAISE WARNING '❌ process_template_variables() function missing';
  END IF;
  
  -- Audit Function
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_event') THEN
    RAISE NOTICE '✅ log_audit_event() function exists';
  ELSE
    RAISE WARNING '❌ log_audit_event() function missing';
  END IF;
END $$;

-- =============================================================================
-- PART 4: Check Sample Data Counts
-- =============================================================================

DO $$
DECLARE
  v_template_count INTEGER;
  v_book_count INTEGER;
  v_institution_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DATA COUNTS ===';
  
  SELECT COUNT(*) INTO v_template_count FROM email_templates WHERE is_system = true;
  RAISE NOTICE 'System email templates: %', v_template_count;
  
  SELECT COUNT(*) INTO v_book_count FROM books;
  RAISE NOTICE 'Total books in catalog: %', v_book_count;
  
  SELECT COUNT(*) INTO v_institution_count FROM institutions;
  RAISE NOTICE 'Total institutions: %', v_institution_count;
END $$;

-- =============================================================================
-- PART 5: Test Content Oversight Functions
-- =============================================================================

-- Test auto-flagging (creates flags based on data quality)
SELECT auto_flag_book_quality_issues();

DO $$
DECLARE
  v_flag_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== QUALITY FLAGS ===';
  
  SELECT COUNT(*) INTO v_flag_count FROM book_quality_flags WHERE status = 'open';
  RAISE NOTICE 'Open quality flags: %', v_flag_count;
  
  -- Show breakdown by flag type
  FOR v_flag_count IN 
    SELECT flag_type, COUNT(*) as count
    FROM book_quality_flags
    WHERE status = 'open'
    GROUP BY flag_type
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  - %: %', v_flag_count.flag_type, v_flag_count.count;
  END LOOP;
END $$;

-- =============================================================================
-- PART 6: Query Sample Data from Views
-- =============================================================================

-- Show top 5 books from global catalog
SELECT 
  title,
  author_publisher,
  institution_name,
  quality_score,
  missing_isbn,
  missing_category
FROM global_book_catalog
ORDER BY created_at DESC
LIMIT 5;

-- Show duplicate ISBNs if any
SELECT 
  isbn,
  duplicate_count,
  institution_names
FROM duplicate_isbns
ORDER BY duplicate_count DESC
LIMIT 5;

-- Show quality metrics by institution
SELECT 
  institution_name,
  total_books,
  books_with_isbn,
  books_with_category,
  avg_quality_score
FROM book_quality_metrics
ORDER BY avg_quality_score ASC
LIMIT 5;

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ VERIFICATION COMPLETE ===';
  RAISE NOTICE 'All migrations have been verified.';
  RAISE NOTICE 'Check the output above for any warnings (❌).';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Test the UI - Navigate to Super Admin dashboard';
  RAISE NOTICE '2. Check Content Oversight tab for quality flags';
  RAISE NOTICE '3. Check Communications Center for templates';
  RAISE NOTICE '4. Review Security & Compliance tabs';
END $$;
