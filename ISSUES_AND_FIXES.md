# Comprehensive Test Report & Fixes

## Executive Summary

This document outlines all identified issues in the IISBenin eLibrary system and provides fixes for each.

---

## Issues Identified & Their Fixes

### 🔴 CRITICAL ISSUE #1: Staff Count Shows 0 on Dashboard

**Symptom:**
- Dashboard displays "Total Staff: 0" even when staff records exist in the database
- Staff management page may show empty table

**Root Causes:**
1. RLS policies might be blocking SELECT for anonymous/non-authenticated reads
2. Staff rows exist but are not linked to user_profiles
3. Query is correct but session doesn't have proper permissions

**Fix Applied:**
```sql
-- Ensure RLS policy allows SELECT for everyone
DROP POLICY IF EXISTS "staff_select_all" ON staff;
CREATE POLICY "staff_select_all" ON staff FOR SELECT USING (true);

-- Repair any staff without user_profiles
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, staff_id, password_hash)
SELECT 
  s.id, s.email, s.name, 'staff', s.enrollment_id, s.id, 'NEEDS_RESET'
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id)
ON CONFLICT (id) DO NOTHING;
```

**Verification:**
Run in SQL Editor:
```sql
SELECT count(*) FROM staff;
SELECT * FROM staff LIMIT 5;
```

---

### 🔴 CRITICAL ISSUE #2: borrow_records 404 Errors

**Symptom:**
- Browser console shows: `Failed to load resource: the server responded with a status of 404`
- URL: `.../rest/v1/borrow_records?select=...`

**Root Causes:**
1. Table `borrow_records` doesn't exist in the database
2. Table exists but PostgREST can't expose it (permissions/schema issue)
3. Migrations were not applied to the Supabase project

**Fix Applied:**
Run `setup_database.sql` OR `APPLY_ALL_FIXES.sql` to create the table with proper structure.

**Verification:**
```sql
SELECT to_regclass('public.borrow_records');  -- Should return 'borrow_records', not NULL
SELECT count(*) FROM borrow_records;
```

---

### 🔴 CRITICAL ISSUE #3: "Error checking setup: Object"

**Symptom:**
- Console error: "Error checking setup: Object"
- Vague error message with no details

**Root Cause:**
- `App.tsx` logs the error object without extracting the message
- Underlying issue is likely user_profiles query failing

**Fix Applied:**
Better error logging in `src/App.tsx`:
```typescript
console.error('Error checking setup:', error?.message || JSON.stringify(error));
```

**Also Fixed:**
Ensure user_profiles RLS allows checking for librarian existence:
```sql
DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
CREATE POLICY "users_select_own_profile" ON user_profiles FOR SELECT 
  USING (auth.uid() = id OR is_librarian(auth.uid()));
```

---

### 🟡 ISSUE #4: Inconsistent Staff/Student Record Creation

**Symptom:**
- Edge Function returns success but DB records missing
- Profile created but student/staff table row missing
- Mismatched IDs between tables

**Root Cause:**
- Edge Function was using RPCs which generated different UUIDs
- Profile ID didn't match student/staff ID
- Partial failures left orphaned records

**Fix Applied:**
Updated `supabase/functions/create-user-account/index.ts`:
- Use direct inserts with admin client (bypasses RLS)
- Generate UUID once and use it consistently
- Create auth user for staff when email provided
- Validate contact info before creating records
- Return created record for UI verification

**Verification:**
After creating a staff/student:
```sql
-- Check for matching records
SELECT 
  up.id, up.full_name, up.role, up.enrollment_id,
  CASE 
    WHEN up.role = 'student' THEN (SELECT name FROM students WHERE id = up.student_id)
    WHEN up.role = 'staff' THEN (SELECT name FROM staff WHERE id = up.staff_id)
  END as record_name
FROM user_profiles up
WHERE up.role IN ('student', 'staff')
ORDER BY up.created_at DESC
LIMIT 5;
```

---

### 🟡 ISSUE #5: Missing password_hash Column

**Symptom:**
- Students/staff can't login with enrollment ID
- Password verification fails

**Root Cause:**
- user_profiles table missing password_hash column for non-auth users

**Fix Applied:**
```sql
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS password_hash text;
```

---

### 🟡 ISSUE #6: Missing staff_id in borrow_records

**Symptom:**
- Can't create borrow records for staff
- Only students can borrow

**Root Cause:**
- borrow_records table only had student_id column

**Fix Applied:**
```sql
ALTER TABLE borrow_records ADD COLUMN IF NOT EXISTS staff_id uuid REFERENCES staff(id) ON DELETE CASCADE;
ALTER TABLE borrow_records ADD CONSTRAINT borrower_check 
  CHECK ((student_id IS NOT NULL AND staff_id IS NULL) OR (student_id IS NULL AND staff_id IS NOT NULL));
CREATE INDEX idx_borrow_records_staff_id ON borrow_records(staff_id);
```

