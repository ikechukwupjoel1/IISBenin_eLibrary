# IISBenin Library - End-to-End Test Plan

**Test Date:** October 20, 2025  
**Application URL:** https://iisbeninelibrary-ox29ugfqt-joel-prince-a-ikechukwus-projects.vercel.app  
**Tester:** System Validation

---

## 🎯 TEST OBJECTIVES

1. Verify complete student registration flow with parent email
2. Test authentication for all three user roles
3. Validate book management and borrowing workflows
4. Confirm role-based access control
5. Test end-to-end user journey from registration to book borrowing

---

## 📋 PRE-TEST CHECKLIST

### ✅ Environment Verification
- [ ] Frontend deployed to Vercel (latest version)
- [ ] Supabase backend accessible
- [ ] Edge Functions deployed and active
- [ ] Database migrations applied
- [ ] Environment variables set correctly

### ✅ Database Schema Verification

**Run in Supabase SQL Editor:**

```sql
-- Check if parent_email column exists in students table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
AND column_name IN ('parent_email', 'name', 'grade_level', 'enrollment_id');

-- Check if parent_email column exists in user_profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('parent_email', 'email', 'full_name', 'role', 'enrollment_id');

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('students', 'user_profiles', 'staff', 'borrow_records')
ORDER BY tablename, policyname;

-- Verify is_librarian() function exists
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'is_librarian';
```

**Expected Results:**
- ✅ `parent_email` column exists in both tables (text type)
- ✅ All core columns present
- ✅ RLS policies active for all tables
- ✅ `is_librarian()` function defined

### ✅ If parent_email Missing, Run:

```sql
-- Add parent_email to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- Add parent_email to user_profiles table
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS parent_email TEXT;

-- Update create_student_member function to accept parent_email
CREATE OR REPLACE FUNCTION create_student_member(
  p_name TEXT,
  p_email TEXT,
  p_phone_number TEXT,
  p_grade_level TEXT,
  p_enrollment_id TEXT,
  p_password_hash TEXT,
  p_parent_email TEXT DEFAULT NULL,
  p_calling_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_student_id UUID;
BEGIN
  -- Verify caller is a librarian
  IF p_calling_user_id IS NOT NULL THEN
    IF NOT is_librarian(p_calling_user_id) THEN
      RAISE EXCEPTION 'Only librarians can create students';
    END IF;
  END IF;

  -- Insert student record
  INSERT INTO students (
    name,
    email,
    phone_number,
    grade_level,
    enrollment_id,
    parent_email
  ) VALUES (
    p_name,
    p_email,
    p_phone_number,
    p_grade_level,
    p_enrollment_id,
    p_parent_email
  )
  RETURNING id INTO v_student_id;

  RETURN v_student_id;
END;
$$;
```

---

## 🧪 TEST SCENARIOS

### TEST 1: LIBRARIAN LOGIN
**Priority:** CRITICAL  
**Estimated Time:** 2 minutes

#### Steps:
1. Navigate to application URL
2. Ensure "Librarian" tab is selected
3. Enter credentials:
   - **Email:** `[Your librarian email]`
   - **Password:** `[Your librarian password]`
4. Click "Sign in as Librarian"

#### Expected Results:
- ✅ Login successful within 2 seconds
- ✅ Redirected to Dashboard
- ✅ Welcome message shows: "Welcome, [Name] (librarian)"
- ✅ Navigation shows: Dashboard, Digital Library, Books, Students, Staff, Librarians, Login Logs, Borrowing, Reservations, Leaderboard, Reviews, Challenges
- ✅ Login logged in `login_logs` table

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 2: STUDENT REGISTRATION WITH PARENT EMAIL
**Priority:** CRITICAL  
**Estimated Time:** 5 minutes

#### Prerequisites:
- Logged in as Librarian (from Test 1)

#### Steps:
1. Click on "Students" tab
2. Click "Register Student" button
3. Verify modal appears with title "Register New Student"
4. Fill in form:
   - **Name:** "Test Student Alpha"
   - **Grade Level:** "Grade 10A"
   - **Parent Email:** "parent.test.alpha@example.com"
5. Verify info box shows "Auto-Generated Credentials" message
6. Click "Register" button
7. Wait for response

