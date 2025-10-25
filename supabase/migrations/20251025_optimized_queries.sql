-- =====================================================
-- Optimized Query Patterns for IIS Benin eLibrary
-- Created: October 25, 2025
-- Purpose: Replace slow queries with optimized versions
-- =====================================================

-- =====================================================
-- 1. OPTIMIZED BOOK SEARCH QUERY
-- =====================================================
-- BEFORE: Simple LIKE query (slow)
-- SELECT * FROM books WHERE title LIKE '%search%' OR author LIKE '%search%';

-- AFTER: Full-text search (fast with GIN index)
CREATE OR REPLACE FUNCTION search_books_optimized(search_term TEXT)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  isbn TEXT,
  category TEXT,
  status TEXT,
  material_type TEXT,
  page_number TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.isbn,
    b.category,
    b.status,
    b.material_type,
    b.page_number,
    b.created_at,
    ts_rank(
      to_tsvector('english', b.title || ' ' || COALESCE(b.author, '')),
      plainto_tsquery('english', search_term)
    ) as rank
  FROM books b
  WHERE 
    to_tsvector('english', b.title || ' ' || COALESCE(b.author, '')) 
    @@ plainto_tsquery('english', search_term)
  ORDER BY rank DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 2. OPTIMIZED AVAILABLE BOOKS QUERY
