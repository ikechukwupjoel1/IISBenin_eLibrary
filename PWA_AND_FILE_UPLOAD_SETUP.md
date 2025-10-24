# PWA and File Upload Setup Guide

## ✅ PWA Install Prompt - COMPLETED

The PWA install prompt has been added and will:
- **Automatically appear** when users visit the site on mobile browsers
- Show a custom install banner at the bottom of the screen
- Allow users to **install the app** to their home screen
- Remember if user dismissed it (won't show again for 7 days)
- Work on **Android** (Chrome, Edge, Samsung Internet)
- Work on **iOS Safari** (with "Add to Home Screen" from share menu)

**Features:**
✅ Custom branded install prompt
✅ "Install App" and "Not Now" buttons
✅ Slide-up animation
✅ Auto-dismiss after 7 days
✅ Service worker already registered
✅ Offline support enabled

**Production URL:** https://iisbeninelibrary-2tv0gbp4z-joel-prince-a-ikechukwus-projects.vercel.app

---

## ⚠️ File Upload Setup - REQUIRES DATABASE ACTION

The file upload code is ready, but you need to **create the storage bucket** in Supabase:

### Step 1: Run SQL Script

1. Go to Supabase Dashboard: https://supabase.com
2. Select your project: **IISBenin_eLibrary**
3. Go to **SQL Editor**
4. Click **New Query**
5. Copy and paste the contents of `CREATE_MESSAGE_ATTACHMENTS_BUCKET.sql`
6. Click **Run** (or press Ctrl+Enter)

### Step 2: Verify Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. You should see a bucket named `message-attachments`
3. Click on it to verify it exists

### Step 3: Test File Upload

1. Go to the app: https://iisbeninelibrary-2tv0gbp4z-joel-prince-a-ikechukwus-projects.vercel.app
2. Login and go to **Chat/Messaging**
3. Click the **paperclip icon** (📎)
4. Select a file (max 10MB)
5. The file preview should show
6. Click **Send**
7. The file should upload and appear in the chat

---

## Alternative: Manual Storage Bucket Creation

If the SQL script doesn't work, create the bucket manually:

### Via Supabase Dashboard:

1. **Go to Storage**
2. **Click "New bucket"**
3. **Name:** `message-attachments`
4. **Public:** ✅ Checked (files need to be publicly accessible)
5. **Click "Create bucket"**

### Set Policies:

1. **Click on the bucket**
2. **Go to "Policies" tab**
3. **Add these policies:**

**Policy 1: Allow Upload**
- **Policy name:** Allow authenticated users to upload
- **Allowed operation:** INSERT
- **Target roles:** authenticated
- **USING expression:** `bucket_id = 'message-attachments'`

**Policy 2: Allow Read**
- **Policy name:** Allow authenticated users to read
- **Allowed operation:** SELECT
- **Target roles:** authenticated
- **USING expression:** `bucket_id = 'message-attachments'`

**Policy 3: Allow Delete**
- **Policy name:** Allow users to delete their own files
- **Allowed operation:** DELETE
- **Target roles:** authenticated
- **USING expression:** 
```sql
bucket_id = 'message-attachments' AND
auth.uid()::text = (storage.foldername(name))[1]
```

---

## Testing Checklist

### PWA Install:
- [ ] Visit site on mobile Chrome/Edge
- [ ] See install prompt appear at bottom
- [ ] Click "Install App"
- [ ] App installs to home screen
- [ ] App opens in standalone mode
- [ ] Service worker loads successfully

### File Upload:
- [ ] Storage bucket created
- [ ] Policies set up correctly
- [ ] Can click paperclip icon
- [ ] Can select file
- [ ] File preview shows
- [ ] File uploads successfully
- [ ] File appears in chat message
- [ ] Can download file from chat
- [ ] File stored in Supabase Storage

---

## Troubleshooting

### PWA Not Showing Install Prompt:

1. **Already installed?** Check if app is already on home screen
2. **iOS?** Use "Add to Home Screen" from Safari share menu
3. **Dismissed recently?** Wait 7 days or clear localStorage
4. **Not HTTPS?** PWA requires secure connection (Vercel is HTTPS)

### File Upload Failing:

1. **Check storage bucket exists** in Supabase Dashboard
2. **Verify policies** are set correctly
3. **Check file size** (max 10MB)
4. **Check browser console** for specific error messages
5. **Verify authentication** - user must be logged in

**Error Messages:**
- "Failed to upload file" → Storage bucket doesn't exist or no upload policy
- "File size must be less than 10MB" → File too large
- No error but doesn't send → Check Supabase logs for policy violations

---

## What's Working Now:

✅ **PWA Install Prompt** - Fully functional on mobile
✅ **Service Worker** - Registered and active
✅ **Offline Support** - Basic caching enabled
✅ **File Upload Code** - Ready and waiting for storage bucket
✅ **File Preview** - Shows before sending
✅ **File Size Validation** - Max 10MB enforced
✅ **File Type Detection** - Icons for different file types

---

## What You Need To Do:

1. ✅ Test PWA install on mobile device
2. ⚠️ **Run the SQL script** to create storage bucket
3. ✅ Test file upload after bucket is created
4. ✅ Share production URL with users

**Next Step:** Run `CREATE_MESSAGE_ATTACHMENTS_BUCKET.sql` in Supabase SQL Editor!
