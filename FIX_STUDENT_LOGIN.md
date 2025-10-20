# 🔧 QUICK FIX: "Invalid Enrollment ID" Error

## Problem
Cannot login as student - getting "Invalid enrollment ID" error

## Root Cause
The student registration may have created the student record, but failed to:
1. Create the auth user (in auth.users)
2. Create the user profile (in user_profiles)
3. Link them together properly

## 🚨 IMMEDIATE DIAGNOSIS

### Step 1: Find Your Student's Enrollment ID
Go to your deployed app → Login as Librarian → Students tab
- Look at the students table
- Find the enrollment ID (e.g., STU12345678)
- **Write it down:** ___________________

### Step 2: Run Diagnostic in Supabase
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste this query (replace YOUR_ENROLLMENT_ID):

```sql
-- Replace YOUR_ENROLLMENT_ID with the actual value
WITH student_check AS (
    SELECT 
        s.id AS student_id,
        s.name,
        s.enrollment_id,
        s.parent_email,
        s.email AS student_email
    FROM students s
    WHERE s.enrollment_id = 'YOUR_ENROLLMENT_ID'
)
SELECT 
    sc.*,
    up.id AS has_profile,
    up.email AS profile_email,
    up.student_id AS profile_linked,
    au.id AS has_auth_user,
    au.email AS auth_email,
    CASE 
        WHEN sc.student_id IS NULL THEN '❌ Student not found'
        WHEN up.id IS NULL THEN '❌ Missing user_profile'
        WHEN au.id IS NULL THEN '❌ Missing auth user'
        WHEN up.student_id IS NULL THEN '❌ Profile not linked'
        ELSE '✅ All good'
    END AS status
FROM student_check sc
LEFT JOIN user_profiles up ON up.student_id = sc.student_id
LEFT JOIN auth.users au ON au.id = up.id;
```

### Step 3: Interpret Results

#### ✅ If status = 'All good'
- Problem is elsewhere (check credentials)
- Skip to "Alternative Solutions" below

#### ❌ If status = 'Student not found'
- The student wasn't created at all
- Go to "Solution A: Create Student from Scratch"

#### ❌ If status = 'Missing user_profile' or 'Missing auth user'
- Student exists but account incomplete
- Go to "Solution B: Complete the Registration"

#### ❌ If status = 'Profile not linked'
- All records exist but aren't connected
- Go to "Solution C: Link Records"

## 💡 SOLUTIONS

### Solution A: Create Student from Scratch

**This is the CLEANEST solution - Register again via the app**

