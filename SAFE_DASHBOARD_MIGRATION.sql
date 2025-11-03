-- =====================================================
-- SAFE DASHBOARD MIGRATION - IDEMPOTENT VERSION
-- =====================================================
-- This version safely handles already-existing objects
-- Run this instead if you get "already exists" errors
-- =====================================================

-- =====================================================
-- 1. ADMIN ACTIVITY FEED TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop existing constraint if it exists, then recreate
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_activity_type' 
    AND conrelid = 'admin_activity_feed'::regclass
  ) THEN
    ALTER TABLE public.admin_activity_feed DROP CONSTRAINT check_activity_type;
  END IF;
END $$;

-- Add constraint
ALTER TABLE public.admin_activity_feed 
ADD CONSTRAINT check_activity_type CHECK (
  activity_type IN (
    'institution_created',
    'institution_updated',
    'institution_suspended',
    'institution_reactivated',
    'institution_deleted',
    'librarian_invited',
    'librarian_registered',
    'librarian_removed',
    'user_registered',
    'user_suspended',
    'user_reactivated',
    'user_deleted',
    'feature_toggled',
    'book_added',
    'book_removed',
    'bulk_action_executed',
    'payment_received',
    'payment_failed',
    'subscription_changed',
    'impersonation_started',
    'impersonation_ended',
    'system_setting_changed',
    'backup_created',
    'security_alert'
  )
);

