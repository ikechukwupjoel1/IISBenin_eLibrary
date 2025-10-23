# Supabase Storage Bucket Setup Guide

## Step-by-Step Instructions

### Part 1: Create Storage Bucket (10 minutes)

#### 1. Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Login to your account
3. Select your project: **IISBenin_eLibrary**

#### 2. Navigate to Storage
1. Click **Storage** in the left sidebar
2. Click **"Create a new bucket"** button

#### 3. Create the Bucket
**Bucket Configuration:**
- **Name:** `message-attachments` (EXACTLY this - case sensitive)
- **Public bucket:** ❌ **UNCHECK** (keep it private)
- **File size limit:** 10 MB (recommended)
- **Allowed MIME types:** Leave empty (allow all types) or specify:
  - `image/*`
  - `application/pdf`
  - `text/*`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.*`

#### 4. Add Storage Policies

After creating the bucket, click on **"message-attachments"** → **"Policies"** tab

**Policy 1: Allow Authenticated Users to Upload**

1. Click **"New Policy"** button
2. Select **"Create a policy from scratch"** (or skip to Alternative method below)
3. Fill in the form:

- **Policy Name:** `Authenticated users can upload files`
- **Allowed operation:** SELECT `INSERT`
- **Target roles:** SELECT `authenticated`
- **USING expression:** (leave empty for INSERT)
- **WITH CHECK expression:**
```sql
bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Allow Users to Read Their Files**

1. Click **"New Policy"** button again
2. Fill in:

- **Policy Name:** `Users can read files in their conversations`
- **Allowed operation:** SELECT `SELECT`
- **Target roles:** SELECT `authenticated`
- **USING expression:**
```sql
bucket_id = 'message-attachments'
```
- **WITH CHECK expression:** (leave empty for SELECT)

**Policy 3: Allow Users to Delete Their Files**

1. Click **"New Policy"** button again
2. Fill in:

- **Policy Name:** `Users can delete their own files`
- **Allowed operation:** SELECT `DELETE`
- **Target roles:** SELECT `authenticated`
- **USING expression:**
```sql
bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]
```
- **WITH CHECK expression:** (leave empty for DELETE)

---

#### 5. EASIER Alternative: Use Policy Templates ⭐ RECOMMENDED

If the above seems complex, use Supabase's built-in templates:

1. Click **"New Policy"** button
2. Choose **"Get started quickly with a template"**
3. Select: **"Enable insert for authenticated users only"**
4. Click **"Use this template"**
5. Click **"Review"** then **"Save policy"**

Repeat for SELECT and DELETE:
- **Template 2:** "Enable read access for authenticated users only" 
- **Template 3:** "Enable delete for authenticated users only"

✅ This automatically creates correct policies without writing SQL!

---

#### 6. Verify Setup
1. Go to **Storage** → **"message-attachments"**
2. Try uploading a test file manually
3. Check that policies show **3 policies enabled**

---

## Part 2: Run Database Migrations (5 minutes)

**IMPORTANT:** Do this BEFORE creating the librarian account!

#### 1. Access SQL Editor
1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **"New query"**

#### 2. Run Migration Script
1. Open `RUN_ALL_CRITICAL_MIGRATIONS.sql` in VS Code
2. **Copy the ENTIRE file** (all 214 lines)
3. **Paste** into Supabase SQL Editor
4. Click **"Run"** button (or press Ctrl+Enter)

#### 3. Verify Success
You should see output like:
```
▶ Migration 1/3: Adding message attachments support...
✅ Migration 1/3: Message attachments columns added
▶ Migration 2/3: Creating message reactions table...
✅ Migration 2/3: Message reactions table created with RLS policies
▶ Migration 3/3: Updating books table for bulk upload support...
✅ Migration 3/3: Books table updated successfully

====================================================================
MIGRATION VERIFICATION
====================================================================
✓ Message attachment columns: 4 (expected: 4)
✓ Message reactions table exists: true
✓ Books table new columns: 7 (expected: 7)

🎉 ALL MIGRATIONS COMPLETED SUCCESSFULLY!
====================================================================
```

#### 4. If Errors Occur
- Check that you copied the entire script
- Ensure you have the correct database selected
- Try running each migration section separately
- Check the error message for specific issues

---

## Part 3: Create Initial Librarian Account (5 minutes)

#### 1. Clear Browser Data
1. Open **Incognito/Private window** (recommended)
   - Chrome: `Ctrl+Shift+N`
   - Firefox: `Ctrl+Shift+P`
   - Edge: `Ctrl+Shift+N`

2. Or clear site data:
   - Press `F12` (Developer Tools)
   - Go to **Application** tab
   - Click **"Clear site data"**

#### 2. Access the Application
1. Go to: https://iisbeninelibrary-kjvnquooz-joel-prince-a-ikechukwus-projects.vercel.app
2. You should see the **LibrarianSetup** screen
   - If you see login screen instead, there's already an account

