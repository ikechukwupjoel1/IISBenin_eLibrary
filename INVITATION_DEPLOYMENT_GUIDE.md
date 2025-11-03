# Quick Deployment Guide - Librarian Invitation System

## Prerequisites
✅ Super admin dashboard is working
✅ User has super admin access
✅ Supabase project is accessible

## Step 1: Deploy Database Changes

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the SQL Migration**
   - Open the file: `CREATE_LIBRARIAN_INVITATIONS_TABLE.sql`
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify Table Creation**
   ```sql
   SELECT * FROM librarian_invitations LIMIT 1;
   ```
   Should return empty result (no error)

## Step 2: Deploy Frontend Changes

The following files have been modified/created:

### Modified Files:
1. ✅ `src/components/SuperAdminDashboard.tsx`
   - Added invitation modal
   - Added "Invite Librarian" button
   - Added invitation handler

2. ✅ `src/App.tsx`
   - Added invitation URL detection
   - Added routing to AcceptInvitation component

### New Files:
3. ✅ `src/components/AcceptInvitation.tsx`
   - New component for librarian registration

### Deploy to Vercel:
```bash
# Commit changes
git add .
git commit -m "Add librarian invitation system"

# Push to trigger Vercel deployment
git push origin main
```

Or build locally:
```bash
npm run build
```

## Step 3: Test the Flow

### Test 1: Create Invitation
1. Login as super admin
2. Go to Super Admin Dashboard
3. Click on any institution
4. Click "Invite Librarian" button
5. Enter email: `test@example.com`
6. Click "Create Invitation"
7. **Expected:** See invitation link with token

### Test 2: Accept Invitation
1. Copy the invitation link
2. Logout or open in incognito window
3. Paste the invitation URL
4. **Expected:** See registration form with institution name
5. Fill in:
   - Full Name: "Test Librarian"
   - Password: "password123"
   - Confirm: "password123"
6. Click "Create Account"
7. **Expected:** Success message, redirected to login

### Test 3: Login as New Librarian
1. Go to login page
2. Enter the email and password from Test 2
3. Click "Sign In"
4. **Expected:** Login successful, see librarian dashboard

## Step 4: Verify Database

Check that everything was created correctly:

```sql
-- Check invitation was created
SELECT 
  id,
  email,
  status,
  expires_at,
  institutions.name as institution_name
FROM librarian_invitations
JOIN institutions ON librarian_invitations.institution_id = institutions.id
ORDER BY invited_at DESC
LIMIT 5;

-- Check user was created
SELECT 
  up.id,
  up.full_name,
  up.email,
  up.role,
  i.name as institution_name
FROM user_profiles up
JOIN institutions i ON up.institution_id = i.id
WHERE up.role = 'librarian'
ORDER BY up.created_at DESC
LIMIT 5;
```

## Rollback Plan

If something goes wrong, you can rollback:

```sql
-- Remove the invitation system
DROP TABLE IF EXISTS librarian_invitations CASCADE;
DROP FUNCTION IF EXISTS create_librarian_invitation;
DROP FUNCTION IF EXISTS accept_librarian_invitation;
```

Then redeploy the previous version of the frontend.

## Common Issues

### Issue: "Function create_librarian_invitation does not exist"
**Solution:** Run the SQL migration file again

### Issue: "Permission denied for table librarian_invitations"
**Solution:** Check RLS policies, ensure super admin role is correct

### Issue: "Invitation link shows 'Invalid invitation'"
**Solution:** 
- Check token in database
- Verify expires_at is in future
- Ensure status is 'pending'

### Issue: "Account creation fails"
**Solution:**
- Check email isn't already registered
- Verify password meets requirements (8+ chars)
- Check Supabase Auth is enabled

## Production Checklist

- [ ] SQL migration executed successfully
- [ ] Frontend deployed (Vercel/production)
- [ ] Test invitation creation
- [ ] Test invitation acceptance
- [ ] Test new librarian login
- [ ] Verify no console errors
- [ ] Check mobile responsiveness
- [ ] Document process for staff

## Next Steps (Optional)

After basic system is working, you can add:

1. **Email Integration**
   - Configure Supabase Auth email templates
   - Or integrate SendGrid/Postmark for custom emails

2. **Invitation Management**
   - View all pending invitations
   - Resend/revoke functionality
   - Invitation analytics

3. **Bulk Invitations**
   - CSV upload
   - Batch processing

## Support

If you encounter issues:
1. Check browser console for errors
2. Check Supabase logs
3. Verify RLS policies
4. Check database for invitation record

## Success Criteria

✅ Super admin can create invitations
✅ Invitation link is generated
✅ Registration page loads with token
✅ New librarian account is created
✅ New librarian can login
✅ Librarian has correct institution assignment
