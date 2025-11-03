-- =====================================================
-- EXTENSIBLE ACTIVITY TYPE SYSTEM
-- =====================================================
-- This guide shows how to add new activity types to
-- the admin activity feed system
-- =====================================================

-- =====================================================
-- CURRENT ACTIVITY TYPES (24)
-- =====================================================
/*
INSTITUTIONS (5):
- institution_created
- institution_updated
- institution_suspended
- institution_reactivated
- institution_deleted

USERS (4):
- user_registered
- user_suspended
- user_reactivated
- user_deleted

LIBRARIANS (3):
- librarian_invited
- librarian_registered
- librarian_removed

BOOKS (2):
- book_added
- book_removed

SYSTEM (3):
- feature_toggled
- bulk_action_executed
- system_setting_changed

FINANCE (3):
- payment_received
- payment_failed
- subscription_changed

SECURITY (4):
- impersonation_started
- impersonation_ended
- backup_created
- security_alert
*/

-- =====================================================
-- HOW TO ADD NEW ACTIVITY TYPES
-- =====================================================

-- STEP 1: Update the CHECK constraint on admin_activity_feed
-- Add your new activity types to the list

ALTER TABLE public.admin_activity_feed 
DROP CONSTRAINT IF EXISTS check_activity_type;

ALTER TABLE public.admin_activity_feed 
ADD CONSTRAINT check_activity_type CHECK (
  activity_type IN (
    -- INSTITUTIONS
    'institution_created',
    'institution_updated',
    'institution_suspended',
    'institution_reactivated',
    'institution_deleted',
    
    -- LIBRARIANS
    'librarian_invited',
    'librarian_registered',
    'librarian_removed',
    
    -- USERS
    'user_registered',
    'user_suspended',
    'user_reactivated',
    'user_deleted',
    
    -- BOOKS
    'book_added',
    'book_removed',
    'book_updated',           -- NEW: Track book edits
    'book_borrowed',          -- NEW: Track borrowing
    'book_returned',          -- NEW: Track returns
    'book_reserved',          -- NEW: Track reservations
    
    -- DIGITAL LIBRARY
    'digital_content_uploaded',    -- NEW: Digital content
    'digital_content_downloaded',  -- NEW: Downloads
    'digital_content_viewed',      -- NEW: Views
    
    -- FEATURES
    'feature_toggled',
    'feature_enabled',        -- NEW: More specific
    'feature_disabled',       -- NEW: More specific
    
    -- BULK ACTIONS
    'bulk_action_executed',
    'bulk_user_import',       -- NEW: User imports
    'bulk_book_import',       -- NEW: Book imports
    'bulk_email_sent',        -- NEW: Email campaigns
    
    -- PAYMENTS
    'payment_received',
    'payment_failed',
    'subscription_changed',
    'subscription_expired',   -- NEW: Expiration tracking
    'subscription_renewed',   -- NEW: Renewal tracking
    
    -- SECURITY
    'impersonation_started',
    'impersonation_ended',
    'backup_created',
    'security_alert',
    'password_reset',         -- NEW: Password resets
    'login_failed',           -- NEW: Failed login attempts
    'account_locked',         -- NEW: Account lockouts
    
    -- SYSTEM
    'system_setting_changed',
    'system_maintenance',     -- NEW: Maintenance mode
    'system_upgrade',         -- NEW: System upgrades
    'api_key_generated',      -- NEW: API keys
    'api_key_revoked',        -- NEW: API key revocation
    
    -- REPORTS
    'report_generated',       -- NEW: Report generation
    'report_exported',        -- NEW: Report exports
    'report_scheduled',       -- NEW: Scheduled reports
    
    -- NOTIFICATIONS
    'notification_sent',      -- NEW: Notifications
    'email_sent',             -- NEW: Emails
    'sms_sent'                -- NEW: SMS
  )
);

-- =====================================================
-- EXAMPLE: ADDING BOOK BORROWING TRACKING
-- =====================================================

-- Create a trigger function for book borrows
CREATE OR REPLACE FUNCTION trigger_log_book_borrow()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_book_title TEXT;
  v_user_name TEXT;
  v_institution_id UUID;
