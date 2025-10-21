# Student and Staff Creation Testing Guide

## Overview
This guide tests the fixed account creation system that now uses direct database inserts instead of RPC functions.

## Prerequisites
1. Login as a librarian in the application
2. Open browser developer console (F12)

## Test Student Creation

### Step 1: Create a Student
Run the test script in the browser console:
```javascript
// Copy and paste the contents of test-student-creation.js
```

Expected output:
- Response status: 200
- Success message with enrollment_id
- Debug info showing recordId and profileId

### Step 2: Verify Database Records
Run the verification script in the browser console:
```javascript
// Copy and paste the contents of verify-student-creation.js
```

Expected results:
- Recent students table should show the new student record
- Recent user_profiles table should show the corresponding profile
- Student ID should match profile's student_id field
- Profile should have role: 'student' and enrollment_id

## Test Staff Creation

### Step 1: Create a Staff Member
Run the test script in the browser console:
```javascript
// Copy and paste the contents of test-staff-creation.js
```

Expected output:
- Response status: 200
- Success message with enrollment_id
- Debug info showing recordId and profileId

### Step 2: Verify Database Records
Run the verification script in the browser console:
```javascript
// Copy and paste the contents of verify-staff-creation.js
```

Expected results:
- Recent staff table should show the new staff record
- Recent user_profiles table should show the corresponding profile
- Staff ID should match profile's staff_id field
- Profile should have role: 'staff' and enrollment_id

## Test Login Functionality

### For Students:
1. Use the enrollment_id and password from creation
2. Try logging in through the student login form
3. Should successfully authenticate and access student dashboard

### For Staff:
1. Use the enrollment_id and password from creation
2. Try logging in through the staff login form
3. Should successfully authenticate and access staff dashboard

## Troubleshooting

### If creation fails:
- Check browser console for error messages
- Verify librarian is logged in
- Check Edge Function logs in Supabase dashboard

### If records don't appear:
- Check RLS policies might be blocking queries
- Verify the Edge Function has proper permissions
- Check database connection

### If login fails:
- Verify password_hash is stored correctly in user_profiles
- Check AuthContext signIn logic for students/staff
- Ensure enrollment_id lookup works properly

## Files Involved
- `supabase/functions/create-user-account/index.ts` - Edge Function (updated)
- `src/contexts/AuthContext.tsx` - Authentication logic (updated)
- `test-student-creation.js` - Student creation test
- `verify-student-creation.js` - Student verification test
- `test-staff-creation.js` - Staff creation test
- `verify-staff-creation.js` - Staff verification test