-- Support System Tables
-- This migration adds ticket management and knowledge base functionality

-- =============================================
-- 1. Support Tickets Table
-- =============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT valid_category CHECK (category IN ('technical', 'billing', 'feature_request', 'bug_report', 'general')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_institution ON support_tickets(institution_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- =============================================
-- 2. Ticket Messages Table
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket ON ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created ON ticket_messages(created_at);

-- =============================================
-- 3. Knowledge Base Articles Table
-- =============================================
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  views INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base_articles(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_published ON knowledge_base_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_views ON knowledge_base_articles(views DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base_articles USING GIN(tags);

-- =============================================
-- 4. RLS Policies for Support Tickets
-- =============================================

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

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

-- Users can see their own tickets
CREATE POLICY "users_view_own_tickets" ON support_tickets
  FOR SELECT
  USING (user_id = auth.uid());

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

-- Users can create tickets
CREATE POLICY "users_create_tickets" ON support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

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
-- 5. RLS Policies for Ticket Messages
-- =============================================

-- Users can see messages for tickets they have access to
CREATE POLICY "users_view_ticket_messages" ON ticket_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND (
        support_tickets.user_id = auth.uid()
        OR EXISTS (
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
    )
  );

-- Users can create messages for tickets they have access to
CREATE POLICY "users_create_ticket_messages" ON ticket_messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM support_tickets
      WHERE support_tickets.id = ticket_messages.ticket_id
      AND (
        support_tickets.user_id = auth.uid()
        OR EXISTS (
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
    )
  );

-- =============================================
-- 6. RLS Policies for Knowledge Base
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
-- 7. Functions for Support System
-- =============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating timestamps
DROP TRIGGER IF EXISTS update_support_ticket_timestamp_trigger ON support_tickets;
CREATE TRIGGER update_support_ticket_timestamp_trigger
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_ticket_timestamp();

-- Function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE knowledge_base_articles
  SET views = views + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_article_helpful(article_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE knowledge_base_articles
  SET helpful_count = helpful_count + 1
  WHERE id = article_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. Sample Data (Optional - for testing)
-- =============================================

-- Uncomment to add sample knowledge base articles
/*
INSERT INTO knowledge_base_articles (title, content, category, tags, is_published, created_by)
SELECT 
  'Getting Started with IISBenin eLibrary',
  '# Getting Started\n\nWelcome to IISBenin eLibrary! This guide will help you get started.\n\n## For Students\n1. Login with your enrollment ID and password\n2. Browse available books\n3. Borrow books for your studies\n\n## For Librarians\n1. Manage book inventory\n2. Track borrowing records\n3. Approve book reports',
  'Getting Started',
  ARRAY['setup', 'students', 'librarians'],
  true,
  id
FROM user_profiles 
WHERE role = 'super_admin' 
LIMIT 1;

INSERT INTO knowledge_base_articles (title, content, category, tags, is_published, created_by)
SELECT 
  'How to Borrow a Book',
  '# Borrowing Books\n\nFollow these steps to borrow a book:\n\n1. Navigate to the "Books" or "Borrowing" section\n2. Search for your desired book\n3. Click "Borrow" button\n4. Select return date\n5. Confirm your borrowing\n\n**Note:** You can borrow up to 5 books at a time.',
  'How To',
  ARRAY['borrowing', 'books', 'students'],
  true,
  id
FROM user_profiles 
WHERE role = 'super_admin' 
LIMIT 1;
*/

-- =============================================
-- Success Message
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Support System tables created successfully!';
  RAISE NOTICE '📊 Tables: support_tickets, ticket_messages, knowledge_base_articles';
  RAISE NOTICE '🔒 RLS policies enabled for all tables';
  RAISE NOTICE '⚙️  Helper functions created';
END $$;
