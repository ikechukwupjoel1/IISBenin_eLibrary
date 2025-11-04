-- =====================================================
-- ENHANCED DASHBOARD MIGRATION - PART 1
-- =====================================================
-- Adds advanced metrics and monitoring functions
-- Run this AFTER SAFE_DASHBOARD_MIGRATION.sql
-- =====================================================

-- =====================================================
-- SYSTEM HEALTH MONITORING
-- =====================================================

-- Function: Get comprehensive system health status
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  db_size BIGINT;
  active_connections INT;
  avg_response_time NUMERIC;
  error_count INT;
  storage_total BIGINT;
  storage_used BIGINT;
BEGIN
  -- Get database size
  SELECT pg_database_size(current_database()) INTO db_size;
  
  -- Get active connections
  SELECT count(*) INTO active_connections
  FROM pg_stat_activity
  WHERE state = 'active';
  
  -- Calculate average response time from recent metrics
  SELECT AVG(metric_value) INTO avg_response_time
  FROM system_metrics
  WHERE metric_name = 'api_response_time'
    AND recorded_at > NOW() - INTERVAL '5 minutes';
  
  -- Count errors in last hour
  SELECT COUNT(*) INTO error_count
  FROM admin_activity_feed
  WHERE activity_type LIKE '%error%'
    AND created_at > NOW() - INTERVAL '1 hour';
  
  -- Get storage usage
  SELECT 
    SUM(total_bytes),
    SUM(books_bytes + digital_library_bytes + images_bytes + other_bytes)
  INTO storage_total, storage_used
  FROM storage_usage;
  
  -- Build health status JSON
  result := json_build_object(
    'status', CASE 
      WHEN active_connections > 100 THEN 'warning'
      WHEN error_count > 10 THEN 'warning'
      WHEN (storage_used::FLOAT / NULLIF(storage_total, 0)) > 0.9 THEN 'warning'
      ELSE 'healthy'
    END,
    'database', json_build_object(
      'size_bytes', db_size,
      'size_mb', ROUND(db_size / 1024.0 / 1024.0, 2),
      'status', CASE WHEN db_size > 10737418240 THEN 'warning' ELSE 'healthy' END
    ),
    'connections', json_build_object(
      'active', active_connections,
      'status', CASE WHEN active_connections > 100 THEN 'warning' ELSE 'healthy' END
    ),
    'performance', json_build_object(
      'avg_response_time_ms', COALESCE(avg_response_time, 0),
      'status', CASE 
        WHEN avg_response_time > 1000 THEN 'critical'
        WHEN avg_response_time > 500 THEN 'warning'
        ELSE 'healthy'
      END
    ),
    'errors', json_build_object(
      'last_hour', error_count,
      'status', CASE WHEN error_count > 10 THEN 'warning' ELSE 'healthy' END
    ),
    'storage', json_build_object(
      'total_bytes', COALESCE(storage_total, 0),
      'used_bytes', COALESCE(storage_used, 0),
      'used_percentage', ROUND((COALESCE(storage_used, 0)::FLOAT / NULLIF(storage_total, 0)) * 100, 2),
      'status', CASE 
        WHEN (storage_used::FLOAT / NULLIF(storage_total, 0)) > 0.9 THEN 'critical'
        WHEN (storage_used::FLOAT / NULLIF(storage_total, 0)) > 0.8 THEN 'warning'
        ELSE 'healthy'
      END
    ),
    'last_checked', NOW()
  );
  
  RETURN result;
END;
$$;

