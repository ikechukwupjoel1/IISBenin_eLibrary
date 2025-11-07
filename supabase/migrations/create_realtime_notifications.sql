-- Real-time Notification System
-- This migration creates infrastructure for real-time notifications using Supabase Realtime

-- =============================================================================
-- PART 1: Notification Preferences Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Email notifications
  email_new_tickets BOOLEAN DEFAULT true,
  email_ticket_updates BOOLEAN DEFAULT true,
  email_broadcasts BOOLEAN DEFAULT true,
  email_quality_flags BOOLEAN DEFAULT false,
  
  -- In-app notifications
  inapp_new_tickets BOOLEAN DEFAULT true,
  inapp_ticket_updates BOOLEAN DEFAULT true,
  inapp_broadcasts BOOLEAN DEFAULT true,
  inapp_quality_flags BOOLEAN DEFAULT true,
  inapp_system_alerts BOOLEAN DEFAULT true,
  
  -- Sound/Desktop notifications
  sound_enabled BOOLEAN DEFAULT true,
  desktop_enabled BOOLEAN DEFAULT false,
  
  -- Notification frequency
  digest_frequency TEXT DEFAULT 'instant', -- instant, hourly, daily, weekly
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_digest_frequency CHECK (digest_frequency IN ('instant', 'hourly', 'daily', 'weekly', 'never'))
);

-- =============================================================================
-- PART 2: User Notifications Table (In-App Notifications)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Notification details
  type TEXT NOT NULL, -- 'ticket', 'broadcast', 'quality_flag', 'system', 'mention'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related resource
  resource_type TEXT, -- 'support_ticket', 'broadcast_announcement', 'book_quality_flag'
  resource_id UUID,
  
  -- Metadata
  data JSONB, -- Additional data (link, actions, etc.)
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  
  -- Priority
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Optional expiration
  
  CONSTRAINT valid_notification_type CHECK (type IN ('ticket', 'broadcast', 'quality_flag', 'system', 'mention', 'assignment', 'update')),
  CONSTRAINT valid_notification_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- =============================================================================
-- PART 3: Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread 
  ON user_notifications(user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created 
  ON user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_type 
  ON user_notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_resource 
  ON user_notifications(resource_type, resource_id) WHERE resource_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_notifications_expires 
  ON user_notifications(expires_at) WHERE expires_at IS NOT NULL;

-- =============================================================================
-- PART 4: Enable Row Level Security
-- =============================================================================

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own notification preferences
DROP POLICY IF EXISTS "users_manage_own_preferences" ON notification_preferences;
CREATE POLICY "users_manage_own_preferences" ON notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Users can only view their own notifications
DROP POLICY IF EXISTS "users_view_own_notifications" ON user_notifications;
CREATE POLICY "users_view_own_notifications" ON user_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- System can create notifications for any user
DROP POLICY IF EXISTS "system_create_notifications" ON user_notifications;
CREATE POLICY "system_create_notifications" ON user_notifications
  FOR INSERT WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "users_update_own_notifications" ON user_notifications;
CREATE POLICY "users_update_own_notifications" ON user_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "users_delete_own_notifications" ON user_notifications;
CREATE POLICY "users_delete_own_notifications" ON user_notifications
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================================================
-- PART 5: Helper Functions
-- =============================================================================

-- Function to create notification for user(s)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_ids UUID[],
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_data JSONB DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_count INTEGER := 0;
  v_pref RECORD;
  v_should_notify BOOLEAN;
BEGIN
  -- Loop through each user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
    -- Check user's notification preferences
    SELECT * INTO v_pref
    FROM notification_preferences
    WHERE user_id = v_user_id;
    
    -- If no preferences exist, create default ones
    IF v_pref IS NULL THEN
      INSERT INTO notification_preferences (user_id)
      VALUES (v_user_id)
      RETURNING * INTO v_pref;
    END IF;
    
    -- Check if user wants this type of notification
    v_should_notify := CASE p_type
      WHEN 'ticket' THEN v_pref.inapp_new_tickets
      WHEN 'update' THEN v_pref.inapp_ticket_updates
      WHEN 'broadcast' THEN v_pref.inapp_broadcasts
      WHEN 'quality_flag' THEN v_pref.inapp_quality_flags
      WHEN 'system' THEN v_pref.inapp_system_alerts
      ELSE true
    END;
    
    -- Create notification if user wants it
    IF v_should_notify THEN
      INSERT INTO user_notifications (
        user_id,
        type,
        title,
        message,
        resource_type,
        resource_id,
        data,
        priority
      ) VALUES (
        v_user_id,
        p_type,
        p_title,
        p_message,
        p_resource_type,
        p_resource_id,
        p_data,
        p_priority
      );
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_read(
  p_notification_ids UUID[]
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(p_notification_ids)
    AND user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE user_notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Function to clean up old read notifications (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM user_notifications
  WHERE is_read = true
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Delete expired notifications
  DELETE FROM user_notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  
  RETURN v_count;
END;
$$;

-- =============================================================================
-- PART 6: Triggers for Automatic Notifications
-- =============================================================================

-- Trigger to notify when a ticket is assigned
CREATE OR REPLACE FUNCTION notify_ticket_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If ticket is assigned to someone
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    PERFORM create_notification(
      ARRAY[NEW.assigned_to],
      'assignment',
      'New Ticket Assigned',
      format('You have been assigned ticket: %s', NEW.title),
      'support_ticket',
      NEW.id,
      jsonb_build_object('ticket_id', NEW.id, 'priority', NEW.priority),
      NEW.priority
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_ticket_assignment ON support_tickets;
CREATE TRIGGER trigger_notify_ticket_assignment
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_assignment();

-- Trigger to notify when ticket status changes
CREATE OR REPLACE FUNCTION notify_ticket_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If status changed
  IF OLD.status != NEW.status THEN
    -- Notify the ticket creator
    PERFORM create_notification(
      ARRAY[NEW.user_id],
      'update',
      'Ticket Status Updated',
      format('Your ticket "%s" status changed to: %s', NEW.title, NEW.status),
      'support_ticket',
      NEW.id,
      jsonb_build_object('ticket_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status),
      'normal'
    );
    
    -- If assigned, also notify the assignee
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.user_id THEN
      PERFORM create_notification(
        ARRAY[NEW.assigned_to],
        'update',
        'Assigned Ticket Updated',
        format('Ticket "%s" status changed to: %s', NEW.title, NEW.status),
        'support_ticket',
        NEW.id,
        jsonb_build_object('ticket_id', NEW.id, 'status', NEW.status),
        'normal'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_ticket_status ON support_tickets;
CREATE TRIGGER trigger_notify_ticket_status
  AFTER UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_status_change();

-- =============================================================================
-- SUCCESS MESSAGE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Real-time Notification System created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '   - notification_preferences (user notification settings)';
  RAISE NOTICE '   - user_notifications (in-app notifications)';
  RAISE NOTICE '';
  RAISE NOTICE '⚙️ Functions created:';
  RAISE NOTICE '   - create_notification() - Create notifications for users';
  RAISE NOTICE '   - mark_notifications_read() - Mark specific notifications as read';
  RAISE NOTICE '   - mark_all_notifications_read() - Mark all notifications as read';
  RAISE NOTICE '   - cleanup_old_notifications() - Clean up old notifications';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Triggers created:';
  RAISE NOTICE '   - Auto-notify on ticket assignment';
  RAISE NOTICE '   - Auto-notify on ticket status change';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS policies: 5 policies created';
END $$;
