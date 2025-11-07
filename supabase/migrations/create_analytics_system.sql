-- Advanced Analytics & Reporting System
-- This migration creates comprehensive analytics infrastructure for tracking usage, engagement, and performance

-- =============================================================================
-- PART 1: Analytics Materialized Views
-- =============================================================================

-- Book Usage Analytics (Materialized View for Performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS book_usage_analytics AS
SELECT 
  b.id AS book_id,
  b.title,
  b.isbn,
  b.institution_id,
  COUNT(DISTINCT br.id) AS total_borrows,
  COUNT(DISTINCT br.user_id) AS unique_borrowers,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'active') AS active_borrows,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'returned') AS completed_borrows,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'overdue') AS overdue_borrows,
  AVG(EXTRACT(EPOCH FROM (br.return_date - br.borrowed_at))/86400) FILTER (WHERE br.return_date IS NOT NULL) AS avg_borrow_duration_days,
  MAX(br.borrowed_at) AS last_borrowed_at,
  DATE_TRUNC('month', NOW()) AS analytics_month
FROM books b
LEFT JOIN borrowing_records br ON b.id = br.book_id
GROUP BY b.id, b.title, b.isbn, b.institution_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_book_usage_analytics_unique 
  ON book_usage_analytics(book_id);

-- User Engagement Metrics (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_engagement_metrics AS
SELECT 
  u.id AS user_id,
  up.full_name,
  up.email,
  up.role,
  up.institution_id,
  COUNT(DISTINCT br.id) AS total_borrows,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'active') AS active_borrows,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'overdue') AS overdue_count,
  COUNT(DISTINCT br.book_id) AS unique_books_borrowed,
  MAX(br.borrowed_at) AS last_activity,
  COUNT(DISTINCT br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '30 days') AS borrows_last_30_days,
  COUNT(DISTINCT br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '7 days') AS borrows_last_7_days,
  DATE_TRUNC('month', NOW()) AS analytics_month
FROM auth.users u
LEFT JOIN user_profiles up ON u.id = up.id
LEFT JOIN borrowing_records br ON u.id = br.user_id
GROUP BY u.id, up.full_name, up.email, up.role, up.institution_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_engagement_metrics_unique 
  ON user_engagement_metrics(user_id);

-- Institution Performance Stats (Materialized View)
CREATE MATERIALIZED VIEW IF NOT EXISTS institution_performance_stats AS
SELECT 
  i.id AS institution_id,
  i.name AS institution_name,
  i.is_active,
  COUNT(DISTINCT up.id) FILTER (WHERE up.role = 'student') AS total_students,
  COUNT(DISTINCT up.id) FILTER (WHERE up.role = 'librarian') AS total_librarians,
  COUNT(DISTINCT b.id) AS total_books,
  COUNT(DISTINCT br.id) AS total_borrows,
  COUNT(DISTINCT br.user_id) AS active_users,
  COUNT(DISTINCT br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '30 days') AS borrows_last_30_days,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'active') AS current_active_borrows,
  COUNT(DISTINCT br.id) FILTER (WHERE br.status = 'overdue') AS current_overdue,
  AVG(EXTRACT(EPOCH FROM (br.return_date - br.borrowed_at))/86400) FILTER (WHERE br.return_date IS NOT NULL) AS avg_borrow_duration,
  DATE_TRUNC('month', NOW()) AS analytics_month
FROM institutions i
LEFT JOIN user_profiles up ON i.id = up.institution_id
LEFT JOIN books b ON i.id = b.institution_id
LEFT JOIN borrowing_records br ON b.id = br.book_id
GROUP BY i.id, i.name, i.is_active;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_performance_stats_unique 
  ON institution_performance_stats(institution_id);

-- =============================================================================
-- PART 2: Analytics Tables for Historical Data
-- =============================================================================