BEGIN
  -- Get book details
  SELECT title, institution_id INTO v_book_title, v_institution_id
  FROM books
  WHERE id = NEW.book_id;
  
  -- Get user details
  SELECT full_name INTO v_user_name
  FROM user_profiles
  WHERE id = NEW.user_id;
  
  -- Log the activity
  PERFORM log_activity(
    'book_borrowed',
    '"' || v_book_title || '" borrowed by ' || v_user_name,
    'borrow',
    NEW.id,
    v_institution_id,
    jsonb_build_object(
      'book_id', NEW.book_id,
      'book_title', v_book_title,
      'user_id', NEW.user_id,
      'user_name', v_user_name,
      'due_date', NEW.due_date
    )
  );
  
  RETURN NEW;
END;
$$;

-- Attach the trigger to borrows table
CREATE TRIGGER log_book_borrow
AFTER INSERT ON borrows
FOR EACH ROW
EXECUTE FUNCTION trigger_log_book_borrow();

-- =====================================================
-- EXAMPLE: ADDING DIGITAL CONTENT TRACKING
-- =====================================================

-- Manual logging when content is downloaded
-- Call this from your Edge Function or API
CREATE OR REPLACE FUNCTION log_digital_content_download(
  p_content_id UUID,
  p_content_title TEXT,
  p_user_id UUID,
  p_institution_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_name TEXT;
  v_activity_id UUID;
BEGIN
  -- Get user name
  SELECT full_name INTO v_user_name
  FROM user_profiles
  WHERE id = p_user_id;
  
  -- Log the activity
  SELECT log_activity(
    'digital_content_downloaded',
    '"' || p_content_title || '" downloaded by ' || v_user_name,
    'digital_content',
    p_content_id,
    p_institution_id,
    jsonb_build_object(
      'content_id', p_content_id,
      'user_id', p_user_id,
      'user_name', v_user_name
    )
  ) INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

-- =====================================================
-- EXAMPLE: ADDING SECURITY EVENT TRACKING
-- =====================================================

-- Track failed login attempts
CREATE OR REPLACE FUNCTION log_failed_login(
  p_identifier TEXT,
  p_role TEXT,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN log_activity(
    'login_failed',
    'Failed login attempt for ' || p_role || ': ' || p_identifier,
    'security',
    NULL,
    NULL,
    jsonb_build_object(
      'identifier', p_identifier,
      'role', p_role,
      'ip_address', p_ip_address,
      'timestamp', NOW()
    )
  );
END;
$$;

-- =====================================================
-- EXAMPLE: ADDING BULK ACTION TRACKING
-- =====================================================

-- Track bulk user imports
CREATE OR REPLACE FUNCTION log_bulk_user_import(
  p_institution_id UUID,
  p_user_count INTEGER,
  p_success_count INTEGER,
  p_failure_count INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_institution_name TEXT;
BEGIN
  SELECT name INTO v_institution_name
  FROM institutions
  WHERE id = p_institution_id;
  
  RETURN log_activity(
    'bulk_user_import',
    'Bulk user import for "' || v_institution_name || '": ' || 
    p_success_count || ' succeeded, ' || p_failure_count || ' failed',
    'bulk_action',
    NULL,
    p_institution_id,
    jsonb_build_object(
      'total_users', p_user_count,
      'success_count', p_success_count,
      'failure_count', p_failure_count
    )
  );
END;
$$;

-- =====================================================
-- FRONTEND: UPDATE ACTIVITYFEED COMPONENT
-- =====================================================

/*
After adding database activity types, update the frontend:

File: src/components/SuperAdmin/Dashboard/ActivityFeed.tsx

1. Update the ActivityItem type to include new types:

interface ActivityItem {
  id: string;
  type: 
    | 'institution_created'
    | 'book_borrowed'        // ADD NEW TYPES
    | 'book_returned'
    | 'digital_content_uploaded'
    // ... etc
}

2. Add icons and colors in getActivityIcon():

case 'book_borrowed':
  return { icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' };
case 'book_returned':
  return { icon: BookCheck, color: 'text-green-600', bg: 'bg-green-50' };
case 'digital_content_uploaded':
  return { icon: Upload, color: 'text-purple-600', bg: 'bg-purple-50' };

3. Import any new icons from lucide-react:

import { BookOpen, BookCheck, Upload } from 'lucide-react';
*/

-- =====================================================
-- TESTING NEW ACTIVITY TYPES
-- =====================================================

-- Test logging a new activity type
SELECT log_activity(
  'book_borrowed',
  'Test book borrowed',
  'book',
  gen_random_uuid(),
  gen_random_uuid(),
  '{"test": true}'::jsonb
);

-- Verify it appears in activity feed
SELECT * FROM get_activity_feed(10, 0);

-- Verify specific activity type
SELECT * FROM admin_activity_feed
WHERE activity_type = 'book_borrowed'
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- BEST PRACTICES
-- =====================================================

/*
1. NAMING CONVENTIONS:
   - Use past tense: 'book_borrowed' not 'book_borrow'
   - Use underscores: 'user_registered' not 'userRegistered'
   - Be specific: 'feature_enabled' vs 'feature_toggled'
   - Group logically: institution_*, user_*, book_*

2. METADATA STRUCTURE:
   - Always include relevant IDs (user_id, book_id, etc.)
   - Include human-readable names
   - Add contextual info (timestamps, counts, etc.)
   - Keep it flat when possible (easy to query)
   
   Example:
   {
     "book_id": "uuid",
     "book_title": "Book Name",
     "user_id": "uuid",
     "user_name": "John Doe",
     "due_date": "2025-12-01"
   }

3. DESCRIPTION FORMAT:
   - Start with the action: "Book borrowed..."
   - Include key entities: "by John Doe"
   - Add important details: "due on Dec 1"
   - Keep it concise but informative
   
   Examples:
   - "Book 'Clean Code' borrowed by John Doe (due Dec 1)"
   - "Institution 'ABC School' suspended by Admin"
   - "5 users imported successfully, 2 failed"

4. ENTITY_TYPE:
   - Use consistent values: 'book', 'user', 'institution'
   - Match your database tables when possible
   - Use for filtering and grouping
   - Keep it singular: 'book' not 'books'

5. PERFORMANCE:
   - Add indexes for frequently filtered fields
   - Consider async logging for high-volume events
   - Batch log similar activities when possible
   - Archive old logs periodically

6. SECURITY:
   - Don't log sensitive data (passwords, tokens)
   - Use SECURITY DEFINER carefully
   - Implement RLS policies
   - Log security events for audit trails
*/

-- =====================================================
-- ACTIVITY TYPE CATEGORIES
-- =====================================================

-- Query activities by category pattern
CREATE OR REPLACE FUNCTION get_activities_by_category(
  p_category TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.activity_type,
    a.description,
    a.created_at
  FROM admin_activity_feed a
  WHERE a.activity_type LIKE p_category || '_%'
  ORDER BY a.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Usage examples:
-- SELECT * FROM get_activities_by_category('book');      -- All book activities
-- SELECT * FROM get_activities_by_category('user');      -- All user activities
-- SELECT * FROM get_activities_by_category('security');  -- All security activities

-- =====================================================
-- ACTIVITY STATISTICS
-- =====================================================

-- Get activity type counts
CREATE OR REPLACE FUNCTION get_activity_stats(
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH activity_counts AS (
    SELECT 
      a.activity_type,
      COUNT(*) as cnt
    FROM admin_activity_feed a
    WHERE a.created_at > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY a.activity_type
  ),
  total AS (
    SELECT SUM(cnt) as total_count FROM activity_counts
  )
  SELECT 
    ac.activity_type,
    ac.cnt,
    ROUND((ac.cnt::NUMERIC / t.total_count * 100), 2)
  FROM activity_counts ac
  CROSS JOIN total t
  ORDER BY ac.cnt DESC;
END;
$$;

-- =====================================================
-- QUICK REFERENCE: ADDING A NEW ACTIVITY TYPE
-- =====================================================

/*
CHECKLIST:
□ 1. Add to CHECK constraint (ALTER TABLE statement above)
□ 2. Create trigger function if auto-logging
□ 3. Create manual log function if needed
□ 4. Test logging works
□ 5. Update frontend ActivityItem type
□ 6. Add icon mapping in getActivityIcon()
□ 7. Import new icons if needed
□ 8. Test frontend displays correctly
□ 9. Update documentation
□ 10. Deploy changes

EXAMPLE WORKFLOW:

-- 1. Add to constraint
ALTER TABLE admin_activity_feed ADD CONSTRAINT ... 'your_new_type' ...

-- 2. Create log function
CREATE FUNCTION log_your_new_activity(...) ...

-- 3. Test
SELECT log_your_new_activity(...);
SELECT * FROM get_activity_feed(5, 0);

-- 4. Update frontend
// Add to type union
| 'your_new_type'

// Add to switch
case 'your_new_type':
  return { icon: YourIcon, color: 'text-blue-600', bg: 'bg-blue-50' };

-- 5. Build and deploy
npm run build
git add . && git commit && git push
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================
