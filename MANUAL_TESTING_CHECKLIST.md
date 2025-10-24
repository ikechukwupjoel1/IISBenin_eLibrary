# MANUAL TESTING CHECKLIST - IISBenin Library System

**Instructions:** Open http://localhost:5173/ in your browser and follow these tests systematically. Check each box as you complete it.

---

## 🔐 AUTHENTICATION TESTING

### Librarian Login
- [ ] Navigate to login page
- [ ] Select "Librarian" tab
- [ ] Enter: librarian@iisbenin.com
- [ ] Enter: AdminLib2025!
- [ ] Click "Sign In"
- [ ] ✅ **EXPECTED:** Dashboard loads, shows "Welcome, [name] (librarian)"

### Session Persistence
- [ ] While logged in, press F5 to refresh page
- [ ] ✅ **EXPECTED:** Still logged in, no redirect to login

### Logout
- [ ] Click "Sign Out" button
- [ ] ✅ **EXPECTED:** Redirected to login page
- [ ] Try clicking browser back button
- [ ] ✅ **EXPECTED:** Cannot access dashboard, stays on login

### Invalid Login Attempts
- [ ] Try login with wrong password
- [ ] ✅ **EXPECTED:** Error message displayed
- [ ] Try login with non-existent email
- [ ] ✅ **EXPECTED:** Error message displayed

### Password Validation (Librarian)
- [ ] Enter valid email
- [ ] Enter weak password (e.g., "12345")
- [ ] ✅ **EXPECTED:** Sign In button disabled, error shown below password field
- [ ] Enter password missing uppercase
- [ ] ✅ **EXPECTED:** Error: "Password must contain uppercase letter"
- [ ] Enter password missing special char
- [ ] ✅ **EXPECTED:** Error: "Password must contain special character"

---

## 📚 BOOK MANAGEMENT TESTING

### Add New Book
- [ ] Login as librarian
- [ ] Click "Books" tab
- [ ] Click "Add New Book" button
- [ ] Fill in all fields:
  - Title: "Test Book 2024"
  - Author: "Test Author"
  - ISBN: 9781234567897 (valid ISBN-13)
  - Category: "Fiction"
  - Publisher: "Test Publisher"
  - Publication Year: 2024
  - Description: "This is a test book"
  - Quantity: 5
- [ ] Click "Add Book"
- [ ] ✅ **EXPECTED:** Success toast, book appears in list

### Upload Book Cover
- [ ] In book form, click "Choose File"
- [ ] Select an image file (JPG/PNG)
- [ ] ✅ **EXPECTED:** Image preview shows
- [ ] Save book
- [ ] ✅ **EXPECTED:** Cover image displays in book list

### ISBN Validation
- [ ] Try to add book with invalid ISBN: "123"
- [ ] ✅ **EXPECTED:** Error message about invalid ISBN
- [ ] Try valid ISBN-10: 0123456789
- [ ] ✅ **EXPECTED:** Accepted
- [ ] Try valid ISBN-13: 9781234567897
- [ ] ✅ **EXPECTED:** Accepted

### Duplicate ISBN Prevention
- [ ] Try to add book with same ISBN as existing book
- [ ] ✅ **EXPECTED:** Error message preventing duplicate

### Edit Book
- [ ] Click edit icon on a book
- [ ] Change title to "Test Book EDITED"
- [ ] Click "Save Changes"
- [ ] ✅ **EXPECTED:** Book updated in list

### Delete Book
- [ ] Click delete icon on test book
- [ ] Confirm deletion
- [ ] ✅ **EXPECTED:** Book removed from list

### Search Books
- [ ] Use search bar, type "Test"
- [ ] ✅ **EXPECTED:** Only matching books shown
- [ ] Clear search
- [ ] ✅ **EXPECTED:** All books shown again

### Filter by Category
- [ ] Select "Fiction" category filter
- [ ] ✅ **EXPECTED:** Only fiction books shown

---

## 👥 STUDENT MANAGEMENT TESTING

### Add Student Manually
- [ ] Click "Students" tab
- [ ] Click "Add New Student"
- [ ] Fill form:
  - Full Name: "Test Student One"
  - Parent Email: teststudent1@example.com
  - Phone: +2290153077528
  - Grade: "Grade 7"