1. Login as Librarian
2. Go to Students tab
3. Click "Register Student"
4. Fill in:
   - Name: [Student's Name]
   - Grade: [Grade Level]
   - Parent Email: **USE A DIFFERENT EMAIL** (not one already used)
5. Save the credentials displayed
6. Try logging in with NEW enrollment ID and password

### Solution B: Complete the Registration Manually

**If you want to fix the existing enrollment ID**

```sql
-- Step 1: Verify the student exists
SELECT id, name, enrollment_id, parent_email 
FROM students 
WHERE enrollment_id = 'YOUR_ENROLLMENT_ID';

-- Step 2: Create auth user (replace values)
-- NOTE: This requires service_role access, do this via Supabase Dashboard → Authentication → Add User
-- OR use the create-user-account Edge Function properly

-- Step 3: Create user profile to link them
INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    enrollment_id,
    student_id,
    parent_email
)
SELECT 
    au.id,
    au.email,
    s.name,
    'student',
    s.enrollment_id,
    s.id,
    s.parent_email
FROM students s
CROSS JOIN auth.users au
WHERE s.enrollment_id = 'YOUR_ENROLLMENT_ID'
AND au.email = s.parent_email
ON CONFLICT (id) DO NOTHING;
```

### Solution C: Link Existing Records

**If all records exist but aren't linked:**

```sql
-- Update user_profile to link to student
UPDATE user_profiles
SET student_id = (
    SELECT id FROM students WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'
)
WHERE email = (
    SELECT parent_email FROM students WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'
);
```

## 🔍 VERIFICATION

After applying any solution, verify it worked:

```sql
-- Complete verification
SELECT 
    s.name AS student_name,
    s.enrollment_id,
    s.parent_email,
    up.email AS login_email,
    up.role,
    au.email AS auth_email,
    au.confirmed_at IS NOT NULL AS email_verified,
    '✅ Ready to login' AS status
FROM students s
JOIN user_profiles up ON up.student_id = s.id
JOIN auth.users au ON au.id = up.id
WHERE s.enrollment_id = 'YOUR_ENROLLMENT_ID';
```

**Expected Result:**
- ✅ All columns should have values
- ✅ `login_email` should match `auth_email`
- ✅ `email_verified` should be true
- ✅ status should say "Ready to login"

## 🧪 TEST LOGIN

1. Logout from librarian account
2. Click "Student" tab
3. Enter:
   - **Enrollment ID:** [from verification query]
   - **Password:** [the one you saved during registration]
4. Click "Sign in as Student"

## 🚨 IF STILL FAILING

### Check Browser Console
1. Press F12
2. Go to Console tab
3. Try logging in
4. Look for error messages
5. Copy the error message

### Check Supabase Function Logs
1. Supabase Dashboard → Edge Functions
2. Click on `create-user-account`
3. Go to Logs tab
4. Look for errors during student creation
5. Copy any error messages

### Check Database Logs
1. Supabase Dashboard → Database
2. Logs tab
3. Look for errors
4. Copy any error messages

## 📝 ALTERNATIVE SOLUTIONS

### Option 1: Delete and Re-register (RECOMMENDED)

**If the student was just created for testing:**

```sql
-- Find and delete the test student (this will CASCADE)
DELETE FROM students WHERE enrollment_id = 'YOUR_ENROLLMENT_ID';

-- Then go to app and register again with:
-- - Same name and grade
-- - DIFFERENT parent email (important!)
```

### Option 2: Use Different Parent Email

**If the parent email might already be in use:**

```sql
-- Check if email is already used
SELECT 
    up.email,
    up.role,
    up.full_name,
    s.enrollment_id AS student_enrollment,
    st.enrollment_id AS staff_enrollment
FROM user_profiles up
LEFT JOIN students s ON s.id = up.student_id
LEFT JOIN staff st ON st.id = up.staff_id
WHERE up.email = 'parent.email@example.com';  -- Replace with parent email
```

If email is already used, you MUST use a different email for the new student.

### Option 3: Reset Password (if student exists and is linked)

**If student exists and is properly linked, maybe password is wrong:**

1. Login as Librarian
2. Go to Students tab
3. Find the student
4. Click the key icon (Reset Password)
5. Note the NEW password
6. Try logging in with NEW password

## 📊 EXPECTED DATABASE STATE

For a working student login, you need:

```
students table:
├── id: [UUID]
├── name: "John Doe"
├── enrollment_id: "STU12345678"
├── grade_level: "Grade 10"
├── parent_email: "parent@example.com"
└── created_at: [timestamp]

user_profiles table:
├── id: [UUID - same as auth.users.id]
├── email: "parent@example.com" ← For login
├── full_name: "John Doe"
├── role: "student"
├── enrollment_id: "STU12345678"
├── student_id: [UUID - links to students.id] ← CRITICAL
└── parent_email: "parent@example.com"

auth.users table:
├── id: [UUID - same as user_profiles.id]
├── email: "parent@example.com" ← For authentication
├── confirmed_at: [timestamp] ← Must be set
└── encrypted_password: [hash]
```

All three must be linked:
- `user_profiles.id` = `auth.users.id`
- `user_profiles.student_id` = `students.id`
- `user_profiles.email` = `auth.users.email` = `students.parent_email`

## ✅ SUCCESS CHECKLIST

- [ ] Student record exists in `students` table
- [ ] User profile exists in `user_profiles` table
- [ ] Auth user exists in `auth.users` table
- [ ] `user_profiles.student_id` = `students.id`
- [ ] `user_profiles.id` = `auth.users.id`
- [ ] Email confirmed in auth.users
- [ ] Can login with enrollment ID + password
- [ ] Dashboard shows correct student name and role

## 📞 NEED HELP?

If none of these solutions work, provide:
1. Result of the diagnostic query (Step 2)
2. Browser console errors
3. Supabase function logs
4. The exact error message you see

---

**Quick Action:** The FASTEST fix is usually to delete the problematic student and register again with a different parent email.