#### Expected Results:
- ✅ Form validates all fields are required
- ✅ Submit button shows loading state
- ✅ Success: Credentials modal appears
- ✅ Credentials displayed:
  - Enrollment ID: `STU[8 digits]`
  - Password: `[8 random characters]`
- ✅ Student appears in students table
- ✅ Print button available
- ✅ Done button closes modal and refreshes list

#### Database Verification:
```sql
-- Check student was created
SELECT id, name, grade_level, enrollment_id, parent_email, email
FROM students
WHERE name = 'Test Student Alpha';

-- Check user_profile was created
SELECT up.id, up.email, up.full_name, up.role, up.enrollment_id, up.parent_email, up.student_id
FROM user_profiles up
WHERE up.email = 'parent.test.alpha@example.com';

-- Check auth user was created
SELECT id, email, created_at, confirmed_at
FROM auth.users
WHERE email = 'parent.test.alpha@example.com';

-- Check all three are linked correctly
SELECT 
  s.name AS student_name,
  s.enrollment_id,
  s.parent_email AS student_parent_email,
  up.email AS profile_email,
  up.full_name AS profile_name,
  up.role,
  au.email AS auth_email,
  au.confirmed_at IS NOT NULL AS email_confirmed
FROM students s
JOIN user_profiles up ON up.student_id = s.id
JOIN auth.users au ON au.id = up.id
WHERE s.name = 'Test Student Alpha';
```

#### Expected Database Results:
- ✅ Student record exists with `parent_email = 'parent.test.alpha@example.com'`
- ✅ User profile exists with:
  - `email = 'parent.test.alpha@example.com'`
  - `role = 'student'`
  - `student_id` points to student record
- ✅ Auth user exists with `email = 'parent.test.alpha@example.com'`
- ✅ All three records linked via IDs

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):
- **Credentials Received:**
  - Enrollment ID: _______________
  - Password: _______________
- **Database Check:** [ ] PASS [ ] FAIL

---

### TEST 3: PARENT LOGIN AS STUDENT
**Priority:** CRITICAL  
**Estimated Time:** 3 minutes

#### Prerequisites:
- Student registered in Test 2
- Credentials saved

#### Steps:
1. Click "Sign Out" button
2. Verify redirected to login page
3. Click "Student" tab
4. Enter credentials from Test 2:
   - **Enrollment ID:** `[From Test 2]`
   - **Password:** `[From Test 2]`
5. Click "Sign in as Student"

#### Expected Results:
- ✅ Login successful within 2 seconds
- ✅ Redirected to Dashboard
- ✅ Welcome message shows: "Welcome, Test Student Alpha (student)"
- ✅ Navigation shows ONLY: Dashboard, My Books, Digital Library, Reservations, Leaderboard, Reviews, Challenges
- ✅ Does NOT show: Books, Students, Staff, Librarians, Login Logs, Borrowing
- ✅ Login logged in `login_logs` table with success=true

#### Database Verification:
```sql
-- Check login was logged
SELECT enrollment_id, user_id, success, login_at
FROM login_logs
WHERE enrollment_id = '[Enrollment ID from Test 2]'
ORDER BY login_at DESC
LIMIT 1;
```

#### Expected Database Results:
- ✅ Login log exists with `success = true`
- ✅ Timestamp is recent (within last minute)

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 4: STUDENT VIEW - MY BOOKS
**Priority:** HIGH  
**Estimated Time:** 2 minutes

#### Prerequisites:
- Logged in as student (from Test 3)

#### Steps:
1. Click "My Books" tab
2. View the page content

#### Expected Results:
- ✅ Page loads successfully
- ✅ Shows "My Borrowed Books" or "No borrowed books" message
- ✅ If no books: Shows helpful message to visit Digital Library or ask librarian
- ✅ No error messages
- ✅ Can navigate to other student tabs

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 5: STAFF REGISTRATION
**Priority:** HIGH  
**Estimated Time:** 5 minutes

#### Prerequisites:
- Login as Librarian

#### Steps:
1. Sign out from student account
2. Login as Librarian (use credentials from Test 1)
3. Click on "Staff" tab
4. Click "Register Staff" button
5. Fill in form:
   - **Name:** "Test Staff Beta"
   - **Email:** "staff.test.beta@example.com"
   - **Phone:** "+1234567890" (optional)
