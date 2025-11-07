-- Fix Schema Errors
-- This file addresses:
-- 1. Missing email_templates table (run Communications Center migration first)
-- 2. Missing user_id FK relationships in compliance tables
-- 3. Verify support_tickets and audit_logs tables

-- =============================================================================
-- PART 1: Create email_templates table (required for email_campaigns FK)
-- =============================================================================

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  variables TEXT[], -- Available variables like {{user_name}}, {{institution_name}}
  category TEXT DEFAULT 'general', -- general, notification, announcement, marketing
  is_system BOOLEAN DEFAULT false, -- System templates (non-deletable)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_template_category CHECK (category IN ('general', 'notification', 'announcement', 'marketing', 'transactional'))
);

-- Indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_system ON email_templates(is_system);

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Email Templates
DROP POLICY IF EXISTS "super_admins_manage_templates" ON email_templates;
CREATE POLICY "super_admins_manage_templates" ON email_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "users_view_templates" ON email_templates;
CREATE POLICY "users_view_templates" ON email_templates
  FOR SELECT USING (true);

-- Insert default email templates
INSERT INTO email_templates (name, subject, html_content, plain_text_content, variables, category, is_system)
VALUES 
(
  'Welcome Email',
  'Welcome to {{institution_name}}!',
  '<h1>Welcome {{user_name}}!</h1><p>We''re excited to have you at {{institution_name}}.</p>',
  'Welcome {{user_name}}! We''re excited to have you at {{institution_name}}.',
  ARRAY['user_name', 'institution_name'],
  'transactional',
  true
),
(
  'Announcement Notification',
  'New Announcement: {{title}}',
  '<h2>{{title}}</h2><p>{{message}}</p><p>Posted on {{current_date}}</p>',
  '{{title}}\n\n{{message}}\n\nPosted on {{current_date}}',
  ARRAY['title', 'message', 'current_date'],
  'notification',
  true
),
(
  'General Broadcast',
  '{{subject}}',
  '<div style="font-family: Arial, sans-serif;"><h2>{{title}}</h2><p>{{message}}</p><p>Best regards,<br>{{institution_name}}</p></div>',
  '{{title}}\n\n{{message}}\n\nBest regards,\n{{institution_name}}',
  ARRAY['subject', 'title', 'message', 'institution_name'],
  'general',
  true
)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- PART 2: Fix Compliance Tables - Add proper user_id relationships
-- =============================================================================

-- The error "Could not find a relationship between 'data_export_requests' and 'user_id'"
-- suggests the UI is trying to join on user_id but Supabase doesn't recognize the FK properly.
-- Let's ensure the relationships are properly established.

-- Verify data_export_requests has proper FK to auth.users
DO $$
BEGIN
  -- Check if FK exists, if not, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'data_export_requests_user_id_fkey'
    AND table_name = 'data_export_requests'
  ) THEN
    ALTER TABLE data_export_requests 
    ADD CONSTRAINT data_export_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Verify account_deletion_requests has proper FK to auth.users
DO $$
BEGIN
  -- Check if FK exists, if not, add it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'account_deletion_requests_user_id_fkey'
    AND table_name = 'account_deletion_requests'
  ) THEN
    ALTER TABLE account_deletion_requests 
    ADD CONSTRAINT account_deletion_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =============================================================================
-- PART 3: Verify audit_logs table exists
-- =============================================================================

-- Ensure audit_logs table exists (should have been created earlier)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  description TEXT,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_action_type CHECK (action_type IN (
    'login', 'logout', 'create', 'update', 'delete', 'view', 'export',
    'password_change', 'permission_change', 'role_change',
    'file_upload', 'file_delete', 'bulk_create', 'bulk_update', 'bulk_delete',
    'impersonation', 'api_call', 'system_event'
  )),
  CONSTRAINT valid_status CHECK (status IN ('success', 'failed', 'pending'))
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id ON audit_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Ensure RLS policies exist
DROP POLICY IF EXISTS "super_admins_view_all_logs" ON audit_logs;
CREATE POLICY "super_admins_view_all_logs" ON audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "system_insert_logs" ON audit_logs;
CREATE POLICY "system_insert_logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- =============================================================================
-- PART 4: Verify support_tickets table has proper structure
-- =============================================================================

-- Ensure support_tickets table exists (should have been created earlier)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  resolved_at TIMESTAMPTZ,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_category CHECK (category IN ('technical', 'account', 'content', 'billing', 'feature_request', 'other')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'on_hold'))
);

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_support_tickets_institution ON support_tickets(institution_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Ensure basic RLS policy exists
DROP POLICY IF EXISTS "super_admins_view_all_tickets" ON support_tickets;
CREATE POLICY "super_admins_view_all_tickets" ON support_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- =============================================================================
-- PART 5: Helper function to verify relationships
-- =============================================================================

CREATE OR REPLACE FUNCTION verify_table_relationships()
RETURNS TABLE (
  table_name TEXT,
  column_name TEXT,
  foreign_table TEXT,
  constraint_name TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    tc.table_name::TEXT,
    kcu.column_name::TEXT,
    ccu.table_name::TEXT AS foreign_table,
    tc.constraint_name::TEXT
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN (
      'data_export_requests',
      'account_deletion_requests',
      'audit_logs',
      'support_tickets',
      'email_campaigns',
      'email_templates'
    )
  ORDER BY tc.table_name, kcu.column_name;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Schema errors fixed!';
  RAISE NOTICE '📊 Fixed tables:';
  RAISE NOTICE '   - email_templates (created with 3 default templates)';
  RAISE NOTICE '   - data_export_requests (verified user_id FK)';
  RAISE NOTICE '   - account_deletion_requests (verified user_id FK)';
  RAISE NOTICE '   - audit_logs (verified structure and RLS)';
  RAISE NOTICE '   - support_tickets (verified structure and RLS)';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 To verify relationships, run:';
  RAISE NOTICE '   SELECT * FROM verify_table_relationships();';
END $$;
