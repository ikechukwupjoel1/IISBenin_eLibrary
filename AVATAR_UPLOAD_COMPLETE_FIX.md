# Avatar Upload Fix - Complete Solution Guide

## The Problem
1. Upload path shows `avatars/avatars/...` (duplicated)
2. RLS policy error: "new row violates row-level security policy"
3. Other errors: reading_progress schema issues (separate issue)

## Root Cause
The Supabase Storage policies need to be created via the Dashboard UI, not SQL.

---

## ✅ COMPLETE FIX (Follow Step by Step)

### Step 1: Configure Storage Policies via Dashboard

#### A. Go to Storage Section
1. Open **Supabase Dashboard** (https://supabase.com/dashboard)
2. Select your project: `myxwxakwlfjoovvlkkul`
3. Click **Storage** in left sidebar
4. Click on **avatars** bucket

#### B. Create Policy 1 - Public Read Access
1. Click **Policies** tab (top of page)
2. Click **New Policy** button
3. Choose **"For full customization"** 
4. Fill in:
   - **Policy name**: `Allow public read access`
   - **Policy command**: `SELECT`
   - **Target roles**: Select `public` from dropdown
   - **USING expression**: 
     ```sql
     bucket_id = 'avatars'
     ```
5. Click **Save policy**

#### C. Create Policy 2 - Authenticated Upload
1. Click **New Policy** again
2. Choose **"For full customization"**
3. Fill in:
   - **Policy name**: `Allow authenticated uploads`
   - **Policy command**: `INSERT`
   - **Target roles**: Select `authenticated` from dropdown
   - **WITH CHECK expression**: 
     ```sql
     bucket_id = 'avatars'
     ```
4. Click **Save policy**

#### D. Create Policy 3 - Authenticated Update
1. Click **New Policy** again
2. Choose **"For full customization"**
3. Fill in:
   - **Policy name**: `Allow authenticated updates`
   - **Policy command**: `UPDATE`
   - **Target roles**: Select `authenticated` from dropdown
   - **USING expression**: 
     ```sql
     bucket_id = 'avatars'
     ```
   - **WITH CHECK expression**: 
     ```sql
     bucket_id = 'avatars'
     ```
4. Click **Save policy**

#### E. Create Policy 4 - Authenticated Delete
1. Click **New Policy** again
2. Choose **"For full customization"**
3. Fill in:
   - **Policy name**: `Allow authenticated deletes`
   - **Policy command**: `DELETE`
   - **Target roles**: Select `authenticated` from dropdown
   - **USING expression**: 
     ```sql
     bucket_id = 'avatars'
     ```
4. Click **Save policy**

### Step 2: Verify Bucket Configuration

1. In **Storage** → **avatars** bucket
2. Click the **⋮** (three dots) menu
3. Click **Edit bucket**
4. Verify settings:
   - ✅ **Public bucket**: Toggle ON
   - ✅ **File size limit**: 2097152 (2MB)
   - ✅ **Allowed MIME types**: Leave blank or add:
     ```
     image/jpeg
     image/png
     image/gif
     image/webp
     ```
5. Click **Save**

### Step 3: Run SQL Migration for avatar_url Column

1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Paste this SQL:

```sql
-- Add avatar_url column to user_profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE user_profiles ADD COLUMN avatar_url TEXT;
        CREATE INDEX idx_user_profiles_avatar ON user_profiles(avatar_url);
        RAISE NOTICE '✅ Added avatar_url column';
    ELSE
        RAISE NOTICE 'ℹ️ Column already exists';
    END IF;
END $$;

-- Verify it was created
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name = 'avatar_url';
```

4. Click **RUN**
5. Verify you see the column name in results

### Step 4: Clear Browser Cache and Test

1. In your browser (where app is running):
   - Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
   - Select **Cached images and files**
   - Click **Clear data**

2. **Refresh the page** (Ctrl+R or Cmd+R)

3. **Log in** as a student user

4. **Open DevTools** (F12)

5. Go to **Console** tab

6. Navigate to **Student Profile**

7. Click **"Choose File"** or avatar upload button

8. Select a small image (< 2MB, JPG/PNG)

9. **Watch the console** for:
   - 🔵 Starting avatar upload...
   - 📁 File: filename.jpg Size: 0.XX MB Type: image/jpeg
   - 📂 Upload path: (should show ONLY filename, not avatars/filename)
   - ⬆️ Uploading to Supabase Storage...
   - ✅ Upload successful
   - 🔗 Getting public URL...
   - ✅ Public URL: https://...
   - 💾 Updating user profile...
   - ✅ Profile updated successfully!

### Step 5: If Still Failing - Check Network Tab

1. In DevTools, go to **Network** tab
2. Click **Clear** (trash icon)
3. Try uploading again
4. Look for the **POST** request to `storage/v1/object/avatars/...`
5. Click on it
6. Check:
   - **Request URL**: Should be `.../storage/v1/object/avatars/FILENAME.jpg` (NOT avatars/avatars/)
   - **Status Code**: Should be `200 OK` (not 400/401)
   - **Response tab**: Should show success message

---

## 🔍 Verification Checklist

After completing all steps, verify:

- [ ] 4 storage policies created in Dashboard (visible in Policies tab)
- [ ] avatars bucket is PUBLIC (toggle is ON)
- [ ] avatar_url column exists in user_profiles table
- [ ] Browser cache cleared
- [ ] Upload path in console shows ONLY filename (not avatars/filename)
- [ ] Upload completes with 200 OK status
- [ ] Avatar appears in the UI immediately after upload

---

## 🚨 Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `new row violates row-level security policy` | Missing storage policies | Create all 4 policies via Dashboard |
| `POST .../avatars/avatars/...` | Path duplication | Clear browser cache, check code |
| `400 Bad Request` | Bucket not public or policies missing | Toggle bucket to PUBLIC, verify policies |
| `401 Unauthorized` | User not authenticated | Ensure user is logged in |
| `413 Payload Too Large` | File > 2MB | Compress image or use smaller file |
| `Column avatar_url does not exist` | Migration not run | Run Step 3 SQL in SQL Editor |

---

## 📞 Still Not Working?

If after following all steps it still fails:

1. Take a screenshot of the **Console** tab errors
2. Take a screenshot of the **Network** tab showing the failed request
3. Take a screenshot of **Storage** → **avatars** → **Policies** tab
4. Share all three screenshots

The detailed logs will show exactly where it's failing!
