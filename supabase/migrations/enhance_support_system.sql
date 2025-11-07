-- Enhanced Support System with Saved Filters and Additional Indexes
-- This migration adds support for saved filter presets and optimizes queries

-- =============================================================================
-- PART 1: Saved Filter Presets Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS support_ticket_filter_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL, -- Stores filter criteria as JSON
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_preset_name_per_user UNIQUE (user_id, name)
);

-- Indexes for filter presets
CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON support_ticket_filter_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_filter_presets_default ON support_ticket_filter_presets(user_id, is_default) WHERE is_default = true;

-- =============================================================================
-- PART 2: Additional Indexes for Better Query Performance
-- =============================================================================

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_priority 
  ON support_tickets(status, priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_category_status 
  ON support_tickets(category, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status 
  ON support_tickets(assigned_to, status) WHERE assigned_to IS NOT NULL;

-- Full-text search index on title and description
CREATE INDEX IF NOT EXISTS idx_support_tickets_search 
  ON support_tickets USING gin(to_tsvector('english', title || ' ' || description));

-- =============================================================================
-- PART 3: RLS Policies for Filter Presets
-- =============================================================================

ALTER TABLE support_ticket_filter_presets ENABLE ROW LEVEL SECURITY;

-- Users can only view/manage their own filter presets
DROP POLICY IF EXISTS "users_manage_own_presets" ON support_ticket_filter_presets;
CREATE POLICY "users_manage_own_presets" ON support_ticket_filter_presets
  FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- PART 4: Helper Functions
-- =============================================================================

-- Function to search tickets with full-text search
CREATE OR REPLACE FUNCTION search_support_tickets(
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  priority TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.category,
    t.priority,
    t.status,
    t.created_at,
    ts_rank(
      to_tsvector('english', t.title || ' ' || t.description),
      plainto_tsquery('english', p_search_query)
    ) AS rank
  FROM support_tickets t
  WHERE to_tsvector('english', t.title || ' ' || t.description) @@ plainto_tsquery('english', p_search_query)
  ORDER BY rank DESC, created_at DESC
  LIMIT p_limit;
END;
$$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Support System enhancements created successfully!';
  RAISE NOTICE '📋 New features:';
  RAISE NOTICE '   - support_ticket_filter_presets table (save filter combinations)';
  RAISE NOTICE '   - Enhanced indexes for better query performance';
  RAISE NOTICE '   - Full-text search function for tickets';
  RAISE NOTICE '   - Composite indexes for common filter patterns';
END $$;
