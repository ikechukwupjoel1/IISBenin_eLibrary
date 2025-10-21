# Issue Resolution Guide

## Issues Identified
1. **Student login failing**: Authentication fails despite successful registration
2. **Staff details not showing**: Staff count doesn't update after registration
3. **Librarian duplicate key**: Creating librarian accounts fails with duplicate key constraint

## Debugging Steps

### 1. Student Login Issue

**Symptoms**: Student registration shows details but login fails with "Authentication failed"

**Debug Steps**:
1. Open browser console (F12) after student registration
2. Run the debug script:
```javascript
// Copy and paste contents of debug-student-login.js
// Replace enrollmentId and password with actual values
```

**Expected Results**:
- Student should exist in `students` table
- Profile should exist in `user_profiles` table with matching `enrollment_id`
- Password should match exactly

**Common Issues**:
- Case sensitivity in enrollment_id lookup
- Password not stored correctly
- Profile lookup failing

### 2. Staff Count Issue

**Symptoms**: Staff registration successful but details don't show in staff management

**Debug Steps**:
1. Open browser console (F12) in Staff Management page
2. Run the debug script:
```javascript
// Copy and paste contents of debug-staff-count.js
```

**Expected Results**:
- Staff records should exist in `staff` table
- Corresponding profiles should exist in `user_profiles` table
- Staff IDs should match profile `staff_id` fields

**Common Issues**:
- UI not refreshing after creation
- RLS policies blocking queries
- Records created but not visible

### 3. Librarian Duplicate Key Issue

**Symptoms**: "Error creating librarian profile: duplicate key value violates unique constraint 'user_profiles_pkey'"

**Root Cause**: Attempting to create profile for existing auth user

**Solution**: Edge Function now checks for existing profiles before creation

## Testing Procedures

### Student Creation & Login Test
1. Login as librarian
2. Create a student account
3. Note the enrollment_id and password
4. Try logging in as student
5. If fails, run `debug-student-login.js` with actual credentials

### Staff Creation & Display Test
1. Login as librarian
2. Go to Staff Management
3. Create a staff account
4. Check if staff appears in the table immediately
5. If not, run `debug-staff-count.js`

### Librarian Creation Test
1. Try creating a new librarian account
2. Should succeed even if email exists (will show "Account already exists" message)

## Files Modified
- `supabase/functions/create-user-account/index.ts`: Added existing profile check
- `src/contexts/AuthContext.tsx`: Added debugging logs for student/staff login
- `src/components/StaffManagement.tsx`: Added debugging for staff loading

## Debug Scripts
- `debug-student-login.js`: Tests student authentication flow
- `debug-staff-count.js`: Checks staff data consistency
- `verify-student-creation.js`: Verifies student record creation
- `verify-staff-creation.js`: Verifies staff record creation

## Next Steps
1. Test student login with debugging enabled
2. Test staff creation and verify UI updates
3. Test librarian creation with existing emails
4. Remove debug logs once issues are resolved