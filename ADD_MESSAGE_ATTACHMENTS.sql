-- ============================================
-- ADD MESSAGE ATTACHMENTS FEATURE
-- ============================================
-- Adds support for file attachments in messages
-- ============================================

-- Add attachment columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_size INTEGER;

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS attachment_type TEXT;

-- Create index for faster attachment queries
CREATE INDEX IF NOT EXISTS idx_messages_has_attachment 
ON messages((attachment_url IS NOT NULL));

-- Verify columns exist
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
AND column_name LIKE 'attachment%'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'MESSAGE ATTACHMENTS ENABLED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Columns Added:';
  RAISE NOTICE '   - attachment_url (File URL in Supabase Storage)';
  RAISE NOTICE '   - attachment_name (Original filename)';
  RAISE NOTICE '   - attachment_size (File size in bytes)';
  RAISE NOTICE '   - attachment_type (MIME type e.g. image/png)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '   1. Create "message-attachments" bucket in Supabase Storage';
  RAISE NOTICE '   2. Set bucket to authenticated access';
  RAISE NOTICE '   3. Configure file size limit (recommend 10MB)';
  RAISE NOTICE '   4. Allow file types: images, PDFs, documents';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
END $$;
