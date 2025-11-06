# 🔧 Announcements & Invitations Fix

## Issues Fixed

### ❌ Problem 1: Announcements Not Working
**Issue:** Librarians, staff, and super admins couldn't send announcements
**Root Cause:** 
- Missing `institution_id` column in announcements table
- No create announcement UI in the component
- RLS policies not correctly configured

### ❌ Problem 2: Invite Librarian Not Working  
**Issue:** Super admin invite librarian functionality not working
**Root Cause:**
- Missing or misconfigured `create_librarian_invitation` function
- RLS policies blocking access

---

## ✅ Solutions Applied

### 1. Database Fixes (Run SQL First)

**Execute:** `FIX_ANNOUNCEMENTS_AND_INVITATIONS.sql`

This SQL file will:
- ✅ Add `institution_id` column to announcements table
- ✅ Create/fix `get_user_role()` function
- ✅ Fix RLS policies for announcements
- ✅ Create/fix `librarian_invitations` table
- ✅ Fix `create_librarian_invitation()` function
- ✅ Update RLS policies for invitations

### 2. Frontend Fixes (Already Applied)

**File:** `src/components/Announcements.tsx`

Added features:
- ✅ **"New" button** for librarians/super admins
- ✅ **Create announcement form** with:
  - Message textarea
  - Target audience dropdown (Everyone/Staff/Students)
  - Submit button with loading state
- ✅ **Toast notifications** for success/error
- ✅ **Institution context** (announcements scoped to institution)

---

## 📋 Step-by-Step Fix Instructions

### Step 1: Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- File: FIX_ANNOUNCEMENTS_AND_INVITATIONS.sql
```

This will:
1. Check current status
2. Create missing tables/functions
3. Fix RLS policies
4. Verify everything is set up

### Step 2: Deploy Frontend Changes
```bash
# The Announcements.tsx component has been updated
# Commit and deploy to Vercel
git add .
git commit -m "Fix announcements creation and invitations"
git push origin main
```

### Step 3: Test Announcements
1. **Login as Librarian**
2. Go to **Dashboard** (announcements widget is there)
3. Click **"New"** button (top right of Announcements section)
4. Enter message and select audience
5. Click **"Create"**
6. ✅ Announcement should appear instantly

### Step 4: Test Invitations
1. **Login as Super Admin**
2. Go to **Super Admin Dashboard**
3. Navigate to **Institutions** section
4. Select an institution
5. Click **"Invite Librarian"** button
6. Enter email and submit
7. ✅ You'll get an invitation link to share

---

## 🎯 How to Use After Fix

### Creating Announcements

**Who can create:**
- ✅ Librarians (for their institution)
- ✅ Super Admins (for any institution)
- ❌ Staff (cannot create, only view)
- ❌ Students (cannot create, only view)

**How to create:**
1. Go to **Dashboard**
2. Find **Announcements** widget
3. Click **"New"** button
4. Fill in:
   - **Message**: Your announcement text
   - **Target Audience**: 
     - "Everyone" - All users see it
     - "Staff Only" - Only staff see it
     - "Students Only" - Only students see it
5. Click **"Create"**

### Inviting Librarians

**Who can invite:**
- ✅ Super Admins only

**How to invite:**
1. **Super Admin Dashboard** → **Institutions**
2. Select institution → Click **"Details"**
3. Click **"Invite Librarian"** button
4. Enter librarian's email
5. Click **"Generate Invitation"**
6. Copy and share the invitation link
7. New librarian uses link to register

---

## 🔍 Verification Queries

Run these in Supabase SQL Editor to verify fix:

```sql
-- 1. Check announcements table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'announcements';

-- 2. Check if get_user_role function exists
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name = 'get_user_role';

-- 3. Check RLS policies for announcements
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'announcements';

-- 4. Check if create_librarian_invitation exists
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'create_librarian_invitation';

-- 5. Test announcement creation (replace IDs)
INSERT INTO announcements (message, created_by, institution_id, target_audience)
VALUES (
  'Test announcement',
  'YOUR_USER_ID',
  'YOUR_INSTITUTION_ID',
  'all'
);
```

---

## 🚨 Troubleshooting

### Issue: "Failed to create announcement"
**Check:**
1. Run verification query #1 - Does `institution_id` column exist?
2. Run verification query #2 - Does `get_user_role` function exist?
3. Run verification query #3 - Are RLS policies correct?

**Fix:** Re-run `FIX_ANNOUNCEMENTS_AND_INVITATIONS.sql`

### Issue: "Only super admins can create invitations"
**Check:**
1. Are you logged in as super admin?
   ```sql
   SELECT id, email, role FROM user_profiles WHERE id = auth.uid();
   ```
2. If not super admin, promote yourself:
   ```sql
   UPDATE user_profiles SET role = 'super_admin' WHERE email = 'your@email.com';
   ```

### Issue: "Institution not found" when creating announcement
**Check:**
1. Does your user profile have institution_id?
   ```sql
   SELECT id, email, role, institution_id 
   FROM user_profiles 
   WHERE id = auth.uid();
   ```
2. If missing, update it:
   ```sql
   UPDATE user_profiles 
   SET institution_id = 'CORRECT_INSTITUTION_ID' 
   WHERE id = 'YOUR_USER_ID';
   ```

---

## 📊 Expected Behavior After Fix

### Announcements Tab/Widget
- **Librarians see:** "New" button + announcement list
- **Staff see:** Announcement list only
- **Students see:** Announcement list only
- **Super Admins see:** "New" button + all announcements from all institutions

### Announcement Creation
- **Form appears:** Click "New" button
- **Fields visible:** Message textarea, audience dropdown
- **Submit behavior:** Toast notification → Form closes → Announcement appears
- **Scoping:** Only users from same institution see it (except super admin)

### Librarian Invitations
- **Super Admin:** Can invite librarians to any institution
- **Invitation link:** Valid for 7 days
- **Recipient:** Uses link to create account
- **Auto-assignment:** New librarian automatically assigned to institution

---

## 🎉 Success Indicators

After running the fixes, you should see:

✅ **Database:**
- `announcements` table has `institution_id` column
- `get_user_role()` function exists
- `create_librarian_invitation()` function exists
- RLS policies allow librarians to insert

✅ **Frontend:**
- Announcements widget shows "New" button for librarians
- Clicking "New" opens create form
- Form submits successfully
- New announcement appears immediately

✅ **Functionality:**
- Librarians can create announcements
- Staff/students can view (not create)
- Super admins can invite librarians
- Invitation links work for registration

---

## 📝 Next Steps

1. **Run SQL:** `FIX_ANNOUNCEMENTS_AND_INVITATIONS.sql`
2. **Deploy:** Push frontend changes to production
3. **Test:** Create a test announcement as librarian
4. **Test:** Create a test invitation as super admin
5. **Verify:** Check both features work end-to-end

**Status:** Ready for deployment! 🚀