6. Click "Register"
7. Note the credentials displayed

#### Expected Results:
- ✅ Credentials modal appears
- ✅ Enrollment ID: `STF[8 digits]`
- ✅ Password: `[8 random characters]`
- ✅ Staff appears in staff table

#### Database Verification:
```sql
-- Check staff was created
SELECT id, name, enrollment_id, email, phone_number
FROM staff
WHERE name = 'Test Staff Beta';

-- Check user_profile was created
SELECT up.id, up.email, up.full_name, up.role, up.enrollment_id, up.staff_id
FROM user_profiles up
WHERE up.email = 'staff.test.beta@example.com';

-- Check linked correctly
SELECT 
  st.name AS staff_name,
  st.enrollment_id,
  st.email AS staff_email,
  up.email AS profile_email,
  up.role
FROM staff st
JOIN user_profiles up ON up.staff_id = st.id
WHERE st.name = 'Test Staff Beta';
```

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):
- **Credentials Received:**
  - Enrollment ID: _______________
  - Password: _______________

---

### TEST 6: STAFF LOGIN
**Priority:** HIGH  
**Estimated Time:** 2 minutes

#### Prerequisites:
- Staff registered in Test 5

#### Steps:
1. Sign out
2. Click "Staff" tab
3. Enter staff credentials from Test 5
4. Click "Sign in as Staff"

#### Expected Results:
- ✅ Login successful
- ✅ Welcome message shows: "Welcome, Test Staff Beta (staff)"
- ✅ Navigation shows: Dashboard, My Books, Digital Library, Books, Borrowing, Reservations, Leaderboard, Reviews, Challenges
- ✅ Does NOT show: Students, Staff, Librarians, Login Logs

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 7: BOOK MANAGEMENT (LIBRARIAN/STAFF)
**Priority:** HIGH  
**Estimated Time:** 5 minutes

#### Prerequisites:
- Logged in as Staff (from Test 6) or Librarian

#### Steps:
1. Click "Books" tab
2. Click "Add Book" button
3. Fill in form:
   - **Title:** "Test Book - Introduction to Testing"
   - **Author/Publisher:** "Test Author"
   - **ISBN:** "978-0-123456-78-9"
   - **Category:** "Technology"
   - **Quantity:** 5
4. Click "Add Book"
5. Verify book appears in list
6. Click edit icon on the book
7. Change quantity to 3
8. Save changes
9. Search for the book using search box

#### Expected Results:
- ✅ Book added successfully
- ✅ Book appears in table with correct details
- ✅ Quantity shows: 5 available, 0 borrowed
- ✅ Edit successful, quantity updated to 3
- ✅ Search works correctly

#### Database Verification:
```sql
-- Check book was created
SELECT id, title, author_publisher, isbn, category, quantity, status
FROM books
WHERE title = 'Test Book - Introduction to Testing';
```

#### Expected Database Results:
- ✅ Book exists with `quantity = 3`
- ✅ Status = 'available'

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 8: BORROWING WORKFLOW
**Priority:** CRITICAL  
**Estimated Time:** 7 minutes

#### Prerequisites:
- Book created in Test 7
- Student created in Test 2
- Logged in as Librarian or Staff

#### Steps:
1. Navigate to "Borrowing" tab
2. Click "New Borrow" button
3. Fill in form:
   - **Book:** Select "Test Book - Introduction to Testing"
   - **Borrower Type:** Student
   - **Borrower:** Select "Test Student Alpha"
   - **Due Date:** [7 days from today]
4. Click "Create Borrow Record"
5. Verify success message
6. Check borrow record appears in list

#### Expected Results:
- ✅ Borrow form validates all fields
- ✅ Borrow record created successfully
- ✅ Record shows:
  - Book title: "Test Book - Introduction to Testing"
  - Borrower: "Test Student Alpha"
  - Status: "active"
  - Due date: [7 days from today]
- ✅ Book quantity decreased (now 2 available)