-- Indexes (IF NOT EXISTS supported in newer PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON public.admin_activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_feed_type ON public.admin_activity_feed(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_feed_entity ON public.admin_activity_feed(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_institution ON public.admin_activity_feed(institution_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_actor ON public.admin_activity_feed(actor_id);

-- RLS Policies
ALTER TABLE public.admin_activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all activities" ON public.admin_activity_feed;
CREATE POLICY "Super admins can view all activities" ON public.admin_activity_feed
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "System can insert activities" ON public.admin_activity_feed;
CREATE POLICY "System can insert activities" ON public.admin_activity_feed
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 2. SYSTEM METRICS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  dimension JSONB DEFAULT '{}'::jsonb,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Drop and recreate constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_metric_name' 
    AND conrelid = 'system_metrics'::regclass
  ) THEN
    ALTER TABLE public.system_metrics DROP CONSTRAINT check_metric_name;
  END IF;
END $$;

ALTER TABLE public.system_metrics 
ADD CONSTRAINT check_metric_name CHECK (
  metric_name IN (
    'total_institutions',
    'active_institutions',
    'suspended_institutions',
    'total_users',
    'active_users',
    'total_students',
    'total_staff',
    'total_librarians',
    'total_books',
    'total_borrows',
    'active_sessions',
    'storage_used_gb',
    'storage_limit_gb',
    'api_response_time_ms',
    'database_connections',
    'failed_logins',
    'signup_conversions',
    'revenue_usd'
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON public.system_metrics(recorded_at DESC);

-- RLS Policies
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view metrics" ON public.system_metrics;
CREATE POLICY "Super admins can view metrics" ON public.system_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "System can insert metrics" ON public.system_metrics;
CREATE POLICY "System can insert metrics" ON public.system_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 3. ACTIVE SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logout_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, session_token)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_institution ON public.active_sessions(institution_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_active ON public.active_sessions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_active_sessions_last_activity ON public.active_sessions(last_activity_at DESC);

-- RLS Policies
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all sessions" ON public.active_sessions;
CREATE POLICY "Super admins can view all sessions" ON public.active_sessions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Users can manage their own sessions" ON public.active_sessions;
CREATE POLICY "Users can manage their own sessions" ON public.active_sessions
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- 4. STORAGE USAGE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  total_bytes BIGINT NOT NULL DEFAULT 0,
  books_bytes BIGINT NOT NULL DEFAULT 0,
  digital_library_bytes BIGINT NOT NULL DEFAULT 0,
  images_bytes BIGINT NOT NULL DEFAULT 0,
  other_bytes BIGINT NOT NULL DEFAULT 0,
  file_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(institution_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_storage_usage_institution ON public.storage_usage(institution_id);
CREATE INDEX IF NOT EXISTS idx_storage_usage_total ON public.storage_usage(total_bytes DESC);
CREATE INDEX IF NOT EXISTS idx_storage_usage_calculated ON public.storage_usage(last_calculated_at DESC);

-- RLS Policies
ALTER TABLE public.storage_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view all storage" ON public.storage_usage;
CREATE POLICY "Super admins can view all storage" ON public.storage_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Librarians can view own institution storage" ON public.storage_usage;
CREATE POLICY "Librarians can view own institution storage" ON public.storage_usage
  FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT institution_id FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('librarian', 'admin')
    )
  );

-- =====================================================
-- 5. HELPER FUNCTIONS (CREATE OR REPLACE = Safe)
-- =====================================================

CREATE OR REPLACE FUNCTION log_activity(
  p_activity_type TEXT,
  p_description TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_institution_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_activity_id UUID;
  v_actor_name TEXT;
BEGIN
  SELECT full_name INTO v_actor_name
  FROM user_profiles
  WHERE id = auth.uid();

  INSERT INTO admin_activity_feed (
    activity_type,
    description,
    entity_type,
    entity_id,
    actor_id,
    actor_name,
    institution_id,
    metadata
  ) VALUES (
    p_activity_type,
    p_description,
    p_entity_type,
    p_entity_id,
    auth.uid(),
    v_actor_name,
    p_institution_id,
    p_metadata
  )
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION record_metric(
  p_metric_name TEXT,
  p_metric_value NUMERIC,
  p_metric_unit TEXT DEFAULT 'count',
  p_dimension JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id UUID;
BEGIN
  INSERT INTO system_metrics (
    metric_name,
    metric_value,
    metric_unit,
    dimension
  ) VALUES (
    p_metric_name,
    p_metric_value,
    p_metric_unit,
    p_dimension
  )
  RETURNING id INTO v_metric_id;

  RETURN v_metric_id;
END;
$$;

CREATE OR REPLACE FUNCTION start_session(
  p_session_token TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session_id UUID;
  v_institution_id UUID;
BEGIN
  SELECT institution_id INTO v_institution_id
  FROM user_profiles
  WHERE id = auth.uid();

  UPDATE active_sessions
  SET is_active = false, logout_at = NOW()
  WHERE user_id = auth.uid() AND is_active = true;

  INSERT INTO active_sessions (
    user_id,
    institution_id,
    session_token,
    user_agent,
    ip_address
  ) VALUES (
    auth.uid(),
    v_institution_id,
    p_session_token,
    p_user_agent,
    p_ip_address
  )
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_session_activity(
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE active_sessions
  SET last_activity_at = NOW()
  WHERE session_token = p_session_token
    AND user_id = auth.uid()
    AND is_active = true;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION end_session(
  p_session_token TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_session_token IS NULL THEN
    UPDATE active_sessions
    SET is_active = false, logout_at = NOW()
    WHERE user_id = auth.uid() AND is_active = true;
  ELSE
    UPDATE active_sessions
    SET is_active = false, logout_at = NOW()
    WHERE session_token = p_session_token
      AND user_id = auth.uid()
      AND is_active = true;
  END IF;

  RETURN FOUND;
END;
$$;

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
  v_file_count INTEGER := 0;
BEGIN
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
    0,
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
-- 6. DASHBOARD RPC FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS TABLE (
  total_institutions BIGINT,
  active_institutions BIGINT,
  suspended_institutions BIGINT,
  total_users BIGINT,
  total_students BIGINT,
  total_staff BIGINT,
  total_librarians BIGINT,
  total_books BIGINT,
  active_sessions_count BIGINT,
  storage_used_gb NUMERIC,
  storage_limit_gb NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can access dashboard metrics';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM institutions)::BIGINT,
    (SELECT COUNT(*) FROM institutions WHERE is_active = true)::BIGINT,
    (SELECT COUNT(*) FROM institutions WHERE is_active = false)::BIGINT,
    (SELECT COUNT(*) FROM user_profiles)::BIGINT,
    (SELECT COUNT(*) FROM students)::BIGINT,
    (SELECT COUNT(*) FROM staff)::BIGINT,
    (SELECT COUNT(*) FROM user_profiles WHERE role = 'librarian')::BIGINT,
    (SELECT COUNT(*) FROM books)::BIGINT,
    (SELECT COUNT(*) FROM active_sessions 
     WHERE is_active = true 
     AND last_activity_at > NOW() - INTERVAL '30 minutes')::BIGINT,
    (SELECT COALESCE(SUM(total_bytes), 0)::NUMERIC / 1073741824 FROM storage_usage),
    100::NUMERIC;
END;
$$;

CREATE OR REPLACE FUNCTION get_activity_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_activity_types TEXT[] DEFAULT NULL,
  p_institution_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  description TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_name TEXT,
  institution_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can access activity feed';
  END IF;

  RETURN QUERY
  SELECT
    a.id,
    a.activity_type,
    a.description,
    a.entity_type,
    a.entity_id,
    a.actor_name,
    a.institution_id,
    a.metadata,
    a.created_at
  FROM admin_activity_feed a
  WHERE 
    (p_activity_types IS NULL OR a.activity_type = ANY(p_activity_types))
    AND (p_institution_id IS NULL OR a.institution_id = p_institution_id)
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_metric_trend(
  p_metric_name TEXT,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  recorded_at TIMESTAMPTZ,
  metric_value NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can access metric trends';
  END IF;

  RETURN QUERY
  SELECT
    m.recorded_at,
    m.metric_value
  FROM system_metrics m
  WHERE m.metric_name = p_metric_name
    AND m.recorded_at > NOW() - (p_days || ' days')::INTERVAL
  ORDER BY m.recorded_at ASC;
END;
$$;

-- =====================================================
-- 7. AUTOMATIC TRIGGERS (DROP IF EXISTS, THEN CREATE)
-- =====================================================

DROP TRIGGER IF EXISTS log_institution_creation ON institutions;
DROP FUNCTION IF EXISTS trigger_log_institution_creation();

CREATE FUNCTION trigger_log_institution_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM log_activity(
    'institution_created',
    'New institution "' || NEW.name || '" was created',
    'institution',
    NEW.id,
    NEW.id,
    jsonb_build_object('institution_name', NEW.name)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_institution_creation
AFTER INSERT ON institutions
FOR EACH ROW
EXECUTE FUNCTION trigger_log_institution_creation();

-- Institution status change trigger
DROP TRIGGER IF EXISTS log_institution_status_change ON institutions;
DROP FUNCTION IF EXISTS trigger_log_institution_status_change();

CREATE FUNCTION trigger_log_institution_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.is_active <> NEW.is_active THEN
    IF NEW.is_active THEN
      PERFORM log_activity(
        'institution_reactivated',
        'Institution "' || NEW.name || '" was reactivated',
        'institution',
        NEW.id,
        NEW.id,
        jsonb_build_object('institution_name', NEW.name)
      );
    ELSE
      PERFORM log_activity(
        'institution_suspended',
        'Institution "' || NEW.name || '" was suspended',
        'institution',
        NEW.id,
        NEW.id,
        jsonb_build_object('institution_name', NEW.name)
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_institution_status_change
AFTER UPDATE ON institutions
FOR EACH ROW
WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
EXECUTE FUNCTION trigger_log_institution_status_change();

-- Librarian invitation trigger
DROP TRIGGER IF EXISTS log_librarian_invitation ON librarian_invitations;
DROP FUNCTION IF EXISTS trigger_log_librarian_invitation();

CREATE FUNCTION trigger_log_librarian_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_institution_name TEXT;
BEGIN
  SELECT name INTO v_institution_name
  FROM institutions
  WHERE id = NEW.institution_id;

  PERFORM log_activity(
    'librarian_invited',
    'Librarian invited to "' || v_institution_name || '" (' || NEW.email || ')',
    'librarian_invitation',
    NEW.id,
    NEW.institution_id,
    jsonb_build_object(
      'email', NEW.email,
      'institution_name', v_institution_name
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER log_librarian_invitation
AFTER INSERT ON librarian_invitations
FOR EACH ROW
EXECUTE FUNCTION trigger_log_librarian_invitation();

-- =====================================================
-- 8. CLEANUP FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  UPDATE active_sessions
  SET is_active = false, logout_at = NOW()
  WHERE is_active = true
    AND last_activity_at < NOW() - INTERVAL '1 hour';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_old_metrics(
  p_keep_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM system_metrics
  WHERE recorded_at < NOW() - (p_keep_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- =====================================================
-- MIGRATION COMPLETE - SAFE VERSION
-- =====================================================