---

### 🟢 ISSUE #7: Orphaned Records

**Symptom:**
- Staff/student records exist without matching user_profiles
- User profiles exist without matching staff/student records

**Root Cause:**
- Edge Function failures or manual SQL insertions
- No atomic transaction for multi-table inserts

**Fix Applied:**
```sql
-- Create missing user_profiles
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, student_id, password_hash)
SELECT s.id, s.email, s.name, 'student', s.enrollment_id, s.id, 'NEEDS_RESET'
FROM students s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.student_id = s.id)
ON CONFLICT (id) DO NOTHING;

-- Same for staff
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id, staff_id, password_hash)
SELECT s.id, s.email, s.name, 'staff', s.enrollment_id, s.id, 'NEEDS_RESET'
FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id)
ON CONFLICT (id) DO NOTHING;
```

---

### 🟢 ISSUE #8: Missing Indexes

**Symptom:**
- Slow queries on large tables
- Dashboard slow to load stats

**Fix Applied:**
```sql
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_staff_enrollment ON staff(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_borrow_records_status ON borrow_records(status);
CREATE INDEX IF NOT EXISTS idx_borrow_records_due_date ON borrow_records(due_date);
CREATE INDEX IF NOT EXISTS idx_user_profiles_enrollment ON user_profiles(enrollment_id);
```

---

### 🟢 ISSUE #9: is_librarian Function Not Secure

**Symptom:**
- Potential security bypass
- RLS policies not working correctly

**Fix Applied:**
```sql
CREATE OR REPLACE FUNCTION is_librarian(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id AND role = 'librarian'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## How to Apply All Fixes

### Step 1: Run Comprehensive Test
```bash
# In Supabase SQL Editor, run:
comprehensive-test.sql
```
This will identify which issues exist in your database.

### Step 2: Apply All Fixes
```bash
# In Supabase SQL Editor, run:
APPLY_ALL_FIXES.sql
```
This script:
- Creates missing tables/columns
- Fixes RLS policies
- Repairs orphaned records
- Creates indexes
- Verifies admin user

### Step 3: Deploy Edge Function
```bash
# In terminal:
cd supabase/functions/create-user-account
supabase functions deploy create-user-account
```

### Step 4: Rebuild Frontend
```bash
npm run build
```

### Step 5: Test Everything
1. Run `comprehensive-e2e-test.js` in browser console
2. Manually test each feature using `COMPREHENSIVE_TEST_GUIDE.md`

---

## Expected Results After Fixes

### ✅ Dashboard Should Show:
- Accurate book count
- Accurate student count
- Accurate staff count (FIXED)
- Accurate borrowed books count
- Accurate overdue books count
- Top reading students list
- No 404 errors in Network tab

### ✅ Student Management Should:
- Display all students
- Create student with enrollment ID + password
- Student record appears in database
- Student can login immediately
- Profile ↔ student record properly linked

### ✅ Staff Management Should:
- Display all staff (FIXED)
- Create staff with enrollment ID + password
- Staff record appears in database
- Staff can login immediately
- Profile ↔ staff record properly linked
- Auth user created when email provided

### ✅ Book Management Should:
- CRUD operations work
- Status updates correctly
- Search/filter functional

### ✅ Borrowing System Should:
- Create borrows for students
- Create borrows for staff (FIXED)
- Track active/completed/overdue
- Update book status

---

## Testing Checklist

After applying fixes, verify:

- [ ] No 404 errors in Network tab
- [ ] All dashboard stats show correct numbers
- [ ] Staff count > 0 (if staff exist)
- [ ] Can create and login as student
- [ ] Can create and login as staff
- [ ] Can manage books
- [ ] Can create borrow records
- [ ] RLS policies enforced correctly
- [ ] No orphaned records
- [ ] Edge Function validates properly

---

## Post-Fix Maintenance

### Regular Checks:
```sql
-- Check for orphaned records
SELECT 'Students without profiles' AS issue, count(*) FROM students s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.student_id = s.id);

SELECT 'Staff without profiles' AS issue, count(*) FROM staff s
WHERE NOT EXISTS (SELECT 1 FROM user_profiles up WHERE up.staff_id = s.id);

-- Check RLS policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### Performance Monitoring:
```sql
-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

---

## Contact for Issues

If issues persist after applying all fixes:
1. Check browser console for detailed errors
2. Check Network tab for failed requests
3. Run comprehensive-test.sql to diagnose
4. Check Supabase logs for Edge Function errors
