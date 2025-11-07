# Profile Picture Upload Troubleshooting Guide

## 🔍 Issue: Profile pictures not uploading

### Quick Diagnostics

Run these steps in order to identify the issue:

---

## Step 1: Check if Migration Was Run

**Run this in Supabase SQL Editor:**
```sql
-- Check if avatar_url column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' AND column_name = 'avatar_url';
```

**Expected Result:** Should return one row showing `avatar_url | text`

**If NO rows returned:**
- ❌ Migration hasn't been run
- ✅ **Solution:** Run `supabase/migrations/add_avatar_support.sql` in Supabase SQL Editor

---

## Step 2: Check if Storage Bucket Exists

**Run this in Supabase SQL Editor:**
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE id = 'avatars';
```

**Expected Result:** Should return `avatars | avatars | true`

**If NO rows returned:**
- ❌ Avatars bucket doesn't exist
- ✅ **Solution:** Run `add_avatar_support.sql` migration

**If bucket exists but `public = false`:**
- ❌ Bucket is private
- ✅ **Solution:** Run this:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
```

---

## Step 3: Check Storage Policies

**Run this in Supabase SQL Editor:**
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage';
```

**Expected Result:** Should show 4 policies:
- `Public Access` (SELECT)
- `Users can upload own avatar` (INSERT)
- `Users can update own avatar` (UPDATE)
- `Users can delete own avatar` (DELETE)

**If policies are missing:**
- ✅ **Solution:** Run `add_avatar_support.sql` migration

---

## Step 4: Check Browser Console

1. Open your app in the browser
2. Press `F12` to open Developer Tools
3. Go to the **Console** tab
4. Try to upload a profile picture
5. Look for errors

### Common Console Errors:

#### Error 1: "new row violates row-level security policy"
**Cause:** RLS policies not set up correctly

**Solution:**
```sql
-- Run in Supabase SQL Editor
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

#### Error 2: "Storage: Bucket not found"
**Cause:** Avatars bucket doesn't exist

**Solution:** Run `add_avatar_support.sql`

#### Error 3: "413 Payload Too Large"
**Cause:** File size exceeds limit

**Solution:** Check file size (max 2MB in current code)

#### Error 4: "Invalid JWT"
**Cause:** User not authenticated

**Solution:** Make sure user is logged in

---

## Step 5: Check Network Tab

1. Open Developer Tools (`F12`)
2. Go to **Network** tab
3. Try uploading avatar
4. Look for failed requests

### What to check:
- Upload request to `/storage/v1/object/avatars/...`
- Status code (should be 200)
- Response body (check for errors)

### Common Network Errors:

#### Status 400: Bad Request
Check the request payload - might be sending wrong bucket name

#### Status 401: Unauthorized
User session expired or not authenticated

#### Status 403: Forbidden
RLS policy blocking the upload

#### Status 404: Bucket not found
Avatars bucket doesn't exist

---

## Step 6: Verify Storage Configuration in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Storage** (left sidebar)
3. Check if `avatars` bucket appears
4. If it doesn't exist, create it manually:
   - Click "New bucket"
   - Name: `avatars`
   - Check "Public bucket"
   - Click "Create bucket"

5. If bucket exists, check policies:
   - Click on `avatars` bucket
   - Go to "Policies" tab
   - Verify 4 policies exist

---

## Step 7: Test with SQL

**Try uploading programmatically:**

```sql
-- Check if you can insert into storage.objects
-- (This requires knowing your user ID)

-- First, get your user ID
SELECT auth.uid();

-- Then try to insert a test record
-- Note: You typically don't insert directly, but this tests permissions
```

---

## Complete Fix Script

If nothing else works, run this complete fix:

```sql
-- ===================================
-- COMPLETE AVATAR UPLOAD FIX
-- ===================================

-- 1. Add avatar_url column
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Delete existing avatars bucket (if corrupted)
DELETE FROM storage.buckets WHERE id = 'avatars';

-- 3. Create fresh avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);

-- 4. Drop all existing avatar policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- 5. Create new policies
CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Verify setup
SELECT 'Bucket created' as status, id, public FROM storage.buckets WHERE id = 'avatars';
SELECT 'Column added' as status FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'avatar_url';
SELECT 'Policy: ' || policyname as policies FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname ILIKE '%avatar%';
```

---

## Alternative: Create Bucket Manually

If SQL doesn't work, use Supabase Dashboard:

