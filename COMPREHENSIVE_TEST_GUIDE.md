# Comprehensive End-to-End Testing Guide

## Admin Credentials
- **Email:** iksotech@gmail.com
- **Password:** @ICTAdmin

## Test Execution Instructions

### Phase 1: Database Health Check

1. **Open Supabase SQL Editor**
2. **Run:** `comprehensive-test.sql`
3. **Review all outputs** and note any:
   - ❌ MISSING tables
   - Row counts that seem wrong (e.g., 0 staff when staff were created)
   - Missing RLS policies
   - Orphaned records
   - Missing admin user

### Phase 2: Browser Console Test

1. **Login as admin** (iksotech@gmail.com / @ICTAdmin)
2. **Open browser DevTools** (F12)
3. **Go to Console tab**
4. **Copy and paste** the entire contents of `comprehensive-e2e-test.js`
5. **Press Enter** to run the test
6. **Review the summary** at the end

### Phase 3: Manual UI Testing Checklist

#### Login & Authentication
- [ ] Can login with admin credentials
- [ ] Session persists on page reload
- [ ] Can logout successfully
- [ ] Login error messages display correctly

#### Dashboard
- [ ] Dashboard loads without errors
- [ ] Total Books stat shows correct count
- [ ] Total Students stat shows correct count
- [ ] Total Staff stat shows correct count (KNOWN ISSUE)
- [ ] Borrowed Books stat shows correct count
- [ ] Overdue Books stat shows correct count
- [ ] Top Reading Students list displays
- [ ] No 404 errors in Network tab

#### Student Management
- [ ] Can view list of students
- [ ] Can create new student with:
  - [ ] Valid enrollment ID generated
  - [ ] Temporary password generated
  - [ ] Student appears in database
  - [ ] Student can login with credentials
- [ ] Can edit student details
- [ ] Can delete student
- [ ] Student list updates after changes

#### Staff Management
- [ ] Can view list of staff (KNOWN ISSUE: may show empty)
- [ ] Can create new staff with:
  - [ ] Valid enrollment ID generated
  - [ ] Temporary password generated
  - [ ] Staff appears in database
  - [ ] Staff can login with credentials
- [ ] Can edit staff details
- [ ] Can delete staff
- [ ] Staff list updates after changes

#### Book Management
- [ ] Can view list of books
- [ ] Can add new book
- [ ] Can edit book details
- [ ] Can delete book
- [ ] Book status updates correctly
- [ ] Search/filter works

#### Borrowing System
- [ ] Can create borrow record for student
- [ ] Can create borrow record for staff
- [ ] Borrow record appears in active borrows
- [ ] Can mark book as returned
- [ ] Overdue detection works
- [ ] Book status changes to "borrowed" when borrowed
- [ ] Book status changes to "available" when returned

## Known Issues (To Be Fixed)

### Critical Issues
1. **Staff count shows 0 on dashboard** - Despite staff existing in DB
2. **borrow_records 404 errors** - Table may not exist or RLS blocking
3. **user_profiles query errors** - Potential RLS or missing data issues

### Potential Issues
- Staff/Student creation may not create DB records consistently
- Edge Function validation may be too permissive/restrictive
- RLS policies may block legitimate queries
- Missing indexes on frequently queried columns

## Expected Behavior After Fixes

### All Features Should:
1. ✅ Load without 404 errors
2. ✅ Display accurate data counts
3. ✅ Allow CRUD operations for librarian role
4. ✅ Create complete records (profile + student/staff + auth where applicable)
5. ✅ Enforce proper validation
6. ✅ Show meaningful error messages
7. ✅ Update UI immediately after changes

## Test Data Requirements

### Minimum Test Data:
- 1 Librarian account (iksotech@gmail.com)
- 3-5 Student accounts
- 2-3 Staff accounts
- 10+ Books
- 2-3 Active borrow records
- 1-2 Completed borrow records
- 1 Overdue borrow record (for testing)

## Reporting Issues

When reporting issues, include:
1. **What you did** (steps to reproduce)
2. **What you expected** to happen
3. **What actually happened**
4. **Error messages** from console
5. **Network tab** responses (if 404/500 errors)
6. **SQL query results** (if DB-related)