-- Daily Analytics Snapshots
CREATE TABLE IF NOT EXISTS daily_analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  
  -- Global metrics
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  total_books INTEGER DEFAULT 0,
  total_borrows INTEGER DEFAULT 0,
  active_borrows INTEGER DEFAULT 0,
  overdue_borrows INTEGER DEFAULT 0,
  
  -- Daily activity
  new_users_today INTEGER DEFAULT 0,
  new_books_today INTEGER DEFAULT 0,
  borrows_today INTEGER DEFAULT 0,
  returns_today INTEGER DEFAULT 0,
  
  -- Engagement
  avg_borrows_per_user DECIMAL(10,2),
  avg_borrow_duration DECIMAL(10,2),
  
  -- Top metrics
  top_books JSONB, -- [{book_id, title, borrow_count}]
  top_categories JSONB, -- [{category, borrow_count}]
  top_institutions JSONB, -- [{institution_id, name, borrow_count}]
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_snapshot_date UNIQUE (snapshot_date)
);

-- Category Performance Tracking
CREATE TABLE IF NOT EXISTS category_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  
  -- Counts
  total_books INTEGER DEFAULT 0,
  total_borrows INTEGER DEFAULT 0,
  active_borrows INTEGER DEFAULT 0,
  unique_borrowers INTEGER DEFAULT 0,
  
  -- Trends (last 30 days)
  borrows_last_30_days INTEGER DEFAULT 0,
  growth_rate DECIMAL(5,2), -- Percentage change from previous period
  
  -- Performance
  avg_borrow_duration DECIMAL(10,2),
  popularity_score DECIMAL(10,2), -- Calculated metric
  
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_category UNIQUE (category)
);