1. **Go to Storage section**
2. **Click "Create a new bucket"**
3. **Settings:**
   - Name: `avatars`
   - ✅ Public bucket
   - File size limit: 2MB (optional)
   - Allowed MIME types: `image/*` (optional)
4. **Click "Create bucket"**

5. **Set up Policies:**
   - Go to bucket settings → Policies tab
   - Add policy for SELECT (public access)
   - Add policy for INSERT (authenticated users)
   - Add policy for UPDATE (own files)
   - Add policy for DELETE (own files)

---

## Code-Level Debugging

If all database checks pass, check the React code:

### Add Debug Logging

Edit `StudentProfile.tsx`, line 70:

```typescript
const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    setUploading(true);
    console.log('🔍 Starting avatar upload...');

    if (!event.target.files || event.target.files.length === 0) {
      console.log('❌ No file selected');
      return;
    }

    const file = event.target.files[0];
    console.log('📁 File:', file.name, file.type, `${(file.size / 1024 / 1024).toFixed(2)}MB`);

    const fileSize = file.size / 1024 / 1024;
    if (fileSize > 2) {
      console.log('❌ File too large:', fileSize, 'MB');
      toast.error('File size must be less than 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      console.log('❌ Not an image:', file.type);
      toast.error('Please upload an image file');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${profile?.id}-${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`; // Changed from `avatars/${fileName}`
    console.log('📤 Uploading to:', filePath);

    // Upload image
    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    console.log('📤 Upload result:', { error: uploadError, data: uploadData });
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);
    
    console.log('🔗 Public URL:', publicUrl);

    // Update profile
    const { error: updateError, data: updateData } = await supabase
      .from('user_profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', profile?.id);

    console.log('📝 Profile update:', { error: updateError, data: updateData });
    if (updateError) throw updateError;

    setAvatarUrl(publicUrl);
    toast.success('Profile picture updated successfully!');
    console.log('✅ Avatar upload complete!');
  } catch (error) {
    console.error('💥 Error uploading avatar:', error);
    toast.error('Failed to upload profile picture');
  } finally {
    setUploading(false);
  }
};
```

---

## Testing Checklist

After applying fixes:

- [ ] Run `debug-avatar-upload.sql` in Supabase
- [ ] Verify all queries return expected results
- [ ] Check avatars bucket exists in Storage dashboard
- [ ] Log in as a student
- [ ] Open browser console (F12)
- [ ] Try uploading a small image (<2MB)
- [ ] Check console for logs
- [ ] Verify image appears in Storage → avatars bucket
- [ ] Verify avatar_url updated in user_profiles table
- [ ] Refresh page - avatar should persist

---

## Most Common Issue

**90% of the time, the issue is:**
❌ Migration `add_avatar_support.sql` has NOT been run in Supabase

**Solution:**
1. Copy the contents of `supabase/migrations/add_avatar_support.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Paste the SQL
4. Click "Run"
5. Verify you see "✅ Avatar support added successfully!"

---

## Still Not Working?

If you've tried everything above and it still doesn't work:

1. **Check Supabase logs:**
   - Go to Supabase Dashboard
   - Logs → Edge Function logs
   - Look for storage-related errors

2. **Verify your Supabase project isn't paused:**
   - Check project status in dashboard
   - Free tier projects pause after inactivity

3. **Check file permissions:**
   - Try uploading from a different browser
   - Try a different image file
   - Try a very small file (< 100KB)

4. **Contact support:**
   - Share console errors
   - Share network tab screenshots
   - Share results from `debug-avatar-upload.sql`

---

## Quick Fix for Production

If you need a quick workaround while debugging:

```typescript
// In StudentProfile.tsx, replace the upload logic with:

const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    setUploading(true);
    
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    
    // Use FormData
    const formData = new FormData();
    formData.append('file', file);
    
    // Upload using Supabase REST API directly
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/avatars/${profile?.id}-${Date.now()}.${file.name.split('.').pop()}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: formData
      }
    );
    
    if (!response.ok) {
      throw new Error(await response.text());
    }
    
    const data = await response.json();
    const publicUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/${data.Key}`;
    
    await supabase.from('user_profiles').update({ avatar_url: publicUrl }).eq('id', profile?.id);
    
    setAvatarUrl(publicUrl);
    toast.success('Profile picture updated!');
  } catch (error) {
    console.error('Error:', error);
    toast.error('Upload failed');
  } finally {
    setUploading(false);
  }
};
```

---

**Good luck! Let me know which step revealed the issue.** 🚀