#### Database Verification:
```sql
-- Check borrow record was created
SELECT 
  br.id,
  b.title AS book_title,
  s.name AS student_name,
  br.borrow_date,
  br.due_date,
  br.status
FROM borrow_records br
JOIN books b ON b.id = br.book_id
JOIN students s ON s.id = br.student_id
WHERE s.name = 'Test Student Alpha'
AND b.title = 'Test Book - Introduction to Testing';

-- Check book quantity updated
SELECT title, quantity, 
  (SELECT COUNT(*) FROM borrow_records WHERE book_id = books.id AND status = 'active') as borrowed_count
FROM books
WHERE title = 'Test Book - Introduction to Testing';
```

#### Expected Database Results:
- ✅ Borrow record exists with `status = 'active'`
- ✅ Book still has correct quantity
- ✅ System tracks borrowed count correctly

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 9: STUDENT VIEW OF BORROWED BOOK
**Priority:** HIGH  
**Estimated Time:** 3 minutes

#### Prerequisites:
- Book borrowed in Test 8

#### Steps:
1. Sign out
2. Login as student (credentials from Test 2)
3. Navigate to "My Books" tab
4. Verify borrowed book appears

#### Expected Results:
- ✅ "Test Book - Introduction to Testing" appears in My Books
- ✅ Shows borrow date
- ✅ Shows due date
- ✅ Shows status as "active"
- ✅ Shows book details (author, category)

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 10: RETURN BOOK WORKFLOW
**Priority:** HIGH  
**Estimated Time:** 3 minutes

#### Prerequisites:
- Book borrowed in Test 8
- Logged in as Librarian or Staff

#### Steps:
1. Sign out from student account
2. Login as Librarian/Staff
3. Navigate to "Borrowing" tab
4. Find the active borrow record for "Test Student Alpha"
5. Click "Return" button
6. Confirm return

#### Expected Results:
- ✅ Confirmation dialog appears
- ✅ Return processed successfully
- ✅ Status changed from "active" to "completed"
- ✅ Return date set to today
- ✅ Book quantity increased back (3 available)

#### Database Verification:
```sql
-- Check borrow record was updated
SELECT 
  br.status,
  br.return_date,
  br.borrow_date,
  br.due_date
FROM borrow_records br
JOIN books b ON b.id = br.book_id
JOIN students s ON s.id = br.student_id
WHERE s.name = 'Test Student Alpha'
AND b.title = 'Test Book - Introduction to Testing'
ORDER BY br.created_at DESC
LIMIT 1;

-- Check book quantity restored
SELECT title, quantity
FROM books
WHERE title = 'Test Book - Introduction to Testing';
```

#### Expected Database Results:
- ✅ Borrow record `status = 'completed'`
- ✅ `return_date` is set to today
- ✅ Book quantity restored to 3

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 11: PASSWORD RESET
**Priority:** MEDIUM  
**Estimated Time:** 4 minutes

#### Prerequisites:
- Student exists (from Test 2)
- Logged in as Librarian

#### Steps:
1. Navigate to "Students" tab
2. Find "Test Student Alpha"
3. Click password reset icon (key icon)
4. Confirm reset
5. Note new credentials
6. Sign out
7. Try logging in as student with NEW password

#### Expected Results:
- ✅ Reset confirmation dialog appears
- ✅ New credentials displayed
- ✅ Enrollment ID unchanged
- ✅ Password is new (8 characters)
- ✅ Can login with new password
- ✅ Cannot login with old password

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):
- **New Password:** _______________

---

### TEST 12: DIGITAL LIBRARY
**Priority:** MEDIUM  
**Estimated Time:** 5 minutes

#### Prerequisites:
- Logged in as Librarian
- Have a test PDF file ready

#### Steps:
1. Navigate to "Digital Library" tab
2. Click "Upload eBook" button
3. Select a PDF file
4. Enter title: "Test eBook"
5. Upload
6. Verify appears in list
7. Click download button
8. Verify file downloads

#### Expected Results:
- ✅ Upload form accepts PDF/EPUB
- ✅ Upload progress shown
- ✅ eBook appears in list
- ✅ Download generates signed URL
- ✅ File downloads successfully

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 13: ROLE-BASED ACCESS CONTROL
**Priority:** CRITICAL  
**Estimated Time:** 5 minutes

#### Test Matrix:

| Feature | Student | Staff | Librarian |
|---------|---------|-------|-----------|
| Dashboard | ✅ View | ✅ View | ✅ View |
| My Books | ✅ View | ✅ View | ❌ Hidden |
| Digital Library | ✅ View/Download | ✅ View/Download | ✅ Full |
| Books | ❌ Hidden | ✅ View/Edit | ✅ Full |
| Students | ❌ Hidden | ❌ Hidden | ✅ Full |
| Staff | ❌ Hidden | ❌ Hidden | ✅ Full |
| Librarians | ❌ Hidden | ❌ Hidden | ✅ Full |
| Login Logs | ❌ Hidden | ❌ Hidden | ✅ View |
| Borrowing | ❌ Hidden | ✅ Full | ✅ Full |
| Reservations | ✅ Own | ✅ Own | ✅ All |
| Leaderboard | ✅ View | ✅ View | ✅ View |
| Reviews | ✅ Create/View | ✅ View | ✅ View/Moderate |
| Challenges | ✅ Participate | ✅ View | ✅ Create/Manage |

#### Steps:
1. Login as each role type
2. Verify tab visibility matches table above
3. Try direct URL access to restricted pages
4. Verify appropriate error/redirect

#### Expected Results:
- ✅ Each role sees only authorized tabs
- ✅ Unauthorized access redirects or shows error
- ✅ No security errors in console

#### Actual Results:
- [ ] PASS - Student
- [ ] PASS - Staff
- [ ] PASS - Librarian
- [ ] FAIL (Describe issue):

---

### TEST 14: LOGIN LOGS (LIBRARIAN ONLY)
**Priority:** MEDIUM  
**Estimated Time:** 3 minutes

#### Prerequisites:
- Multiple logins performed in previous tests
- Logged in as Librarian

#### Steps:
1. Navigate to "Login Logs" tab
2. View all login attempts
3. Use search to find "Test Student Alpha" logins
4. Verify both successful and failed attempts logged

#### Expected Results:
- ✅ All previous logins visible
- ✅ Shows: Enrollment ID, User ID, Success status, Timestamp
- ✅ Filter by success/failure works
- ✅ Search functionality works

#### Database Verification:
```sql
-- Check login logs
SELECT 
  enrollment_id,
  user_id,
  success,
  login_at
FROM login_logs
ORDER BY login_at DESC
LIMIT 20;
```

#### Actual Results:
- [ ] PASS
- [ ] FAIL (Describe issue):

---

### TEST 15: EDGE FUNCTION ERROR HANDLING
**Priority:** HIGH  
**Estimated Time:** 5 minutes

#### Test Error Scenarios:

#### A. Duplicate Email
1. Try to register student with same parent email as Test 2
2. Expected: Error message "Email already in use"

#### B. Duplicate Enrollment ID (Should not happen with timestamp)
1. Try manual enrollment ID if possible
2. Expected: Error handling

#### C. Invalid Email Format
1. Try registering with invalid email
2. Expected: Form validation error

#### D. Missing Required Fields
1. Try submitting form with empty fields
2. Expected: Validation errors

#### Steps:
1. Test each scenario above
2. Verify appropriate error messages
3. Verify no partial data created on error
4. Check Supabase function logs for errors

#### Expected Results:
- ✅ All errors handled gracefully
- ✅ User-friendly error messages
- ✅ No data corruption on errors
- ✅ Errors logged in Supabase

#### Actual Results:
- [ ] PASS - Duplicate Email
- [ ] PASS - Invalid Format
- [ ] PASS - Missing Fields
- [ ] FAIL (Describe issue):

---

## 🔍 POST-TEST VERIFICATION

### Database Integrity Check

```sql
-- Count records created during tests
SELECT 'Students' AS table_name, COUNT(*) AS count FROM students WHERE name LIKE 'Test%'
UNION ALL
SELECT 'Staff', COUNT(*) FROM staff WHERE name LIKE 'Test%'
UNION ALL
SELECT 'Books', COUNT(*) FROM books WHERE title LIKE 'Test%'
UNION ALL
SELECT 'Borrow Records', COUNT(*) FROM borrow_records 
WHERE student_id IN (SELECT id FROM students WHERE name LIKE 'Test%')
UNION ALL
SELECT 'User Profiles', COUNT(*) FROM user_profiles WHERE full_name LIKE 'Test%'
UNION ALL
SELECT 'Auth Users', COUNT(*) FROM auth.users WHERE email LIKE '%test%example.com';

-- Verify no orphaned records
SELECT 'Orphaned Profiles' AS issue, COUNT(*) AS count
FROM user_profiles up
WHERE up.student_id IS NOT NULL 
AND NOT EXISTS (SELECT 1 FROM students WHERE id = up.student_id)
UNION ALL
SELECT 'Orphaned Borrows', COUNT(*)
FROM borrow_records br
WHERE br.student_id IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM students WHERE id = br.student_id);
```