-- Borrowing Patterns Analysis
CREATE TABLE IF NOT EXISTS borrowing_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_date DATE NOT NULL,
  
  -- Time-based patterns
  hour_of_day INTEGER, -- 0-23
  day_of_week INTEGER, -- 0-6 (Sunday=0)
  
  -- Pattern metrics
  borrow_count INTEGER DEFAULT 0,
  return_count INTEGER DEFAULT 0,
  peak_hour BOOLEAN DEFAULT false,
  
  -- Additional insights
  avg_duration_hours DECIMAL(10,2),
  most_borrowed_category TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_hour CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  CONSTRAINT valid_day CHECK (day_of_week >= 0 AND day_of_week <= 6)
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date 
  ON daily_analytics_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_category_analytics_popularity 
  ON category_analytics(popularity_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_borrowing_patterns_date 
  ON borrowing_patterns(pattern_date DESC);

CREATE INDEX IF NOT EXISTS idx_borrowing_patterns_time 
  ON borrowing_patterns(day_of_week, hour_of_day);

-- =============================================================================
-- PART 4: Analytics Functions
-- =============================================================================

-- Refresh all materialized views (call this periodically)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY book_usage_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_engagement_metrics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY institution_performance_stats;
  
  RETURN 'Analytics views refreshed successfully';
END;
$$;

-- Generate daily snapshot
CREATE OR REPLACE FUNCTION generate_daily_snapshot(p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id UUID;
  v_top_books JSONB;
  v_top_categories JSONB;
  v_top_institutions JSONB;
BEGIN
  -- Get top 10 books
  SELECT jsonb_agg(row_to_json(t)::jsonb)
  INTO v_top_books
  FROM (
    SELECT b.id AS book_id, b.title, COUNT(br.id) AS borrow_count
    FROM books b
    JOIN borrowing_records br ON b.id = br.book_id
    WHERE DATE(br.borrowed_at) = p_date
    GROUP BY b.id, b.title
    ORDER BY borrow_count DESC
    LIMIT 10
  ) t;
  
  -- Get top categories
  SELECT jsonb_agg(row_to_json(t)::jsonb)
  INTO v_top_categories
  FROM (
    SELECT b.category, COUNT(br.id) AS borrow_count
    FROM books b
    JOIN borrowing_records br ON b.id = br.book_id
    WHERE DATE(br.borrowed_at) = p_date
    GROUP BY b.category
    ORDER BY borrow_count DESC
    LIMIT 10
  ) t;
  
  -- Get top institutions
  SELECT jsonb_agg(row_to_json(t)::jsonb)
  INTO v_top_institutions
  FROM (
    SELECT i.id AS institution_id, i.name, COUNT(br.id) AS borrow_count
    FROM institutions i
    JOIN books b ON i.id = b.institution_id
    JOIN borrowing_records br ON b.id = br.book_id
    WHERE DATE(br.borrowed_at) = p_date
    GROUP BY i.id, i.name
    ORDER BY borrow_count DESC
    LIMIT 10
  ) t;
  
  -- Insert snapshot
  INSERT INTO daily_analytics_snapshots (
    snapshot_date,
    total_users,
    active_users,
    total_books,
    total_borrows,
    active_borrows,
    overdue_borrows,
    new_users_today,
    new_books_today,
    borrows_today,
    returns_today,
    avg_borrows_per_user,
    avg_borrow_duration,
    top_books,
    top_categories,
    top_institutions
  )
  SELECT
    p_date,
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(DISTINCT user_id) FROM borrowing_records WHERE borrowed_at >= NOW() - INTERVAL '30 days'),
    (SELECT COUNT(*) FROM books),
    (SELECT COUNT(*) FROM borrowing_records),
    (SELECT COUNT(*) FROM borrowing_records WHERE status = 'active'),
    (SELECT COUNT(*) FROM borrowing_records WHERE status = 'overdue'),
    (SELECT COUNT(*) FROM auth.users WHERE DATE(created_at) = p_date),
    (SELECT COUNT(*) FROM books WHERE DATE(created_at) = p_date),
    (SELECT COUNT(*) FROM borrowing_records WHERE DATE(borrowed_at) = p_date),
    (SELECT COUNT(*) FROM borrowing_records WHERE DATE(return_date) = p_date),
    (SELECT AVG(borrow_count) FROM (SELECT COUNT(*) AS borrow_count FROM borrowing_records GROUP BY user_id) t),
    (SELECT AVG(EXTRACT(EPOCH FROM (return_date - borrowed_at))/86400) FROM borrowing_records WHERE return_date IS NOT NULL),
    v_top_books,
    v_top_categories,
    v_top_institutions
  ON CONFLICT (snapshot_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    total_books = EXCLUDED.total_books,
    total_borrows = EXCLUDED.total_borrows,
    active_borrows = EXCLUDED.active_borrows,
    overdue_borrows = EXCLUDED.overdue_borrows,
    new_users_today = EXCLUDED.new_users_today,
    new_books_today = EXCLUDED.new_books_today,
    borrows_today = EXCLUDED.borrows_today,
    returns_today = EXCLUDED.returns_today,
    avg_borrows_per_user = EXCLUDED.avg_borrows_per_user,
    avg_borrow_duration = EXCLUDED.avg_borrow_duration,
    top_books = EXCLUDED.top_books,
    top_categories = EXCLUDED.top_categories,
    top_institutions = EXCLUDED.top_institutions
  RETURNING id INTO v_snapshot_id;
  
  RETURN v_snapshot_id;
END;
$$;

-- Update category analytics
CREATE OR REPLACE FUNCTION update_category_analytics()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_category RECORD;
BEGIN
  FOR v_category IN (SELECT DISTINCT category FROM books WHERE category IS NOT NULL)
  LOOP
    INSERT INTO category_analytics (
      category,
      total_books,
      total_borrows,
      active_borrows,
      unique_borrowers,
      borrows_last_30_days,
      avg_borrow_duration,
      popularity_score
    )
    SELECT
      v_category.category,
      COUNT(DISTINCT b.id),
      COUNT(br.id),
      COUNT(br.id) FILTER (WHERE br.status = 'active'),
      COUNT(DISTINCT br.user_id),
      COUNT(br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '30 days'),
      AVG(EXTRACT(EPOCH FROM (br.return_date - br.borrowed_at))/86400) FILTER (WHERE br.return_date IS NOT NULL),
      -- Popularity score: borrows in last 30 days / total books * 100
      (COUNT(br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '30 days')::DECIMAL / NULLIF(COUNT(DISTINCT b.id), 0)) * 100
    FROM books b
    LEFT JOIN borrowing_records br ON b.id = br.book_id
    WHERE b.category = v_category.category
    ON CONFLICT (category) DO UPDATE SET
      total_books = EXCLUDED.total_books,
      total_borrows = EXCLUDED.total_borrows,
      active_borrows = EXCLUDED.active_borrows,
      unique_borrowers = EXCLUDED.unique_borrowers,
      borrows_last_30_days = EXCLUDED.borrows_last_30_days,
      avg_borrow_duration = EXCLUDED.avg_borrow_duration,
      popularity_score = EXCLUDED.popularity_score,
      last_calculated = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Analyze borrowing patterns
CREATE OR REPLACE FUNCTION analyze_borrowing_patterns(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Insert hourly patterns for the day
  INSERT INTO borrowing_patterns (
    pattern_date,
    hour_of_day,
    day_of_week,
    borrow_count,
    return_count,
    avg_duration_hours,
    most_borrowed_category
  )
  SELECT
    p_date,
    EXTRACT(HOUR FROM br.borrowed_at)::INTEGER,
    EXTRACT(DOW FROM br.borrowed_at)::INTEGER,
    COUNT(*) FILTER (WHERE DATE(br.borrowed_at) = p_date),
    COUNT(*) FILTER (WHERE DATE(br.return_date) = p_date),
    AVG(EXTRACT(EPOCH FROM (br.return_date - br.borrowed_at))/3600) FILTER (WHERE br.return_date IS NOT NULL),
    (
      SELECT b.category
      FROM books b
      JOIN borrowing_records br2 ON b.id = br2.book_id
      WHERE DATE(br2.borrowed_at) = p_date 
        AND EXTRACT(HOUR FROM br2.borrowed_at) = EXTRACT(HOUR FROM br.borrowed_at)
      GROUP BY b.category
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  FROM borrowing_records br
  WHERE DATE(br.borrowed_at) = p_date
  GROUP BY EXTRACT(HOUR FROM br.borrowed_at), EXTRACT(DOW FROM br.borrowed_at);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Mark peak hours (top 3 hours with most borrows)
  UPDATE borrowing_patterns
  SET peak_hour = true
  WHERE pattern_date = p_date
    AND hour_of_day IN (
      SELECT hour_of_day
      FROM borrowing_patterns
      WHERE pattern_date = p_date
      ORDER BY borrow_count DESC
      LIMIT 3
    );
  
  RETURN v_count;
END;
$$;

-- Get trending books (most borrowed in last N days)
CREATE OR REPLACE FUNCTION get_trending_books(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  book_id UUID,
  title TEXT,
  author TEXT,
  category TEXT,
  borrow_count BIGINT,
  unique_borrowers BIGINT,
  trend_direction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.author,
    b.category,
    COUNT(br.id) AS borrow_count,
    COUNT(DISTINCT br.user_id) AS unique_borrowers,
    CASE
      WHEN COUNT(br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '7 days') >
           COUNT(br.id) FILTER (WHERE br.borrowed_at >= NOW() - INTERVAL '14 days' AND br.borrowed_at < NOW() - INTERVAL '7 days')
      THEN 'up'
      ELSE 'down'
    END AS trend_direction
  FROM books b
  JOIN borrowing_records br ON b.id = br.book_id
  WHERE br.borrowed_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY b.id, b.title, b.author, b.category
  ORDER BY borrow_count DESC
  LIMIT p_limit;
END;
$$;

-- =============================================================================
-- PART 5: Enable Row Level Security
-- =============================================================================

ALTER TABLE daily_analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrowing_patterns ENABLE ROW LEVEL SECURITY;

-- Super admins can view all analytics
DROP POLICY IF EXISTS "super_admins_view_snapshots" ON daily_analytics_snapshots;
CREATE POLICY "super_admins_view_snapshots" ON daily_analytics_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admins_view_category_analytics" ON category_analytics;
CREATE POLICY "super_admins_view_category_analytics" ON category_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "super_admins_view_patterns" ON borrowing_patterns;
CREATE POLICY "super_admins_view_patterns" ON borrowing_patterns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Advanced Analytics System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Materialized Views created:';
  RAISE NOTICE '   - book_usage_analytics';
  RAISE NOTICE '   - user_engagement_metrics';
  RAISE NOTICE '   - institution_performance_stats';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '   - daily_analytics_snapshots';
  RAISE NOTICE '   - category_analytics';
  RAISE NOTICE '   - borrowing_patterns';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Functions created:';
  RAISE NOTICE '   - refresh_analytics_views()';
  RAISE NOTICE '   - generate_daily_snapshot()';
  RAISE NOTICE '   - update_category_analytics()';
  RAISE NOTICE '   - analyze_borrowing_patterns()';
  RAISE NOTICE '   - get_trending_books()';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Run refresh_analytics_views() periodically to update metrics';
END $$;
