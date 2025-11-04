# 🚀 Deployment Instructions - Fix Reservations + Deploy Edge Function

## ⚠️ CRITICAL: Step 1 - Create Reservations Table

**The reservation feature is currently broken because the table doesn't exist in your database.**

### Execute SQL Script

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: IISBenin eLibrary

2. **Navigate to SQL Editor**
   - Left sidebar → "SQL Editor"
   - Click "New Query"

3. **Copy & Paste SQL**
   - Open file: `CREATE_RESERVATIONS_TABLE.sql`
   - Select ALL (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into Supabase SQL Editor

4. **Execute**
   - Click "Run" (or press Ctrl+Enter)
   - Wait for success message: ✅ "Success. No rows returned"

5. **Verify**
   - Go to "Table Editor" → You should see `reservations` table
   - Check columns: id, user_id, book_id, status, expires_at, etc.

---

## 📡 Step 2 - Deploy Edge Function (Admin Creation)

**This enables the admin management UI to create new librarians/admins.**

### Option A: Using Supabase CLI (Recommended)

```powershell
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link to your project (first time only)
supabase link --project-ref YOUR_PROJECT_REF

# 4. Deploy the function
supabase functions deploy create-admin-user

# 5. Set environment variables (if needed)
supabase secrets set SITE_URL=https://iis-benin-e-library.vercel.app
```

**Find YOUR_PROJECT_REF:**
- Supabase Dashboard → Project Settings → General → Reference ID

### Option B: Manual Upload via Dashboard

1. **Navigate to Edge Functions**
   - Supabase Dashboard → Edge Functions → "Create a new function"

2. **Create Function**
   - Name: `create-admin-user`
   - Copy code from: `supabase/functions/create-admin-user/index.ts`
   - Paste and Deploy

3. **Test the Function**
   - Settings → Admin Management → Click "Add Administrator"
   - Fill form and submit

---

## ✅ Step 3 - Test Everything

### Test Reservations
1. Go to production: https://iis-benin-e-library.vercel.app
2. Login as student/staff
3. Find an unavailable book → Click "Reserve"
4. Check Reservations tab → Should see your reservation
5. No more "table not found" errors! ✅

### Test Admin Management
1. Login as super admin
2. Settings → "Manage Librarians" button
3. Click "Add Administrator"
4. Fill form (email, name, role, institution)
5. Submit → Should create new admin ✅
6. New admin receives password reset email

---

## 🎯 Current Status

| Feature | Status | Next Step |
|---------|--------|-----------|
| Admin Management UI | ✅ Deployed | Test in production |
| Reservations SQL | ⚠️ **Not executed** | **RUN SQL NOW** |
| Edge Function | ⚠️ **Not deployed** | Deploy via CLI/Dashboard |
| Vercel Deployment | ✅ Live | Auto-deploys on git push |

---

## 🐛 Known Issues (After SQL execution)

Once you run the SQL, these 3 reported issues will be **FIXED**:

1. ✅ "Admins should be able to add other admins" 
   - Fixed: Full UI in Settings with add/delete/view

2. ✅ "Reserve a book showing Error... table 'public.reservations' not found"
   - Fixed: SQL creates table with proper schema

3. ✅ "Reservation menu always shows 'Failed to load reservations'"
   - Fixed: Query already fixed + table will exist after SQL

---

## 📊 Deployment Checklist

- [ ] Execute CREATE_RESERVATIONS_TABLE.sql in Supabase
- [ ] Verify `reservations` table exists in Table Editor
- [ ] Deploy `create-admin-user` Edge Function
- [ ] Test reservation creation (student/staff)
- [ ] Test admin creation (super admin)
- [ ] Monitor Vercel logs for any runtime errors
- [ ] Check Database → Logs for SQL errors

---

## 🆘 Troubleshooting

### If SQL fails:
- Check for existing table: `DROP TABLE IF EXISTS reservations CASCADE;`
- Re-run the script

### If Edge Function fails:
- Check Supabase logs: Dashboard → Edge Functions → Logs
- Verify service role key is set (automatic in Supabase)
- Check function code matches `index.ts`

### If reservations still fail:
- Check browser console (F12) for errors
- Verify RLS policies: `SELECT * FROM reservations LIMIT 1;` (should work)
- Check Supabase logs for permission errors

---

## 🎉 After Everything Works

Next priorities (from original plan):
1. **Material Viewer** - View PDFs/EPUBs in Digital Library
2. **Waiting List** - Queue for borrowed books
3. **Book Recommendations** - AI-powered suggestions

Let me know once you've executed the SQL and I'll help with the next phase!