### Performance Check

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT s.*, up.email, up.role
FROM students s
JOIN user_profiles up ON up.student_id = s.id
WHERE s.name LIKE 'Test%';

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('students', 'staff', 'user_profiles', 'books', 'borrow_records')
ORDER BY tablename, indexname;
```

---

## 📊 TEST RESULTS SUMMARY

### Overall Status: [ ] PASS [ ] FAIL

| Test # | Test Name | Status | Critical | Notes |
|--------|-----------|--------|----------|-------|
| 1 | Librarian Login | ⬜ | ✅ | |
| 2 | Student Registration | ⬜ | ✅ | |
| 3 | Parent Login as Student | ⬜ | ✅ | |
| 4 | Student View - My Books | ⬜ | | |
| 5 | Staff Registration | ⬜ | | |
| 6 | Staff Login | ⬜ | | |
| 7 | Book Management | ⬜ | | |
| 8 | Borrowing Workflow | ⬜ | ✅ | |
| 9 | Student View Borrowed | ⬜ | | |
| 10 | Return Book | ⬜ | | |
| 11 | Password Reset | ⬜ | | |
| 12 | Digital Library | ⬜ | | |
| 13 | Role-Based Access | ⬜ | ✅ | |
| 14 | Login Logs | ⬜ | | |
| 15 | Error Handling | ⬜ | | |

**Legend:** ✅ Critical Test | ⬜ Not Tested | ✔️ Pass | ❌ Fail

---

## 🐛 ISSUES FOUND

### Critical Issues
1. **Issue #:** ___
   - **Severity:** Critical/High/Medium/Low
   - **Component:** ___
   - **Description:** ___
   - **Steps to Reproduce:** ___
   - **Expected:** ___
   - **Actual:** ___
   - **Fix Required:** ___

### Non-Critical Issues
1. **Issue #:** ___
   - **Severity:** ___
   - **Component:** ___
   - **Description:** ___

---

## ✅ CLEANUP TASKS

After testing, run cleanup SQL:

```sql
-- Delete test data (BE CAREFUL - only in test environment!)
BEGIN;

-- Delete test borrow records
DELETE FROM borrow_records 
WHERE student_id IN (SELECT id FROM students WHERE name LIKE 'Test%')
OR staff_id IN (SELECT id FROM staff WHERE name LIKE 'Test%');

-- Delete test books
DELETE FROM books WHERE title LIKE 'Test%';

-- Delete test user profiles (will CASCADE to students/staff via FK)
DELETE FROM user_profiles WHERE full_name LIKE 'Test%';

-- Delete test auth users
-- Note: This requires admin access via Supabase dashboard

-- Verify cleanup
SELECT 'Remaining Test Students' AS type, COUNT(*) FROM students WHERE name LIKE 'Test%'
UNION ALL
SELECT 'Remaining Test Staff', COUNT(*) FROM staff WHERE name LIKE 'Test%'
UNION ALL
SELECT 'Remaining Test Profiles', COUNT(*) FROM user_profiles WHERE full_name LIKE 'Test%';

-- If all counts are 0, commit. Otherwise, rollback.
-- COMMIT;
-- ROLLBACK;

END;
```

---

## 📝 TESTER NOTES

### Environment Details:
- **Test Start Time:** ___________
- **Test End Time:** ___________
- **Total Duration:** ___________
- **Browser:** ___________
- **OS:** ___________

### Additional Observations:
___________________________________________
___________________________________________
___________________________________________

### Recommendations:
___________________________________________
___________________________________________
___________________________________________

---

## ✅ SIGN-OFF

**Tested By:** ___________________  
**Date:** ___________________  
**Signature:** ___________________

**Approved By:** ___________________  
**Date:** ___________________  
**Signature:** ___________________

---

**Document Version:** 1.0  
**Last Updated:** October 20, 2025
