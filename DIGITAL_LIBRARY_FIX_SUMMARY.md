# Digital Library & Login Logs - Fix Summary

## Issues Fixed

### 1. Digital Library Not Showing Books
**Problem**: The code was looking for columns that don't exist in the books table:
- `author_publisher` (should be `author`)
- `material_type` (column doesn't exist)
- `class_specific` (column doesn't exist)

**Solution**: Updated DigitalLibrary.tsx to:
- Use `author` instead of `author_publisher`
- Filter digital materials by category containing "ebook", "electronic", or "digital"
- Get file URLs from storage bucket using book ID

### 2. Login Logs Not Showing
**Problem**: The LoginLogs component expects a `user_id` column in `login_logs` table to join with `user_profiles`, but it might be missing.

**Solution**: Created SQL script to add `user_id` column and RLS policies.

---

## Required SQL Fixes

### Step 1: Run this SQL in Supabase SQL Editor

**File: `fix_login_logs_table.sql`**

This script will:
1. Check if `user_id` column exists in `login_logs` table
2. Add it if missing (with foreign key to `user_profiles`)
3. Try to populate existing records by matching enrollment_id with student_id/staff_id
4. Create RLS policies to allow librarians to view all logs
5. Allow anyone to insert login logs (for tracking during login)

```sql
-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'login_logs' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE login_logs ADD COLUMN user_id UUID REFERENCES user_profiles(id);
        
        -- Try to populate user_id from enrollment_id for existing records
        -- This matches students first
        UPDATE login_logs ll
        SET user_id = up.id
        FROM user_profiles up
        WHERE ll.user_id IS NULL
        AND up.student_id = ll.enrollment_id
        AND up.role = 'student';
        
        -- Then match staff
        UPDATE login_logs ll
        SET user_id = up.id
        FROM user_profiles up
        INNER JOIN staff s ON up.staff_id = s.id
        WHERE ll.user_id IS NULL
        AND s.staff_id = ll.enrollment_id
        AND up.role = 'staff';
        
        RAISE NOTICE 'user_id column added to login_logs table';
    ELSE
        RAISE NOTICE 'user_id column already exists in login_logs table';
    END IF;
END $$;

-- Enable RLS if not enabled
ALTER TABLE login_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for login_logs
DROP POLICY IF EXISTS "Librarians can view all login logs" ON login_logs;
DROP POLICY IF EXISTS "Anyone can insert login logs" ON login_logs;

-- Allow librarians to view all login logs
CREATE POLICY "Librarians can view all login logs"
ON login_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'librarian'
  )
);

-- Allow unauthenticated users to insert login logs (for login tracking)
CREATE POLICY "Anyone can insert login logs"
ON login_logs
FOR INSERT
USING (true)
WITH CHECK (true);
```

---

## Testing

### Digital Library
1. Log in as librarian
2. Add a book with category containing "ebook" or "electronic" (e.g., "Science eBook")
3. Upload a PDF file when adding the book
4. Navigate to "Digital Library" tab
5. You should see the book displayed
6. Click "Read eBook" to access it

### Login Logs
1. Log in as librarian
2. Navigate to "Login Logs" tab
3. You should now see all login attempts from students and staff
4. Each log entry should show:
   - User's full name
   - Enrollment ID
   - Role (student/staff)
   - Login time
   - Success/Failed status

---

## What Changed in Code

### DigitalLibrary.tsx
- ✅ Changed type definition: `author_publisher` → `author`
- ✅ Query now filters by category instead of material_type
- ✅ Simplified material detection based on category text
- ✅ File access uses storage bucket with book ID
- ✅ Removed class-specific filtering (column doesn't exist)

### Deployment
- ✅ Code built successfully
- ✅ Deployed to: https://iisbeninelibrary-pvllgietz-joel-prince-a-ikechukwus-projects.vercel.app

---

## Next Steps

1. **Run the SQL script** `fix_login_logs_table.sql` in Supabase SQL Editor
2. **Add some test books** with categories like:
   - "Science eBook"
   - "Math Electronic Material"
   - "History Digital Book"
3. **Upload PDF files** when adding these books
4. **Test Digital Library** to verify books appear
5. **Test Login Logs** to verify login history is visible

---

## Storage Bucket Configuration (Already Done)

The ebooks storage bucket should already have these RLS policies:
- ✅ Librarians can upload (INSERT)
- ✅ Public can view (SELECT)
- ✅ Librarians can update (UPDATE)
- ✅ Librarians can delete (DELETE)

If uploads still fail, verify these policies exist in:
Supabase Dashboard → Storage → ebooks bucket → Policies
