-- Create tables for Security & Compliance Module (GDPR/CCPA)

-- 1. Data Export Requests Table
CREATE TABLE IF NOT EXISTS data_export_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'full_export', 'specific_data'
  data_categories TEXT[] DEFAULT ARRAY['profile', 'activity', 'content', 'communications'], -- What data to export
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  download_url TEXT, -- Signed URL for download
  expires_at TIMESTAMPTZ, -- When download link expires
  file_size_bytes BIGINT,
  error_message TEXT,
  metadata JSONB,
  
  CONSTRAINT valid_request_type CHECK (request_type IN ('full_export', 'specific_data')),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired'))
);

-- 2. Account Deletion Requests Table (GDPR Right to be Forgotten)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_deletion_date TIMESTAMPTZ, -- When account will be deleted (30 days grace period)
  status TEXT DEFAULT 'pending', -- pending, approved, processing, completed, cancelled
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  retention_data JSONB, -- Data kept for legal reasons
  metadata JSONB,
  
  CONSTRAINT valid_deletion_status CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'cancelled'))
);

-- 3. Privacy Policy Acceptance Table
CREATE TABLE IF NOT EXISTS privacy_policy_acceptances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  policy_version TEXT NOT NULL,
  policy_type TEXT DEFAULT 'privacy_policy', -- privacy_policy, terms_of_service, cookie_policy
  accepted_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  
  CONSTRAINT valid_policy_type CHECK (policy_type IN ('privacy_policy', 'terms_of_service', 'cookie_policy', 'data_processing'))
);

-- 4. Consent Management Table (GDPR Consent Tracking)
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL, -- marketing_emails, analytics, third_party_sharing, etc.
  granted BOOLEAN DEFAULT false,
  granted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address INET,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_consent_type CHECK (consent_type IN (
    'marketing_emails', 'analytics', 'third_party_sharing', 
    'personalization', 'notifications', 'data_retention'
  )),
  UNIQUE(user_id, consent_type)
);

-- 5. Data Retention Policies Table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- user_profiles, activity_logs, borrowing_history, etc.
  retention_period_days INTEGER NOT NULL,
  auto_delete BOOLEAN DEFAULT false,
  legal_hold BOOLEAN DEFAULT false, -- Prevent deletion for legal reasons
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_data_type CHECK (data_type IN (
    'user_profiles', 'activity_logs', 'borrowing_history', 
    'reading_progress', 'communications', 'support_tickets',
    'audit_logs', 'deleted_accounts'
  )),
  UNIQUE(institution_id, data_type)
);

-- 6. Password Policies Table
CREATE TABLE IF NOT EXISTS password_policies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  min_length INTEGER DEFAULT 8,
  require_uppercase BOOLEAN DEFAULT true,
  require_lowercase BOOLEAN DEFAULT true,
  require_numbers BOOLEAN DEFAULT true,
  require_special_chars BOOLEAN DEFAULT true,
  max_age_days INTEGER, -- Force password change after X days
  prevent_reuse_count INTEGER DEFAULT 5, -- Prevent reusing last N passwords
  lockout_attempts INTEGER DEFAULT 5, -- Lock account after X failed attempts
  lockout_duration_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(institution_id)
);

-- 7. Password History Table (prevent reuse)
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  password_hash TEXT NOT NULL, -- Encrypted password hash
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_data_export_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requested_at ON data_export_requests(requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_deletion_user_id ON account_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_account_deletion_status ON account_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_account_deletion_scheduled ON account_deletion_requests(scheduled_deletion_date);

CREATE INDEX IF NOT EXISTS idx_privacy_policy_user_id ON privacy_policy_acceptances(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_policy_version ON privacy_policy_acceptances(policy_version);

CREATE INDEX IF NOT EXISTS idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_consents_type ON user_consents(consent_type);

CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at DESC);

-- Enable RLS
ALTER TABLE data_export_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_policy_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Data Export Requests
CREATE POLICY "users_view_own_export_requests" ON data_export_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_export_requests" ON data_export_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super_admins_view_all_export_requests" ON data_export_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for Account Deletion Requests
CREATE POLICY "users_view_own_deletion_requests" ON account_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_deletion_requests" ON account_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super_admins_manage_deletion_requests" ON account_deletion_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for Privacy Policy Acceptances
CREATE POLICY "users_view_own_acceptances" ON privacy_policy_acceptances
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_create_acceptances" ON privacy_policy_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "super_admins_view_all_acceptances" ON privacy_policy_acceptances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for User Consents
CREATE POLICY "users_manage_own_consents" ON user_consents
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "super_admins_view_all_consents" ON user_consents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for Data Retention Policies
CREATE POLICY "super_admins_manage_retention_policies" ON data_retention_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "librarians_view_institution_retention" ON data_retention_policies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = data_retention_policies.institution_id
    )
  );

