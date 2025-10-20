# Student Account Creation - Complete Testing Guide

## Current Status
✅ Edge Function `create-user-account` has been updated to:
   - Accept `parent_email` parameter
   - Use parent_email for student auth accounts
   - Store parent_email in user_profiles
   - Pass email to create_student_member RPC function

✅ Edge Function has been redeployed to Supabase

## Step-by-Step Testing Process

### Step 1: Verify Database Setup
Run the SQL script `VERIFY_STUDENT_CREATION.sql` in Supabase SQL Editor to ensure:
- [ ] `create_student_member` function exists with correct parameters
- [ ] `students` table has required columns
- [ ] `user_profiles` table has `parent_email` column
- [ ] `is_librarian` helper function exists
- [ ] At least one librarian account exists

### Step 2: Test Student Creation

1. **Login as Librarian**
   - Go to your app
   - Login with librarian credentials

2. **Navigate to Student Management**
   - Click on "Student Management" section

3. **Create New Student**
   - Click "Add Student" button
   - Fill in the form:
     - **Student Name**: Test Student
     - **Grade Level**: Grade 10
     - **Parent Email**: parent@example.com
   - Click Submit

4. **Expected Behavior**
   - Success message appears
   - Credentials modal shows:
     - Enrollment ID (e.g., STU47856843)
     - Password (auto-generated)
   - Student appears in the list

### Step 3: Verify Student Account

After creating a student, verify in Supabase Dashboard:

1. **Check auth.users**
   - Go to: https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/auth/users
   - Find user with email: parent@example.com
   - Should be email_confirmed

2. **Check students table**
   ```sql
   SELECT * FROM students 
   WHERE enrollment_id = 'YOUR_ENROLLMENT_ID'
   ORDER BY created_at DESC LIMIT 1;
   ```
   - Should have: name, email (parent email), enrollment_id, grade_level

3. **Check user_profiles table**
   ```sql
   SELECT * FROM user_profiles 
   WHERE enrollment_id = 'YOUR_ENROLLMENT_ID';
   ```
   - Should have: role='student', student_id linked, parent_email set

### Step 4: Test Student Login

1. **Logout from Librarian Account**

2. **Login as Student**
   - Click "Student" tab
   - Enter Enrollment ID (from credentials)
   - Enter Password (from credentials)
   - Click "Sign in as Student"

3. **Expected Behavior**
   - Login successful
   - Redirected to student dashboard
   - Can see borrowed books, available books, etc.

## Troubleshooting

### Error: "Unauthorized - no user found"
**Cause**: Not logged in as librarian
**Fix**: Login as librarian first

### Error: "Only librarians can create students"
**Cause**: Logged in user is not a librarian
**Fix**: 
1. Check user_profiles.role for your account
2. Create a librarian account if needed

### Error: "function create_student_member does not exist"
**Cause**: Database function missing
**Fix**: Run `VERIFY_STUDENT_CREATION.sql` to create it

### Error: "column parent_email does not exist"
**Cause**: user_profiles table missing parent_email column
**Fix**: Run this SQL:
```sql
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS parent_email TEXT;
```

### Error: "Invalid enrollment ID" when logging in
**Cause**: Student record or user_profile not properly created
**Fix**: 
1. Check if student exists in students table
2. Check if user_profile exists and is linked (student_id set)
3. Run `COMPLETE_FIX_STUDENT_LOGIN.sql` to fix linkage

### Edge Function Logs

Check logs for detailed error messages:
https://supabase.com/dashboard/project/myxwxakwlfjoovvlkkul/functions/create-user-account/logs

## Testing Checklist

- [ ] Database functions verified (VERIFY_STUDENT_CREATION.sql)
- [ ] Created new student account as librarian
- [ ] Received enrollment ID and password
- [ ] Student appears in student list
- [ ] Auth user created with parent email
- [ ] Student record created with enrollment ID
- [ ] User profile created and linked
- [ ] Student can login with enrollment ID
- [ ] Student dashboard loads correctly

## Next Steps

Once student creation is working:
1. Test editing student information
2. Test password reset functionality
3. Test student borrowing books
4. Create multiple students to test bulk operations

## Files Reference

- Edge Function: `supabase/functions/create-user-account/index.ts`
- Frontend Component: `src/components/StudentManagement.tsx`
- Auth Context: `src/contexts/AuthContext.tsx`
- Verification SQL: `VERIFY_STUDENT_CREATION.sql`
- Fix Script: `COMPLETE_FIX_STUDENT_LOGIN.sql`
