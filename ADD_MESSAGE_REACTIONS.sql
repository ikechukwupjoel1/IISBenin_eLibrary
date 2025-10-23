-- ============================================
-- ADD MESSAGE REACTIONS FEATURE
-- ============================================
-- Adds support for emoji reactions to messages
-- ============================================

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure each user can only add one of each emoji per message
  UNIQUE(message_id, user_id, reaction)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_message_reactions_message 
ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_user 
ON message_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_created 
ON message_reactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reactions in their conversations
CREATE POLICY "Users can view reactions in their conversations"
ON message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Policy: Users can add reactions to messages in their conversations
CREATE POLICY "Users can add reactions to their messages"
ON message_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM messages m
    JOIN conversations c ON m.conversation_id = c.id
    WHERE m.id = message_reactions.message_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

-- Policy: Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
ON message_reactions FOR DELETE
USING (user_id = auth.uid());

-- Verify table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'message_reactions'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'MESSAGE REACTIONS ENABLED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Table Created:';
  RAISE NOTICE '   - message_reactions';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns:';
  RAISE NOTICE '   - id (UUID primary key)';
  RAISE NOTICE '   - message_id (References messages)';
  RAISE NOTICE '   - user_id (References user_profiles)';
  RAISE NOTICE '   - reaction (Emoji text)';
  RAISE NOTICE '   - created_at (Timestamp)';
  RAISE NOTICE '';
  RAISE NOTICE 'Constraint:';
  RAISE NOTICE '   - UNIQUE(message_id, user_id, reaction)';
  RAISE NOTICE '   - One emoji per user per message';
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies:';
  RAISE NOTICE '   - Users can view reactions in their conversations';
  RAISE NOTICE '   - Users can add reactions to conversation messages';
  RAISE NOTICE '   - Users can remove their own reactions';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Ready to add emoji reactions!';
  RAISE NOTICE '====================================================================';
END $$;
