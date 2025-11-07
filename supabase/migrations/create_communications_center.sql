-- Create tables for Communications Center Module

-- 1. Broadcast Announcements Table (extends announcements for global/multi-institution)
CREATE TABLE IF NOT EXISTS broadcast_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  broadcast_type TEXT NOT NULL, -- 'global', 'multi_institution', 'single_institution'
  target_institutions UUID[], -- Array of institution IDs for multi-institution broadcasts
  target_audience TEXT DEFAULT 'all', -- 'all', 'librarians', 'staff', 'students'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  scheduled_for TIMESTAMPTZ, -- Schedule for later sending
  published_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- draft, scheduled, published, archived
  view_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_broadcast_type CHECK (broadcast_type IN ('global', 'multi_institution', 'single_institution')),
  CONSTRAINT valid_target_audience CHECK (target_audience IN ('all', 'librarians', 'staff', 'students')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'published', 'archived'))
);

-- 2. Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  html_content TEXT,
  plain_text_content TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  recipient_type TEXT NOT NULL, -- 'all_users', 'librarians', 'staff', 'students', 'institution', 'custom'
  recipient_institutions UUID[], -- Array of institution IDs
  custom_recipient_ids UUID[], -- Array of specific user IDs
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  clicked_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_recipient_type CHECK (recipient_type IN ('all_users', 'librarians', 'staff', 'students', 'institution', 'custom')),
  CONSTRAINT valid_campaign_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled'))
);

-- 3. Email Templates Table
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

-- 4. Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
  title TEXT,
  message TEXT NOT NULL,
  data JSONB, -- Additional payload
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- pending, sending, sent, failed
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (notification_type IN ('email', 'sms', 'push', 'in_app')),
  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled'))
);

-- 5. Announcement Views Table (tracking)
CREATE TABLE IF NOT EXISTS announcement_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES broadcast_announcements(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(announcement_id, user_id)
);