-- =====================================================
-- Uses partial index on status
CREATE OR REPLACE FUNCTION get_available_books(
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  author TEXT,
  category TEXT,
  material_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.title,
    b.author,
    b.category,
    b.material_type
  FROM books b
  WHERE b.status = 'available'
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 3. OPTIMIZED STUDENT BORROW HISTORY
-- =====================================================
-- Uses composite index on (student_id, status)
CREATE OR REPLACE FUNCTION get_student_borrow_history(
  p_student_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  book_title TEXT,
  book_author TEXT,
  borrow_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    b.title,
    b.author,
    br.borrow_date,
    br.due_date,
    br.return_date,
    br.status
  FROM borrow_records br
  INNER JOIN books b ON b.id = br.book_id
  WHERE br.student_id = p_student_id
  ORDER BY br.borrow_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 4. OPTIMIZED OVERDUE BOOKS QUERY
-- =====================================================
-- Uses partial index on (due_date, status)
CREATE OR REPLACE FUNCTION get_overdue_books()
RETURNS TABLE (
  id UUID,
  book_title TEXT,
  borrower_name TEXT,
  borrower_type TEXT,
  due_date TIMESTAMPTZ,
  days_overdue INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    b.title,
    COALESCE(s.name, st.name) as borrower_name,
    CASE 
      WHEN br.student_id IS NOT NULL THEN 'Student'
      ELSE 'Staff'
    END as borrower_type,
    br.due_date,
    EXTRACT(DAY FROM (NOW() - br.due_date))::INT as days_overdue
  FROM borrow_records br
  INNER JOIN books b ON b.id = br.book_id
  LEFT JOIN students s ON s.id = br.student_id
  LEFT JOIN staff st ON st.id = br.staff_id
  WHERE br.status = 'active' 
    AND br.due_date < NOW()
  ORDER BY br.due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 5. OPTIMIZED LEADERBOARD QUERY (Using Materialized View)
-- =====================================================
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  enrollment_id TEXT,
  books_read BIGINT,
  current_streak INT,
  longest_streak INT,
  badges_earned BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lv.id,
    lv.name,
    lv.enrollment_id,
    lv.books_read,
    lv.current_streak,
    lv.longest_streak,
    lv.badges_earned
  FROM leaderboard_view lv
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 6. OPTIMIZED USER BADGES QUERY
-- =====================================================
-- Uses index on user_id
CREATE OR REPLACE FUNCTION get_user_badges(p_user_id UUID)
RETURNS TABLE (
  badge_id TEXT,
  badge_name TEXT,
  badge_description TEXT,
  awarded_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ub.badge_id,
    ub.badge_id as badge_name, -- Adjust based on your badges table structure
    ub.badge_id as badge_description,
    ub.awarded_at
  FROM user_badges ub
  WHERE ub.user_id = p_user_id
  ORDER BY ub.awarded_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 7. OPTIMIZED BOOK COUNT BY CATEGORY
-- =====================================================
CREATE OR REPLACE FUNCTION get_books_by_category_count()
RETURNS TABLE (
  category TEXT,
  total_books BIGINT,
  available_books BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.category,
    COUNT(*) as total_books,
    COUNT(*) FILTER (WHERE b.status = 'available') as available_books
  FROM books b
  WHERE b.category IS NOT NULL
  GROUP BY b.category
  ORDER BY total_books DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 8. OPTIMIZED READING PROGRESS QUERY
-- =====================================================
CREATE OR REPLACE FUNCTION get_user_reading_progress(
  p_user_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  book_id UUID,
  book_title TEXT,
  book_author TEXT,
  pages_read INT,
  total_pages INT,
  progress_percentage NUMERIC,
  last_updated TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rp.book_id,
    b.title,
    b.author,
    rp.pages_read,
    COALESCE(NULLIF(b.page_number, '')::INT, 100) as total_pages,
    ROUND((rp.pages_read::NUMERIC / NULLIF(NULLIF(b.page_number, '')::INT, 0) * 100), 2) as progress_percentage,
    rp.updated_at
  FROM reading_progress rp
  INNER JOIN books b ON b.id = rp.book_id
  WHERE rp.user_id = p_user_id
  ORDER BY rp.updated_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 9. OPTIMIZED PENDING BOOK REPORTS
-- =====================================================
CREATE OR REPLACE FUNCTION get_pending_book_reports(
  p_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_name TEXT,
  book_title TEXT,
  report_content TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    COALESCE(s.name, st.name) as user_name,
    b.title as book_title,
    br.content as report_content,
    br.created_at
  FROM book_reports br
  INNER JOIN books b ON b.id = br.book_id
  LEFT JOIN students s ON s.id = br.user_id
  LEFT JOIN staff st ON st.id = br.user_id
  WHERE br.status = 'pending'
  ORDER BY br.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 10. OPTIMIZED DASHBOARD STATISTICS
-- =====================================================
-- Single query to get all dashboard stats efficiently
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS TABLE (
  total_books BIGINT,
  available_books BIGINT,
  borrowed_books BIGINT,
  total_students BIGINT,
  total_staff BIGINT,
  active_borrows BIGINT,
  overdue_borrows BIGINT,
  pending_reports BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM books),
    (SELECT COUNT(*) FROM books WHERE status = 'available'),
    (SELECT COUNT(*) FROM books WHERE status = 'borrowed'),
    (SELECT COUNT(*) FROM students),
    (SELECT COUNT(*) FROM staff),
    (SELECT COUNT(*) FROM borrow_records WHERE status = 'active'),
    (SELECT COUNT(*) FROM borrow_records WHERE status = 'active' AND due_date < NOW()),
    (SELECT COUNT(*) FROM book_reports WHERE status = 'pending');
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- 11. BATCH UPDATE OVERDUE STATUS
-- =====================================================
-- Efficiently update overdue borrow records
CREATE OR REPLACE FUNCTION update_overdue_records()
RETURNS INT AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE borrow_records
  SET status = 'overdue'
  WHERE status = 'active' 
    AND due_date < NOW()
    AND status != 'overdue';
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule this to run daily (using pg_cron or application cron)
-- SELECT cron.schedule('update-overdue', '0 0 * * *', 'SELECT update_overdue_records()');

-- =====================================================
-- 12. OPTIMIZED SEARCH STUDENTS
-- =====================================================
CREATE OR REPLACE FUNCTION search_students_optimized(search_term TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  enrollment_id TEXT,
  grade_level TEXT,
  admission_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.name,
    s.enrollment_id,
    s.grade_level,
    s.admission_number
  FROM students s
  WHERE 
    to_tsvector('english', s.name) @@ plainto_tsquery('english', search_term)
    OR s.enrollment_id ILIKE '%' || search_term || '%'
    OR s.admission_number ILIKE '%' || search_term || '%'
  ORDER BY s.name
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- PERFORMANCE TIPS
-- =====================================================
-- 1. Use these functions instead of raw queries in your application
-- 2. Functions are cached and reuse query plans
-- 3. STABLE functions can be optimized by the planner
-- 4. Refresh leaderboard_view daily or after significant data changes
-- 5. Monitor function performance with pg_stat_user_functions
-- 6. Add connection pooling (PgBouncer) for better concurrency

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
-- Search books:
-- SELECT * FROM search_books_optimized('harry potter');

-- Get available books:
-- SELECT * FROM get_available_books(20, 0);

-- Get student history:
-- SELECT * FROM get_student_borrow_history('student-uuid-here', 10);

-- Get overdue books:
-- SELECT * FROM get_overdue_books();

-- Get leaderboard:
-- SELECT * FROM get_leaderboard(10);

-- Get dashboard stats:
-- SELECT * FROM get_dashboard_stats();

-- Update overdue records:
-- SELECT update_overdue_records();