-- RLS Policies for Password Policies
CREATE POLICY "super_admins_manage_password_policies" ON password_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "librarians_manage_institution_password_policy" ON password_policies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = password_policies.institution_id
    )
  );

-- RLS Policies for Password History
CREATE POLICY "system_manage_password_history" ON password_history
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Helper Functions

-- Function to request data export
CREATE OR REPLACE FUNCTION request_data_export(
  p_request_type TEXT,
  p_data_categories TEXT[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_institution_id UUID;
BEGIN
  -- Get user's institution
  SELECT institution_id INTO v_institution_id
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Create export request
  INSERT INTO data_export_requests (
    user_id,
    institution_id,
    request_type,
    data_categories,
    status
  ) VALUES (
    auth.uid(),
    v_institution_id,
    p_request_type,
    p_data_categories,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    v_institution_id,
    'export',
    'data_export_request',
    v_request_id::TEXT,
    'User requested data export',
    jsonb_build_object('request_type', p_request_type, 'categories', p_data_categories),
    NULL,
    NULL,
    'success'
  );
  
  RETURN v_request_id;
END;
$$;

-- Function to request account deletion
CREATE OR REPLACE FUNCTION request_account_deletion(
  p_reason TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_id UUID;
  v_institution_id UUID;
  v_scheduled_date TIMESTAMPTZ;
BEGIN
  -- Get user's institution
  SELECT institution_id INTO v_institution_id
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Schedule deletion 30 days from now
  v_scheduled_date := NOW() + INTERVAL '30 days';
  
  -- Create deletion request
  INSERT INTO account_deletion_requests (
    user_id,
    institution_id,
    reason,
    scheduled_deletion_date,
    status
  ) VALUES (
    auth.uid(),
    v_institution_id,
    p_reason,
    v_scheduled_date,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    v_institution_id,
    'delete',
    'account_deletion_request',
    v_request_id::TEXT,
    'User requested account deletion',
    jsonb_build_object('reason', p_reason, 'scheduled_date', v_scheduled_date),
    NULL,
    NULL,
    'success'
  );
  
  RETURN v_request_id;
END;
$$;

-- Function to update consent
CREATE OR REPLACE FUNCTION update_user_consent(
  p_consent_type TEXT,
  p_granted BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_consent_id UUID;
  v_institution_id UUID;
BEGIN
  -- Get user's institution
  SELECT institution_id INTO v_institution_id
  FROM user_profiles
  WHERE id = auth.uid();
  
  -- Insert or update consent
  INSERT INTO user_consents (
    user_id,
    institution_id,
    consent_type,
    granted,
    granted_at,
    revoked_at
  ) VALUES (
    auth.uid(),
    v_institution_id,
    p_consent_type,
    p_granted,
    CASE WHEN p_granted THEN NOW() ELSE NULL END,
    CASE WHEN NOT p_granted THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, consent_type) 
  DO UPDATE SET
    granted = p_granted,
    granted_at = CASE WHEN p_granted THEN NOW() ELSE user_consents.granted_at END,
    revoked_at = CASE WHEN NOT p_granted THEN NOW() ELSE NULL END,
    updated_at = NOW()
  RETURNING id INTO v_consent_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    v_institution_id,
    'update',
    'user_consent',
    v_consent_id::TEXT,
    format('User %s consent for %s', CASE WHEN p_granted THEN 'granted' ELSE 'revoked' END, p_consent_type),
    jsonb_build_object('consent_type', p_consent_type, 'granted', p_granted),
    NULL,
    NULL,
    'success'
  );
  
  RETURN v_consent_id;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Security & Compliance system created successfully!';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - data_export_requests (GDPR data portability)';
  RAISE NOTICE '   - account_deletion_requests (Right to be forgotten)';
  RAISE NOTICE '   - privacy_policy_acceptances';
  RAISE NOTICE '   - user_consents (Consent management)';
  RAISE NOTICE '   - data_retention_policies';
  RAISE NOTICE '   - password_policies';
  RAISE NOTICE '   - password_history';
  RAISE NOTICE '🔒 RLS policies: 15+ policies created';
  RAISE NOTICE '⚙️ Helper functions:';
  RAISE NOTICE '   - request_data_export()';
  RAISE NOTICE '   - request_account_deletion()';
  RAISE NOTICE '   - update_user_consent()';
END $$;