-- 6. Email Campaign Tracking Table
CREATE TABLE IF NOT EXISTS email_campaign_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES email_campaigns(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained'
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'))
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_broadcast_announcements_status ON broadcast_announcements(status);
CREATE INDEX IF NOT EXISTS idx_broadcast_announcements_scheduled ON broadcast_announcements(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_broadcast_announcements_published ON broadcast_announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcast_announcements_creator ON broadcast_announcements(created_by);

CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_scheduled ON email_campaigns(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent ON email_campaigns(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_system ON email_templates(is_system);

CREATE INDEX IF NOT EXISTS idx_notification_queue_user_id ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(notification_type);

CREATE INDEX IF NOT EXISTS idx_announcement_views_announcement ON announcement_views(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_views_user ON announcement_views(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_events_campaign ON email_campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_type ON email_campaign_events(event_type);

-- Enable RLS
ALTER TABLE broadcast_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Broadcast Announcements
DROP POLICY IF EXISTS "super_admins_manage_broadcasts" ON broadcast_announcements;
CREATE POLICY "super_admins_manage_broadcasts" ON broadcast_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "users_view_published_broadcasts" ON broadcast_announcements;
CREATE POLICY "users_view_published_broadcasts" ON broadcast_announcements
  FOR SELECT USING (
    status = 'published'
    AND published_at <= NOW()
    AND (
      broadcast_type = 'global'
      OR
      (broadcast_type = 'multi_institution' AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = ANY(target_institutions)
      ))
      OR
      (broadcast_type = 'single_institution' AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND user_profiles.institution_id = ANY(target_institutions)
      ))
    )
  );

-- RLS Policies for Email Campaigns
DROP POLICY IF EXISTS "super_admins_manage_campaigns" ON email_campaigns;
CREATE POLICY "super_admins_manage_campaigns" ON email_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

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

-- RLS Policies for Notification Queue
DROP POLICY IF EXISTS "users_view_own_notifications" ON notification_queue;
CREATE POLICY "users_view_own_notifications" ON notification_queue
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "super_admins_manage_notifications" ON notification_queue;
CREATE POLICY "super_admins_manage_notifications" ON notification_queue
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for Announcement Views
DROP POLICY IF EXISTS "users_manage_own_views" ON announcement_views;
CREATE POLICY "users_manage_own_views" ON announcement_views
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "super_admins_view_all_tracking" ON announcement_views;
CREATE POLICY "super_admins_view_all_tracking" ON announcement_views
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- RLS Policies for Campaign Events
DROP POLICY IF EXISTS "super_admins_view_campaign_events" ON email_campaign_events;
CREATE POLICY "super_admins_view_campaign_events" ON email_campaign_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Helper Functions

-- Function to create broadcast announcement
CREATE OR REPLACE FUNCTION create_broadcast_announcement(
  p_title TEXT,
  p_message TEXT,
  p_broadcast_type TEXT,
  p_target_institutions UUID[],
  p_target_audience TEXT,
  p_priority TEXT,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_announcement_id UUID;
  v_status TEXT;
BEGIN
  -- Determine status
  IF p_scheduled_for IS NOT NULL AND p_scheduled_for > NOW() THEN
    v_status := 'scheduled';
  ELSE
    v_status := 'published';
  END IF;
  
  -- Create broadcast announcement
  INSERT INTO broadcast_announcements (
    title,
    message,
    created_by,
    broadcast_type,
    target_institutions,
    target_audience,
    priority,
    scheduled_for,
    published_at,
    status
  ) VALUES (
    p_title,
    p_message,
    auth.uid(),
    p_broadcast_type,
    p_target_institutions,
    p_target_audience,
    p_priority,
    p_scheduled_for,
    CASE WHEN v_status = 'published' THEN NOW() ELSE NULL END,
    v_status
  ) RETURNING id INTO v_announcement_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    auth.uid(),
    NULL,
    'create',
    'broadcast_announcement',
    v_announcement_id::TEXT,
    format('Created %s broadcast: %s', p_broadcast_type, p_title),
    jsonb_build_object(
      'broadcast_type', p_broadcast_type,
      'target_audience', p_target_audience,
      'priority', p_priority,
      'status', v_status
    ),
    NULL,
    NULL,
    'success'
  );
  
  RETURN v_announcement_id;
END;
$$;

-- Function to track announcement view
CREATE OR REPLACE FUNCTION track_announcement_view(
  p_announcement_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert view record (ignore if already exists)
  INSERT INTO announcement_views (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
  
  -- Update view count
  UPDATE broadcast_announcements
  SET view_count = view_count + 1
  WHERE id = p_announcement_id;
END;
$$;

-- Function to process variable substitution in templates
CREATE OR REPLACE FUNCTION process_template_variables(
  p_template TEXT,
  p_user_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result TEXT;
  v_user_name TEXT;
  v_institution_name TEXT;
BEGIN
  -- Get user details
  SELECT 
    up.full_name,
    i.name
  INTO v_user_name, v_institution_name
  FROM user_profiles up
  LEFT JOIN institutions i ON i.id = up.institution_id
  WHERE up.id = p_user_id;
  
  -- Replace variables
  v_result := p_template;
  v_result := REPLACE(v_result, '{{user_name}}', COALESCE(v_user_name, 'User'));
  v_result := REPLACE(v_result, '{{institution_name}}', COALESCE(v_institution_name, 'Institution'));
  v_result := REPLACE(v_result, '{{current_date}}', TO_CHAR(NOW(), 'YYYY-MM-DD'));
  
  RETURN v_result;
END;
$$;

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

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Communications Center created successfully!';
  RAISE NOTICE '📊 Tables created:';
  RAISE NOTICE '   - broadcast_announcements (Global/multi-institution announcements)';
  RAISE NOTICE '   - email_campaigns (Email campaign management)';
  RAISE NOTICE '   - email_templates (Reusable email templates with variables)';
  RAISE NOTICE '   - notification_queue (Multi-channel notifications)';
  RAISE NOTICE '   - announcement_views (View tracking)';
  RAISE NOTICE '   - email_campaign_events (Campaign analytics)';
  RAISE NOTICE '🔒 RLS policies: 10+ policies created';
  RAISE NOTICE '⚙️ Helper functions:';
  RAISE NOTICE '   - create_broadcast_announcement()';
  RAISE NOTICE '   - track_announcement_view()';
  RAISE NOTICE '   - process_template_variables()';
  RAISE NOTICE '📧 3 system email templates created';
END $$;