#### 3. Complete Librarian Registration

**Fill in the form:**

**Email:** `admin@iisbenin.edu.ng` (recommended)
- Or use your actual email address
- This will be the main admin account

**Full Name:** `IIS Benin Administrator` (or your name)

**Password Requirements:** ⚠️ IMPORTANT
- **Minimum 10 characters**
- **Must include:**
  - ✅ At least one UPPERCASE letter
  - ✅ At least one lowercase letter
  - ✅ At least one number (0-9)
  - ✅ At least one special character (!@#$%^&*)

**Example Strong Password:**
```
AdminLib2025!
IISBenin@2025
Librarian#123
```

⚠️ **SAVE THIS PASSWORD SECURELY!** You won't be able to recover it easily.

#### 4. Submit Registration
1. Click **"Create Librarian Account"**
2. Wait for success message
3. You should be automatically logged in

#### 5. Verify Account Created
1. You should see the **Dashboard**
2. Check that your name appears in the top navigation
3. Try logging out and logging back in to verify

#### 6. Alternative: Create via Supabase Dashboard

If the LibrarianSetup screen doesn't appear:

1. Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add user"** → **"Create new user"**
3. Enter email and password (same requirements)
4. Go to **SQL Editor** and run:
```sql
-- Insert librarian record
INSERT INTO staff (enrollment_id, full_name, email, password_hash, department, position)
VALUES (
  'STA' || to_char(now(), 'HHMMSS') || floor(random() * 100)::text,
  'IIS Benin Administrator',
  'admin@iisbenin.edu.ng',
  'bcrypt_hash_here', -- Use actual hash
  'Administration',
  'Head Librarian'
);

-- Create user profile
INSERT INTO user_profiles (id, email, full_name, role, enrollment_id)
SELECT 
  id,
  email,
  'IIS Benin Administrator',
  'staff',
  'STA' || to_char(now(), 'HHMMSS') || floor(random() * 100)::text
FROM auth.users
WHERE email = 'admin@iisbenin.edu.ng';
```

---

## Verification Checklist

After completing all steps, verify:

- [ ] Storage bucket `message-attachments` exists
- [ ] Storage bucket has 3 policies (INSERT, SELECT, DELETE)
- [ ] All database migrations completed successfully
- [ ] Librarian account created and can login
- [ ] Can access Dashboard after login
- [ ] Can navigate to ChatMessaging
- [ ] Can see Staff Management section

---

## Testing the Setup

### Test 1: File Upload
1. Login as librarian
2. Go to **Chat & Messaging**
3. Start conversation with a student (if any exist)
4. Click 📎 (paperclip) icon
5. Try uploading a small image or PDF
6. ✅ Should upload successfully and show in message

### Test 2: Emoji Reactions
1. In the same chat
2. Send a message
3. Hover over the message
4. Click the smile icon to add reaction
5. ✅ Should show emoji picker and add reaction

### Test 3: Bulk Upload
1. Go to **User Management** → **Bulk Registration**
2. Download the student template
3. ✅ Should download CSV with 3 fields: Name, Grade, Parent Email
4. Fill in 2-3 test students
5. Upload the CSV
6. ✅ Should create students successfully

---

## Troubleshooting

### Storage Bucket Issues
**Problem:** "Storage bucket not found"
- **Solution:** Verify bucket name is exactly `message-attachments` (lowercase, hyphen)

**Problem:** "Permission denied" when uploading
- **Solution:** Check that all 3 policies are created and enabled

**Problem:** Files upload but can't view
- **Solution:** Check SELECT policy exists

### Migration Issues
**Problem:** "Table already exists"
- **Solution:** Safe to ignore - means migration already ran

**Problem:** "Column already exists"
- **Solution:** Safe to ignore - means migration already ran

**Problem:** "Syntax error"
- **Solution:** Ensure you copied the entire script, including BEGIN and COMMIT

### Librarian Account Issues
**Problem:** "Password too weak"
- **Solution:** Must be 10+ chars with uppercase, lowercase, number, special character

**Problem:** "Email already in use"
- **Solution:** Account already exists - try logging in instead

**Problem:** LibrarianSetup screen doesn't show
- **Solution:** Check if admin already exists in Supabase Auth

---

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Check Supabase logs in Dashboard
3. Verify all environment variables in Vercel
4. Review `PRODUCTION_LAUNCH_CHECKLIST.md` for additional guidance

---

## Next Steps After Setup

Once these steps are complete:
1. ✅ Test all features thoroughly
2. ✅ Create a few test students/staff
3. ✅ Test bulk upload with `test-students-benin-format.csv`
4. ✅ Upload some test books
5. ✅ Test borrowing system
6. ✅ Mobile testing
7. 🚀 **READY FOR SOFT LAUNCH!**

**Estimated Total Time:** 20 minutes
**Launch Readiness After:** 85/100 ✅
