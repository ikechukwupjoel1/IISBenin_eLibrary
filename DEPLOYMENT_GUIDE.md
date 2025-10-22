# 🚀 Quick Deployment Guide - Edge Functions

## ✅ Both functions are ready to deploy!

### 📍 Function Files Location:
- **change-password**: `supabase/functions/change-password/index.ts`
- **verify-login**: `supabase/functions/verify-login/index.ts`

---

## 🎯 EASIEST METHOD: Deploy via Supabase Dashboard

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: **https://app.supabase.com**
2. Sign in to your account
3. Select your **IISBenin_eLibrary** project

### Step 2: Navigate to Edge Functions
1. In the left sidebar, click on **"Edge Functions"** (⚡ icon)
2. Or go directly to: `https://app.supabase.com/project/YOUR_PROJECT/functions`

### Step 3: Deploy change-password function
1. Click the **"Create a new function"** button
2. Enter function name: `change-password`
3. Copy and paste the entire content from:
   ```
   supabase/functions/change-password/index.ts
   ```
4. Click **"Deploy function"**
5. Wait for deployment to complete (should take 10-30 seconds)

### Step 4: Deploy verify-login function
1. Click **"Create a new function"** again
2. Enter function name: `verify-login`
3. Copy and paste the entire content from:
   ```
   supabase/functions/verify-login/index.ts
   ```
4. Click **"Deploy function"**
5. Wait for deployment to complete

---

## ✨ After Deployment

### Test Password Change:
1. Go to your app: https://iisbeninelibrary-oihl2gavn-joel-prince-a-ikechukwus-projects.vercel.app
2. Login as a **staff or student** account
3. Click the **"Change Password"** tab
4. Enter your current password (the auto-generated one)
5. Enter a new password (minimum 6 characters)
6. Confirm the new password
7. Click **"Update Password"**
8. You should see: **"Password changed successfully!"**
9. Sign out and sign in with your **new password**

### What Happens After Deployment:
- ✅ New passwords will be **bcrypt hashed** (secure!)
- ✅ Login will verify passwords using **bcrypt**
- ✅ Old plain-text passwords will still work (backward compatible)
- ✅ As users change passwords, they automatically upgrade to bcrypt

---

## 🔧 Alternative: Using Supabase CLI

If you want to use the CLI in the future:

### Install Supabase CLI (Windows with Scoop):
```powershell
# Install Scoop first (if not installed)
iwr -useb get.scoop.sh | iex

# Add Supabase bucket
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git

# Install Supabase CLI
scoop install supabase
```

### Deploy with CLI:
```powershell
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy change-password
supabase functions deploy verify-login
```

---

## 📝 Notes

- **No changes to database needed** - functions work with existing schema
- **Backward compatible** - existing passwords still work
- **Automatic upgrade** - passwords become bcrypt-hashed when users change them
- **Secure by default** - all new password changes use bcrypt hashing

---

## 🆘 Need Help?

If you see any errors during deployment:
1. Check the function logs in Supabase Dashboard
2. Verify the function code was copied completely
3. Make sure there are no syntax errors in the pasted code

The app will continue to work even if deployment fails (using fallback mode), but passwords won't be bcrypt-hashed until functions are deployed.
