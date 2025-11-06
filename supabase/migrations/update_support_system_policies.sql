-- Support System Update Script
-- Use this if tables already exist or to update existing installation

-- =============================================
-- 1. Drop existing policies if they exist
-- =============================================

-- Drop support_tickets policies
DROP POLICY IF EXISTS "super_admins_view_all_tickets" ON support_tickets;
DROP POLICY IF EXISTS "librarians_view_institution_tickets" ON support_tickets;
DROP POLICY IF EXISTS "users_view_own_tickets" ON support_tickets;
DROP POLICY IF EXISTS "librarians_super_admins_create_tickets" ON support_tickets;
DROP POLICY IF EXISTS "users_create_tickets" ON support_tickets;
DROP POLICY IF EXISTS "super_admins_update_tickets" ON support_tickets;
DROP POLICY IF EXISTS "librarians_update_institution_tickets" ON support_tickets;

-- Drop ticket_messages policies
DROP POLICY IF EXISTS "librarians_super_admins_view_ticket_messages" ON ticket_messages;
DROP POLICY IF EXISTS "users_view_ticket_messages" ON ticket_messages;
DROP POLICY IF EXISTS "librarians_super_admins_create_ticket_messages" ON ticket_messages;
DROP POLICY IF EXISTS "users_create_ticket_messages" ON ticket_messages;

-- Drop knowledge_base_articles policies
DROP POLICY IF EXISTS "everyone_view_published_articles" ON knowledge_base_articles;
DROP POLICY IF EXISTS "super_admins_view_all_articles" ON knowledge_base_articles;
DROP POLICY IF EXISTS "super_admins_create_articles" ON knowledge_base_articles;
DROP POLICY IF EXISTS "super_admins_update_articles" ON knowledge_base_articles;
DROP POLICY IF EXISTS "super_admins_delete_articles" ON knowledge_base_articles;

-- =============================================
-- 2. Recreate RLS Policies for Support Tickets
-- =============================================

-- Super admins can see all tickets
CREATE POLICY "super_admins_view_all_tickets" ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Librarians can see tickets from their institution
CREATE POLICY "librarians_view_institution_tickets" ON support_tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = support_tickets.institution_id
    )
  );

-- Only librarians and super admins can create tickets
CREATE POLICY "librarians_super_admins_create_tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('librarian', 'super_admin')
    )
  );

-- Super admins can update all tickets
CREATE POLICY "super_admins_update_tickets" ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Librarians can update tickets from their institution
CREATE POLICY "librarians_update_institution_tickets" ON support_tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = support_tickets.institution_id
    )
  );

-- =============================================
-- 3. Recreate RLS Policies for Ticket Messages
-- =============================================

-- Librarians and super admins can see messages for tickets they have access to
CREATE POLICY "librarians_super_admins_view_ticket_messages" ON ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = auth.uid()
        AND (
          user_profiles.role = 'super_admin'
          OR (
            user_profiles.role = 'librarian'
            AND user_profiles.institution_id = support_tickets.institution_id
          )
        )
      )
    )
  );

-- Librarians and super admins can create messages for tickets they have access to
CREATE POLICY "librarians_super_admins_create_ticket_messages" ON ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('librarian', 'super_admin')
    )
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND (
        EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
          AND up.role = 'super_admin'
        )
        OR EXISTS (
          SELECT 1 FROM user_profiles up
          WHERE up.id = auth.uid()
          AND up.role = 'librarian'
          AND up.institution_id = support_tickets.institution_id
        )
      )
    )
  );

-- =============================================
-- 4. Recreate RLS Policies for Knowledge Base
-- =============================================

-- Everyone can view published articles
CREATE POLICY "everyone_view_published_articles" ON knowledge_base_articles
  FOR SELECT
  USING (is_published = true);

-- Super admins can view all articles
CREATE POLICY "super_admins_view_all_articles" ON knowledge_base_articles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can create articles
CREATE POLICY "super_admins_create_articles" ON knowledge_base_articles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can update articles
CREATE POLICY "super_admins_update_articles" ON knowledge_base_articles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can delete articles
CREATE POLICY "super_admins_delete_articles" ON knowledge_base_articles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Support System policies updated successfully!';
  RAISE NOTICE '🔒 All RLS policies recreated';
  RAISE NOTICE '🎫 Ticket creation restricted to librarians and super admins';
  RAISE NOTICE '📚 Knowledge base accessible to everyone';
END $$;
