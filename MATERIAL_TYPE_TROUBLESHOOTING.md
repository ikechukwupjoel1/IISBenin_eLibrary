# 🔧 Material Type Not Saving - TROUBLESHOOTING GUIDE

## 🚨 CRITICAL: Database Migration Required

The most likely reason material types are not saving is that **the database columns don't exist yet**.

---

## ✅ Step 1: Check if Columns Exist

Run this SQL query in Supabase SQL Editor:

```sql
-- File: CHECK_MATERIAL_TYPE_COLUMNS.sql
```

**What to look for:**
- If it shows "❌ material_type column DOES NOT EXIST" → **You MUST run Step 2**
- If it shows "✅ material_type column EXISTS" → **Go to Step 3 for debugging**

---

## ✅ Step 2: Add the Missing Columns (REQUIRED)

If columns don't exist, run this in Supabase SQL Editor:

```sql
-- File: ADD_MATERIAL_TYPE_COLUMNS.sql
-- This will:
-- 1. Add material_type column
-- 2. Add page_number column  
-- 3. Auto-update all existing books based on their category
```

**After running, you should see:**
```
✅ MATERIAL TYPE COLUMNS ADDED SUCCESSFULLY!
📚 Physical Books: XX
📱 eBooks: XX
💻 Electronic Materials: XX
```

---

## ✅ Step 3: Test Adding a New eBook

1. **Open the app**: https://iisbeninelibrary-fvyjphpbl-joel-prince-a-ikechukwus-projects.vercel.app

2. **Go to Book Management**

3. **Click "Add New Book"**

4. **Fill in the form:**
   - Title: "Test eBook"
   - Author: "Test Author"
   - **Category: "Science eBook"** ← Select this
   - **Material Type:** Should auto-change to "📱 eBook" (watch for green checkmark)
   - Upload Method: URL or File
   - URL/File: Enter a URL or upload a PDF
   - Page Number: "100 pages"

5. **Before clicking Submit:**
   - Open browser DevTools (F12)
   - Go to Console tab
   - Click Submit

6. **Check Console Output:**
   You should see:
   ```
   📝 Form Data: {material_type: "ebook", ...}
   📤 Submitting to database: {material_type: "ebook", ...}
   🏷️ Material Type: ebook
   ```

7. **If you see `material_type: "book"` instead:**
   - The category dropdown didn't trigger auto-detection
   - Manually change Material Type dropdown to "📱 eBook"
   - Submit again

---

## 🔍 Step 4: Verify in Database

Run this query to see what was actually saved:

```sql
SELECT 
  id,
  title,
  category,
  material_type,
  page_number,
  created_at
FROM books
ORDER BY created_at DESC
LIMIT 5;
```

**What you should see:**
- For ebooks: `material_type = 'ebook'`
- For electronic materials: `material_type = 'electronic_material'`
- For physical books: `material_type = 'book'`

---

## 🐛 Troubleshooting Scenarios

### Scenario A: Console shows "material_type: book" even after selecting ebook category

**Problem**: Category change handler not firing

**Solution**: 
1. Manually select Material Type dropdown to "📱 eBook"
2. Check if page number field appears
3. If it appears, submit the form
4. Check console logs again

### Scenario B: Database shows NULL for material_type

**Problem**: Column doesn't exist or database error

**Solution**:
1. Run `CHECK_MATERIAL_TYPE_COLUMNS.sql` to verify columns exist
2. If they don't exist, run `ADD_MATERIAL_TYPE_COLUMNS.sql`
3. Check browser console for database errors (red text)
4. Screenshot any errors and share them

### Scenario C: Form submits but material_type stays as "book"

**Problem**: Database default value overriding

**Solution**:
```sql
-- Change the default value
ALTER TABLE books 
ALTER COLUMN material_type DROP DEFAULT;

-- Then try submitting again
```

### Scenario D: Auto-detection not working

**Problem**: Category name doesn't match detection keywords

**Solution**: Use these exact category names:
- "Science eBook" ✅
- "Mathematics eBook" ✅
- "Science Electronic Material" ✅
- "History eBook" ✅

Or manually select Material Type before submitting.

---

## 📝 Manual Fix for Existing Books

If you have books that were saved incorrectly:

```sql
-- Fix a specific book
UPDATE books 
SET material_type = 'ebook',
    page_number = '250 pages'
WHERE id = 'YOUR_BOOK_ID_HERE';

-- Fix all books with ebook in category
UPDATE books 
SET material_type = 'ebook'
WHERE category ILIKE '%ebook%'
  AND (material_type IS NULL OR material_type = 'book');

-- Fix all electronic materials
UPDATE books 
SET material_type = 'electronic_material'
WHERE category ILIKE '%electronic%'
  AND (material_type IS NULL OR material_type = 'book');
```

---

## 🎯 Expected Behavior After Fix

### When Adding Physical Book:
1. Select category: "Science" or "Mathematics"
2. Material Type: Stays as "📚 Physical Book"
3. ISBN field visible
4. Submit → Saves as `material_type: 'book'`

### When Adding eBook:
1. Select category: "Science eBook"
2. Material Type: Auto-changes to "📱 eBook" (green checkmark appears)
3. Upload Method appears (URL or File)
4. Page Number field appears
5. Submit → Saves as `material_type: 'ebook'`

### In Digital Library:
- All ebooks (material_type='ebook') should appear
- Page number shows instead of ISBN
- Clicking "Access" opens the URL

### In Book Management Table:
- Type column shows: 📚 Physical, 📱 eBook, or 💻 Digital
- ISBN/Pages column shows:
  - ISBN for physical books
  - Page number for digital materials

---

## 🆘 If Nothing Works

**Share these details:**

1. **Console logs** when submitting (screenshot the 3 log lines)
2. **Database column check** results (from CHECK_MATERIAL_TYPE_COLUMNS.sql)
3. **Sample book query** results:
   ```sql
   SELECT id, title, category, material_type, page_number 
   FROM books 
   WHERE title ILIKE '%test%'
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Any error messages** from browser console (red text)

---

## 📊 Quick Verification Checklist

- [ ] Ran CHECK_MATERIAL_TYPE_COLUMNS.sql
- [ ] Columns exist (material_type, page_number)
- [ ] Ran ADD_MATERIAL_TYPE_COLUMNS.sql (if needed)
- [ ] Tested adding new ebook with console open
- [ ] Console shows correct material_type value
- [ ] Queried database to verify saved correctly
- [ ] Digital Library shows the ebook
- [ ] Table shows material type badge correctly

---

## 🔗 Production URL

https://iisbeninelibrary-fvyjphpbl-joel-prince-a-ikechukwus-projects.vercel.app

**Debug logging is now active!** Check browser console when submitting forms.
