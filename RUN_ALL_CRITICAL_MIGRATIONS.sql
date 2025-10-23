-- ============================================
-- CRITICAL DATABASE MIGRATIONS FOR PRODUCTION
-- ============================================
-- Run this entire script in Supabase SQL Editor
-- Estimated execution time: 30 seconds
-- ============================================

BEGIN;

-- ============================================
-- MIGRATION 1: ADD MESSAGE ATTACHMENTS
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '▶ Migration 1/3: Adding message attachments support...';
END $$;

-- Add attachment columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS attachment_name TEXT,
ADD COLUMN IF NOT EXISTS attachment_size INTEGER,
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Create index for faster attachment queries
CREATE INDEX IF NOT EXISTS idx_messages_has_attachment 
ON messages((attachment_url IS NOT NULL));

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 1/3: Message attachments columns added';
END $$;

-- ============================================
-- MIGRATION 2: CREATE MESSAGE REACTIONS TABLE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '▶ Migration 2/3: Creating message reactions table...';
END $$;

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view reactions in their conversations" ON message_reactions;
DROP POLICY IF EXISTS "Users can add reactions to their messages" ON message_reactions;
DROP POLICY IF EXISTS "Users can remove their own reactions" ON message_reactions;

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

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 2/3: Message reactions table created with RLS policies';
END $$;

-- ============================================
-- MIGRATION 3: FIX BOOKS TABLE FOR BULK UPLOAD
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '▶ Migration 3/3: Updating books table for bulk upload support...';
END $$;

-- Add columns for physical book inventory
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publisher TEXT,
ADD COLUMN IF NOT EXISTS publication_year INTEGER,
ADD COLUMN IF NOT EXISTS pages INTEGER,
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Update existing records
UPDATE books 
SET available_quantity = COALESCE(quantity, 1)
WHERE available_quantity IS NULL;

UPDATE books 
SET quantity = 1
WHERE quantity IS NULL;

-- Add constraint to ensure available_quantity never exceeds quantity
DO $constraint$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_available_quantity'
  ) THEN
    ALTER TABLE books 
    ADD CONSTRAINT check_available_quantity 
    CHECK (available_quantity >= 0 AND available_quantity <= quantity);
  END IF;
END $constraint$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_books_quantity ON books(quantity);
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_material_type ON books(material_type);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 3/3: Books table updated successfully';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
DECLARE
  attachment_count INTEGER;
  reactions_exists BOOLEAN;
  books_column_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '====================================================================';
  
  -- Check message attachments
  SELECT COUNT(*) INTO attachment_count
  FROM information_schema.columns 
  WHERE table_name = 'messages' AND column_name LIKE 'attachment%';
  
  RAISE NOTICE '✓ Message attachment columns: % (expected: 4)', attachment_count;
  
  -- Check reactions table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'message_reactions'
  ) INTO reactions_exists;
  
  RAISE NOTICE '✓ Message reactions table exists: %', reactions_exists;
  
  -- Check books columns
  SELECT COUNT(*) INTO books_column_count
  FROM information_schema.columns 
  WHERE table_name = 'books' 
  AND column_name IN ('publisher', 'publication_year', 'pages', 'quantity', 'available_quantity', 'location', 'description');
  
  RAISE NOTICE '✓ Books table new columns: % (expected: 7)', books_column_count;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  
  IF attachment_count = 4 AND reactions_exists AND books_column_count = 7 THEN
    RAISE NOTICE '🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Create "message-attachments" bucket in Supabase Storage';
    RAISE NOTICE '2. Test file upload in ChatMessaging component';
    RAISE NOTICE '3. Test emoji reactions';
    RAISE NOTICE '4. Test bulk book upload';
  ELSE
    RAISE WARNING '⚠️  Some migrations may have failed. Review output above.';
  END IF;
  
  RAISE NOTICE '====================================================================';
END $$;