-- Function: Get performance metrics with trends
CREATE OR REPLACE FUNCTION get_performance_metrics(
  time_range INTERVAL DEFAULT '24 hours'
)
RETURNS TABLE (
  metric_name TEXT,
  current_value NUMERIC,
  avg_value NUMERIC,
  min_value NUMERIC,
  max_value NUMERIC,
  trend TEXT,
  data_points JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH metric_stats AS (
    SELECT 
      sm.metric_name,
      sm.metric_value as current_value,
      AVG(sm.metric_value) OVER (PARTITION BY sm.metric_name) as avg_value,
      MIN(sm.metric_value) OVER (PARTITION BY sm.metric_name) as min_value,
      MAX(sm.metric_value) OVER (PARTITION BY sm.metric_name) as max_value,
      ROW_NUMBER() OVER (PARTITION BY sm.metric_name ORDER BY sm.recorded_at DESC) as rn
    FROM system_metrics sm
    WHERE sm.recorded_at > NOW() - time_range
  ),
  trend_calc AS (
    SELECT 
      ms.metric_name,
      ms.current_value,
      ms.avg_value,
      ms.min_value,
      ms.max_value,
      CASE 
        WHEN ms.current_value > ms.avg_value * 1.1 THEN 'increasing'
        WHEN ms.current_value < ms.avg_value * 0.9 THEN 'decreasing'
        ELSE 'stable'
      END as trend
    FROM metric_stats ms
    WHERE ms.rn = 1
  ),
  data_points_agg AS (
    SELECT 
      sm.metric_name,
      json_agg(
        json_build_object(
          'timestamp', sm.recorded_at,
          'value', sm.metric_value
        ) ORDER BY sm.recorded_at
      ) as data_points
    FROM system_metrics sm
    WHERE sm.recorded_at > NOW() - time_range
    GROUP BY sm.metric_name
  )
  SELECT 
    tc.metric_name::TEXT,
    tc.current_value,
    tc.avg_value,
    tc.min_value,
    tc.max_value,
    tc.trend::TEXT,
    COALESCE(dp.data_points, '[]'::JSON)
  FROM trend_calc tc
  LEFT JOIN data_points_agg dp ON tc.metric_name = dp.metric_name;
END;
$$;

-- Function: Get storage alerts
CREATE OR REPLACE FUNCTION get_storage_alerts()
RETURNS TABLE (
  institution_id UUID,
  institution_name TEXT,
  alert_type TEXT,
  alert_level TEXT,
  message TEXT,
  used_bytes BIGINT,
  total_bytes BIGINT,
  used_percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    su.institution_id,
    i.name as institution_name,
    'storage' as alert_type,
    CASE 
      WHEN (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0) > 0.95 THEN 'critical'
      WHEN (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0) > 0.85 THEN 'warning'
      ELSE 'info'
    END as alert_level,
    CASE 
      WHEN (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0) > 0.95 THEN 
        'Storage critically low - immediate action required'
      WHEN (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0) > 0.85 THEN 
        'Storage usage high - consider cleanup'
      ELSE 
        'Storage usage normal'
    END as message,
    (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes) as used_bytes,
    su.total_bytes,
    ROUND(((su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0)) * 100, 2) as used_percentage
  FROM storage_usage su
  JOIN institutions i ON su.institution_id = i.id
  WHERE su.total_bytes > 0
    AND (su.books_bytes + su.digital_library_bytes + su.images_bytes + su.other_bytes)::FLOAT / NULLIF(su.total_bytes, 0) > 0.75
  ORDER BY used_percentage DESC;
END;
$$;

-- Function: Get trend analysis
CREATE OR REPLACE FUNCTION get_trend_analysis(
  days_back INTEGER DEFAULT 30
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  institutions_trend JSON;
  users_trend JSON;
  books_trend JSON;
  borrows_trend JSON;
BEGIN
  -- Analyze institution growth
  WITH institution_daily AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM institutions
    WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date
  )
  SELECT json_agg(json_build_object('date', date, 'count', count))
  INTO institutions_trend
  FROM institution_daily;
  
  -- Analyze user growth
  WITH user_daily AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM user_profiles
    WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date
  )
  SELECT json_agg(json_build_object('date', date, 'count', count))
  INTO users_trend
  FROM user_daily;
  
  -- Analyze book additions
  WITH book_daily AS (
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as count
    FROM books
    WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(created_at)
    ORDER BY date
  )
  SELECT json_agg(json_build_object('date', date, 'count', count))
  INTO books_trend
  FROM book_daily;
  
  -- Analyze borrow trends
  WITH borrow_daily AS (
    SELECT 
      DATE(borrowed_at) as date,
      COUNT(*) as count
    FROM borrows
    WHERE borrowed_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY DATE(borrowed_at)
    ORDER BY date
  )
  SELECT json_agg(json_build_object('date', date, 'count', count))
  INTO borrows_trend
  FROM borrow_daily;
  
  result := json_build_object(
    'period_days', days_back,
    'institutions', COALESCE(institutions_trend, '[]'::JSON),
    'users', COALESCE(users_trend, '[]'::JSON),
    'books', COALESCE(books_trend, '[]'::JSON),
    'borrows', COALESCE(borrows_trend, '[]'::JSON),
    'generated_at', NOW()
  );
  
  RETURN result;
END;
$$;

-- =====================================================
-- RLS POLICIES FOR NEW FUNCTIONS
-- =====================================================

-- Grant execute permissions to super admins
GRANT EXECUTE ON FUNCTION get_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics(INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION get_storage_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_trend_analysis(INTEGER) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test system health
SELECT get_system_health();

-- Test performance metrics
SELECT * FROM get_performance_metrics('24 hours');

-- Test storage alerts
SELECT * FROM get_storage_alerts();

-- Test trend analysis
SELECT get_trend_analysis(7);

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Enhanced Dashboard Migration Part 1 Complete!';
  RAISE NOTICE 'Added 4 new monitoring functions:';
  RAISE NOTICE '  - get_system_health()';
  RAISE NOTICE '  - get_performance_metrics()';
  RAISE NOTICE '  - get_storage_alerts()';
  RAISE NOTICE '  - get_trend_analysis()';
END $$;
