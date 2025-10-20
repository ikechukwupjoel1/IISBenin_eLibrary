# Quick Test Checklist - IISBenin Library

## ⚡ IMMEDIATE ACTIONS (Do These Now)

### 1. Database Schema Check
Go to Supabase SQL Editor and run:

```sql
-- Check parent_email columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE (table_name = 'students' OR table_name = 'user_profiles')
AND column_name = 'parent_email';
```

**Expected:** Should return 2 rows (one for each table)  
**If Returns 0:** Run the ALTER TABLE commands from END_TO_END_TEST.md

### 2. Test Student Registration RIGHT NOW
1. Login to your app as Librarian
2. Go to Students tab
3. Click "Register Student"
4. Fill in:
   - Name: "Quick Test"
   - Grade: "Test Grade"
   - Parent Email: "quicktest@test.com"
5. Submit

**Watch for:**
- ✅ Credentials displayed?
- ✅ Student appears in list?
- ❌ Any error messages?

### 3. Verify in Database
```sql
SELECT 
  s.name,
  s.enrollment_id,
  s.parent_email,
  up.email,
  up.role
FROM students s
LEFT JOIN user_profiles up ON up.student_id = s.id
WHERE s.name = 'Quick Test';
```

**Expected:**
- Student row exists
- parent_email = 'quicktest@test.com'
- user_profiles.email = 'quicktest@test.com'
- user_profiles.role = 'student'

### 4. Test Login
1. Logout
2. Student tab
3. Use enrollment ID from step 2
4. Use password from step 2
5. Try to login

**Expected:** Should login successfully

---

## 🎯 Critical Path Test (30 Minutes)

### If time is limited, test ONLY these:

1. ✅ **Student Registration** (Test 2)
2. ✅ **Parent Login** (Test 3)
3. ✅ **Create Book** (Test 7)
4. ✅ **Borrow Book** (Test 8)
5. ✅ **Student Sees Book** (Test 9)

These 5 tests cover 80% of critical functionality.

---

## 📊 Status Indicators

### System is READY if:
- [ ] Parent email column exists in database
- [ ] Can register student with parent email
- [ ] Parent can login using student enrollment ID
- [ ] No errors in browser console
- [ ] No errors in Supabase function logs

### System NEEDS FIX if:
- [ ] Parent email not stored
- [ ] Edge Function errors in logs
- [ ] Cannot login with created credentials
- [ ] Database schema missing columns

---

## 🔧 If Test Fails, Check:

1. **Edge Function Logs** (Supabase Dashboard → Functions → Logs)
2. **Browser Console** (F12 → Console tab)
3. **Network Tab** (F12 → Network → Look for failed requests)
4. **Database Logs** (Supabase Dashboard → Database → Logs)

---

**Next Step:** Run full test suite from `END_TO_END_TEST.md`
