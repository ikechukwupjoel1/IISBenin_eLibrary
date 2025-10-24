# 📊 Database Migration Guide

## Running the Book Reports System Migration

This guide walks you through deploying the book reports verification system to your production Supabase database.

---

## 🎯 Pre-Migration Checklist

- [ ] Backup your current database
- [ ] Have Supabase project URL and API keys ready
- [ ] Review the migration file: `supabase/migrations/20251024_add_book_reports_system.sql`
- [ ] Ensure you're connected to the correct project (production)

---

## 🚀 Method 1: Supabase Dashboard (Recommended)

### Step 1: Access SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your **IISBenin_eLibrary** project
3. Click **SQL Editor** in the left sidebar

### Step 2: Load Migration File

1. Click **+ New Query**
2. Open the migration file: `supabase/migrations/20251024_add_book_reports_system.sql`
3. Copy the entire contents
4. Paste into the SQL Editor

### Step 3: Execute Migration

1. Review the SQL (creates 5 tables + RLS policies + functions)
2. Click **Run** (or press Ctrl+Enter)
3. Wait for completion (should take ~2-5 seconds)
4. Check for success message: "Success. No rows returned"

### Step 4: Verify Tables Created

Run this verification query:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'book_reports',
  'reading_questions',
  'reading_answers',
  'reading_progress',
  'report_reviewers'
)
ORDER BY table_name;
```

**Expected Result:** Should return 5 rows (all 5 tables)

---

## 🔧 Method 2: Supabase CLI

### Prerequisites

```powershell
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_ID
```

### Run Migration

```powershell
# Navigate to project directory
cd C:\Users\owner\Downloads\IISBenin_eLibrary

# Run the migration
supabase db push

# Or run specific migration file
supabase migration up 20251024_add_book_reports_system
```

---

## ✅ Post-Migration Verification

### 1. Check Table Structure

```sql
-- Verify book_reports table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'book_reports'
ORDER BY ordinal_position;
```

**Expected columns:** id, borrow_id, book_id, user_id, title, summary, favorite_part, main_characters, lessons_learned, rating, pages_read, time_spent_minutes, completion_percentage, status, reviewed_by, reviewed_at, librarian_feedback, points_awarded, quality_score, created_at, updated_at

### 2. Verify RLS Policies

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN (
  'book_reports',
  'reading_questions',
  'reading_answers',
  'reading_progress',
  'report_reviewers'
)
ORDER BY tablename, policyname;
```

**Expected:** 16 policies total (4 per table except report_reviewers with 4)

### 3. Test Functions

```sql
-- Test calculate_reading_points function
SELECT calculate_reading_points('00000000-0000-0000-0000-000000000000'::uuid);
-- Should return: 10 (even with invalid ID, shows function exists)
```

### 4. Check RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'book_reports',
  'reading_questions',
  'reading_answers',
  'reading_progress',
  'report_reviewers'
);
```

**Expected:** All tables should have `rowsecurity = true`

---

## 📊 Tables Created

### 1. **book_reports** (Main table)
- Stores student book reports with reviews
- Fields: summary, favorite_part, main_characters, lessons_learned, rating
- Status workflow: pending → approved/rejected/revision_needed
- Points awarded: 10-25 based on quality

### 2. **reading_questions** (Optional quizzes)
- Librarians can add comprehension questions per book
- Types: open-ended or multiple choice
- Used for additional verification

### 3. **reading_answers** (Quiz responses)
- Student answers to reading questions
- Auto-scored for multiple choice
- Linked to book reports

### 4. **reading_progress** (Session tracking)
- Track current page and reading sessions
- Time spent and pages read per day
- Supports progress visualization

### 5. **report_reviewers** (Staff permissions)
- Configurable staff review access
- Scopes: all reports or subject-specific
- Assigned by librarians

---

## 🔐 RLS Policies Summary

| Table | Students | Librarians | Staff (Authorized) |
|-------|----------|------------|-------------------|
| book_reports | View own, Create own, Update pending | View all, Update all | View all, Update all |
| reading_questions | View all | Manage all | View all |
| reading_answers | View own, Create own | View all | View all |
| reading_progress | View/Update own | View all | View all |
| report_reviewers | - | View all, Manage all | View own status |

---

## 🎯 Functions Created

### 1. `calculate_reading_points(report_id uuid) → integer`

Calculates points for a book report:
- Base: 10 points
- Quality bonus: 0-10 points (quality_score / 10)
- Completion bonus: 0-5 points (100%=5, 80%=3, 50%=1)
- Returns: Total points (10-25)

### 2. `approve_book_report(report_id uuid, quality_score integer, feedback text) → json`

Approves a report and awards points:
- Calculates points automatically
- Updates report status to 'approved'
- Records reviewer and timestamp
- Returns JSON: `{success: true, points_awarded: X, quality_score: Y}`

---

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created. Safe to ignore or drop and recreate:
```sql
DROP TABLE IF EXISTS book_reports CASCADE;
-- Then re-run migration
```

### Error: "permission denied"
**Solution:** Ensure you're connected as database owner or have SUPERUSER role.

### Error: "function does not exist"
**Solution:** Check PostgreSQL version (needs 12+). Re-run function creation section.

### RLS Blocking Access
**Solution:** Verify user roles in `user_profiles` table:
```sql
SELECT id, full_name, role FROM user_profiles WHERE role IN ('librarian', 'staff');
```

---

## 🎉 Success Indicators

After migration, you should see:

✅ **Dashboard:** "Pending Reports" stat card appears for librarians/staff  
✅ **Navigation:** "Book Reports" menu item visible  
✅ **MyBooks:** Book report submission available for returned books  
✅ **Leaderboard:** Shows points (not just book counts)  
✅ **No Errors:** Application loads without database errors

---

## 📞 Need Help?

If migration fails or you encounter issues:

1. **Check Supabase Logs:** Project Settings → Database → Logs
2. **Verify Connection:** Test with simple query: `SELECT current_database();`
3. **Review Error Messages:** Copy full error text for debugging
4. **Backup First:** Always backup before modifying production

---

## 🔄 Rollback (If Needed)

To undo the migration:

```sql
-- Drop tables in reverse order (handles foreign keys)
DROP TABLE IF EXISTS reading_answers CASCADE;
DROP TABLE IF EXISTS reading_questions CASCADE;
DROP TABLE IF EXISTS reading_progress CASCADE;
DROP TABLE IF EXISTS report_reviewers CASCADE;
DROP TABLE IF EXISTS book_reports CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS calculate_reading_points(uuid);
DROP FUNCTION IF EXISTS approve_book_report(uuid, integer, text);
```

---

**Migration File:** `supabase/migrations/20251024_add_book_reports_system.sql`  
**Status:** Ready for production deployment  
**Estimated Time:** 2-5 seconds  
**Impact:** No downtime, adds new features only