- [ ] Click "Add Student"
- [ ] ✅ **EXPECTED:** Student added, enrollment ID auto-generated (STU########)
- [ ] Note the enrollment ID: _______________
- [ ] Note the password shown: _______________

### Phone Number Validation
- [ ] Try adding student with invalid phone: "12345"
- [ ] ✅ **EXPECTED:** Validation error
- [ ] Try +229 format: +2290153077528
- [ ] ✅ **EXPECTED:** Accepted
- [ ] Try without country code: 0153077528
- [ ] ✅ **EXPECTED:** Accepted

### Test Student Login
- [ ] Logout from librarian account
- [ ] Select "Student" tab
- [ ] Enter enrollment ID from above
- [ ] Enter password from above
- [ ] Click "Sign In"
- [ ] ✅ **EXPECTED:** Login successful, sees student dashboard

### Student Tabs Access
- [ ] Check visible tabs as student
- [ ] ✅ **EXPECTED:** Should see: Dashboard, Messages, My Books, Digital Library, Reservations, Waiting Lists, Book Clubs, Leaderboard, My Progress, Reviews, Challenges, Change Password
- [ ] ✅ **EXPECTED:** Should NOT see: Books, Students, Staff, Analytics, etc.

### Bulk Student Upload
- [ ] Login as librarian again
- [ ] Click "Bulk Register Users" tab
- [ ] Select "Student" user type
- [ ] Click "Download Template"
- [ ] ✅ **EXPECTED:** CSV file downloads with headers: Name,Grade,Parent Email
- [ ] Open test-students-benin-format.csv
- [ ] Upload this file
- [ ] Click "Upload Users"
- [ ] ✅ **EXPECTED:** Success message, students added
- [ ] Check "Students" tab to verify

### Edit Student
- [ ] Click edit on a student
- [ ] Change grade to "Grade 8"
- [ ] Click "Save"
- [ ] ✅ **EXPECTED:** Student updated

### Delete Student
- [ ] Click delete on test student
- [ ] Confirm deletion
- [ ] ✅ **EXPECTED:** Student removed

---

## 👔 STAFF MANAGEMENT TESTING

### Add Staff Member
- [ ] Click "Staff" tab
- [ ] Click "Add New Staff"
- [ ] Fill form:
  - Full Name: "Test Staff One"
  - Email: teststaff1@example.com
  - Phone: +2290153077528
  - Department: "Administration"
  - Position: "Library Assistant"
- [ ] Click "Add Staff"
- [ ] ✅ **EXPECTED:** Staff added, enrollment ID and password shown
- [ ] Note enrollment ID: _______________
- [ ] Note password: _______________

### Test Staff Login
- [ ] Logout
- [ ] Select "Staff" tab
- [ ] Enter staff enrollment ID
- [ ] Enter staff password
- [ ] Click "Sign In"
- [ ] ✅ **EXPECTED:** Login successful

### Staff Tabs Access
- [ ] Check visible tabs as staff
- [ ] ✅ **EXPECTED:** Can see: Dashboard, Messages, My Books, Digital Library, Books, Borrowing, Reservations, etc.
- [ ] ✅ **EXPECTED:** Cannot see: Students, Staff, Librarians, Analytics, Settings

---

## 📖 BORROWING SYSTEM TESTING

### Borrow Book (As Student)
- [ ] Login as test student
- [ ] Click "My Books" tab
- [ ] Find an available book
- [ ] Click "Borrow" button
- [ ] ✅ **EXPECTED:** Book borrowed, shows in "Currently Borrowed" section
- [ ] ✅ **EXPECTED:** Due date shown (14 days from now)

### View Borrowed Books
- [ ] Check "My Books" tab
- [ ] ✅ **EXPECTED:** Shows borrowed book with due date
- [ ] ✅ **EXPECTED:** Shows borrow history

### Return Book
- [ ] Click "Return" button on borrowed book
- [ ] Confirm return
- [ ] ✅ **EXPECTED:** Book moved to history, available quantity increased

### Overdue Detection
- [ ] Login as librarian
- [ ] Click "Borrowing" tab
- [ ] ✅ **EXPECTED:** Can see all borrow records
- [ ] ✅ **EXPECTED:** Overdue books highlighted in red (if any)

### Borrow Limits
- [ ] As student, try to borrow multiple books
- [ ] ✅ **EXPECTED:** If limit exists, should block after max reached

---

## 💬 CHAT MESSAGING TESTING

### Send Text Message
- [ ] Login as any user
- [ ] Click "Messages" tab
- [ ] Type message in text area
- [ ] Click "Send"
- [ ] ✅ **EXPECTED:** Message appears in chat feed immediately

### Upload File Attachment
- [ ] In message box, click attachment button
- [ ] Select a file (image, PDF, etc.)
- [ ] Send message
- [ ] ✅ **EXPECTED:** File uploaded, download link shown

### Realtime Updates
- [ ] Open browser in incognito window
- [ ] Login as different user
- [ ] Send message
- [ ] Check original browser
- [ ] ✅ **EXPECTED:** New message appears without refresh

### Emoji Reactions
- [ ] Hover over a message
- [ ] Click reaction button
- [ ] Select emoji
- [ ] ✅ **EXPECTED:** Emoji added to message
- [ ] Click same emoji again
- [ ] ✅ **EXPECTED:** Reaction removed

---

## 🔍 SEARCH & FILTER TESTING

### Book Search
- [ ] Go to book library view
- [ ] Use search: "Fiction"
- [ ] ✅ **EXPECTED:** Results update live as you type
- [ ] Test search by author
- [ ] ✅ **EXPECTED:** Finds books by that author
- [ ] Test search by ISBN
- [ ] ✅ **EXPECTED:** Finds exact book

### Advanced Filters
- [ ] Apply category filter
- [ ] Apply availability filter (available only)
- [ ] Combine search with filters
- [ ] ✅ **EXPECTED:** Results match all criteria

### Student Search
- [ ] In Students tab, use search bar
- [ ] Search by name
- [ ] ✅ **EXPECTED:** Matching students shown
- [ ] Search by enrollment ID
- [ ] ✅ **EXPECTED:** Exact match found

---

## 📊 ANALYTICS & REPORTS TESTING

### View Analytics Dashboard
- [ ] Login as librarian
- [ ] Click "Analytics" tab
- [ ] ✅ **EXPECTED:** Charts and statistics load
- [ ] ✅ **EXPECTED:** Shows: Total books, borrowed, students, etc.
- [ ] ✅ **EXPECTED:** Borrow trends chart displays

### Generate Reports
- [ ] Click "Reports" tab
- [ ] Select date range
- [ ] Select report type
- [ ] Click "Generate Report"
- [ ] ✅ **EXPECTED:** Report displays
- [ ] Click "Export to CSV"
- [ ] ✅ **EXPECTED:** CSV file downloads

### Login Logs
- [ ] Click "Security Logs" tab
- [ ] ✅ **EXPECTED:** Shows all login attempts
- [ ] ✅ **EXPECTED:** Shows success/fail status
- [ ] Filter by role
- [ ] ✅ **EXPECTED:** Filtered results shown

---

## 🎯 ENGAGEMENT FEATURES TESTING

### Reading Streaks
- [ ] Login as student
- [ ] Click "My Progress" tab
- [ ] ✅ **EXPECTED:** Shows current streak
- [ ] ✅ **EXPECTED:** Shows reading history calendar

### Leaderboard
- [ ] Click "Leaderboard" tab
- [ ] ✅ **EXPECTED:** Shows top readers
- [ ] ✅ **EXPECTED:** Rankings displayed correctly

### Book Clubs
- [ ] Click "Book Clubs" tab
- [ ] Click "Create Club"
- [ ] Fill in club details
- [ ] ✅ **EXPECTED:** Club created
- [ ] Join a club
- [ ] ✅ **EXPECTED:** Membership confirmed

### Waiting Lists
- [ ] Find a book with 0 available copies
- [ ] Click "Add to Waiting List"
- [ ] ✅ **EXPECTED:** Added to queue
- [ ] ✅ **EXPECTED:** Position shown (e.g., "You are #3 in queue")

### Book Reviews
- [ ] Click "Reviews" tab
- [ ] Select a book
- [ ] Write review
- [ ] Give star rating
- [ ] Submit
- [ ] ✅ **EXPECTED:** Review saved

---

## ⚡ PERFORMANCE TESTING

### Page Load Times
- [ ] Clear browser cache
- [ ] Navigate to dashboard
- [ ] Use browser DevTools Performance tab
- [ ] ✅ **TARGET:** Page loads in < 3 seconds

### Large Dataset Handling
- [ ] Go to Books tab (if you have 50+ books)
- [ ] Test pagination
- [ ] ✅ **EXPECTED:** Smooth pagination, no lag
- [ ] Scroll through long lists
- [ ] ✅ **EXPECTED:** No freezing

### Network Throttling
- [ ] Open DevTools → Network tab
- [ ] Set to "Slow 3G"
- [ ] Navigate between pages
- [ ] ✅ **EXPECTED:** Loading indicators show
- [ ] ✅ **EXPECTED:** UI remains responsive

---

## 🔒 SECURITY TESTING

### Unauthorized Access Attempts
- [ ] Login as student
- [ ] Try to manually navigate to: /librarian-analytics
- [ ] ✅ **EXPECTED:** Blocked or shows "Access Denied"
- [ ] Try accessing staff management
- [ ] ✅ **EXPECTED:** Cannot see or access

### XSS Prevention
- [ ] In a text field, enter: `<script>alert('XSS')</script>`
- [ ] Submit form
- [ ] ✅ **EXPECTED:** Text escaped, no script executes

### SQL Injection Test
- [ ] In search field, enter: `'; DROP TABLE books; --`
- [ ] ✅ **EXPECTED:** Treated as text, no database error

---

## 📱 MOBILE RESPONSIVENESS TESTING

### Viewport Testing
- [ ] Open DevTools (F12)
- [ ] Click device toolbar (Ctrl+Shift+M)
- [ ] Select "iPhone 12 Pro"
- [ ] ✅ **EXPECTED:** Layout adjusts properly

### Touch Targets
- [ ] On mobile view, check button sizes
- [ ] ✅ **EXPECTED:** Buttons are at least 44x44px
- [ ] Test tapping buttons
- [ ] ✅ **EXPECTED:** No accidental clicks

### Orientation Changes
- [ ] Rotate device (landscape)
- [ ] ✅ **EXPECTED:** Layout adjusts
- [ ] Rotate back (portrait)
- [ ] ✅ **EXPECTED:** Still readable

### Mobile Navigation
- [ ] Check hamburger menu (if present)
- [ ] Test swipe gestures
- [ ] ✅ **EXPECTED:** Navigation works smoothly

---

## 🔧 ERROR HANDLING TESTING

### Network Errors
- [ ] Disconnect internet
- [ ] Try to perform action
- [ ] ✅ **EXPECTED:** Error message shown
- [ ] NetworkStatus indicator shows offline

### Invalid Form Submissions
- [ ] Try to submit form with empty required fields
- [ ] ✅ **EXPECTED:** Validation errors shown
- [ ] Fields highlighted in red

### Error Boundary
- [ ] Check if Error Boundary is working
- [ ] ✅ **EXPECTED:** If error occurs, shows friendly error page
- [ ] ✅ **EXPECTED:** "Refresh Page" button works

---

## ✅ FINAL CHECKLIST

- [ ] All authentication flows tested
- [ ] Book CRUD operations work
- [ ] Student/Staff management functional
- [ ] Borrowing system operational
- [ ] Chat messaging works
- [ ] File uploads successful
- [ ] Search and filters accurate
- [ ] Analytics display correctly
- [ ] Reports generate successfully
- [ ] Performance acceptable (< 3s loads)
- [ ] Mobile responsive
- [ ] Security measures in place
- [ ] Error handling graceful
- [ ] No console errors
- [ ] No broken images
- [ ] All links work

---

## 📋 ISSUES FOUND

**Record any issues below:**

### CRITICAL (Blocks Launch)
1. 
2. 

### HIGH PRIORITY (Fix Before Launch)
1. 
2. 

### MEDIUM PRIORITY (Can Fix Post-Launch)
1. 
2. 

### LOW PRIORITY (Nice to Have)
1. 
2. 

---

## 📊 TESTING SUMMARY

- **Total Tests:** ~150
- **Tests Passed:** ___/150
- **Tests Failed:** ___/150
- **Pass Rate:** ___%

**Recommendation:** 
- [ ] READY FOR LAUNCH
- [ ] NEEDS FIXES BEFORE LAUNCH
- [ ] NOT READY - MAJOR ISSUES

**Sign off:** _________________ Date: _________
