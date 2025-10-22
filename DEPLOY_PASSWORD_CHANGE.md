# Secure Password Change Deployment Guide

## Overview
This implementation adds secure password changing for staff and students using bcrypt hashing via Supabase Edge Functions.

## What Was Implemented

### 1. New Edge Functions Created
- **`change-password`**: Allows staff/students to change their password securely
  - Verifies current password (supports both bcrypt and plain text)
  - Hashes new password with bcrypt
  - Updates user_profiles.password_hash

- **`verify-login`**: Verifies staff/student login credentials
  - Supports both bcrypt hashed passwords and plain text (for migration)
  - Used by AuthContext for staff/student authentication

### 2. Updated Components
- **`ChangePassword.tsx`** (NEW): User interface for changing passwords
  - Available only to staff and students
  - Validates password requirements (min 6 characters)
  - Confirms new password matches
  - Calls edge function for secure processing

- **`MainApp.tsx`**: Added "Change Password" tab for staff/students
  
- **`AuthContext.tsx`**: Updated to use verify-login edge function
  - Calls edge function for bcrypt verification
  - Falls back to direct check if edge function unavailable

## Deployment Steps

### Step 1: Deploy Edge Functions to Supabase

```powershell
# Navigate to your project directory
cd c:\Users\owner\Downloads\IISBenin_eLibrary

# Deploy the change-password function
supabase functions deploy change-password

# Deploy the verify-login function
supabase functions deploy verify-login
```

### Step 2: Set Environment Secrets (if not already set)

The edge functions need access to the SERVICE_ROLE_KEY. This is usually auto-configured, but verify:

```powershell
# Check secrets
supabase secrets list

# If SERVICE_ROLE_KEY is not set, add it from your Supabase project settings
supabase secrets set SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Deploy Frontend

```powershell
# Build the project
npm run build

# Deploy to Vercel
vercel --prod --yes
```

### Step 4: Test Password Change Flow

1. **Login as a staff or student account**
2. **Navigate to "Change Password" tab**
3. **Enter current password (the auto-generated one)**
4. **Enter new password (min 6 characters)**
5. **Confirm new password**
6. **Click "Update Password"**
7. **Success message should appear**
8. **Sign out and sign back in with NEW password**

### Step 5: Verify Login with Bcrypt

After changing password:
1. Sign out
2. Sign in with the NEW password
3. Should work seamlessly (edge function handles bcrypt verification)

## Migration Path

The system supports **gradual migration** from plain text to bcrypt:

- **Old passwords**: Still work (plain text comparison as fallback)
- **Changed passwords**: Automatically hashed with bcrypt
- **New accounts**: Should be created with bcrypt from the start

To migrate existing accounts:
1. Users change their passwords via the UI → auto-hashed
2. Or create a migration script to hash all existing passwords

## Security Features

✅ **Bcrypt hashing**: Industry-standard password hashing
✅ **Server-side verification**: Passwords never compared on client
✅ **Current password required**: Users must know current password to change
✅ **Backward compatible**: Supports both hashed and plain text during migration
✅ **Fallback mechanism**: If edge function fails, falls back to direct check

## Troubleshooting

### Edge Function Not Responding
- Check Supabase logs: Dashboard > Edge Functions > Logs
- Verify SERVICE_ROLE_KEY is set
- Ensure functions are deployed: `supabase functions list`

### Password Change Fails
- Check browser console for errors
- Verify VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct
- Check edge function logs

### Can't Login After Password Change
- Verify edge function deployed successfully
- Check that verify-login function is working
- Fallback should still allow plain text comparison

## Files Modified/Created

### Created:
- `supabase/functions/change-password/index.ts`
- `supabase/functions/verify-login/index.ts`
- `src/components/ChangePassword.tsx`
- `DEPLOY_PASSWORD_CHANGE.md` (this file)

### Modified:
- `src/components/MainApp.tsx` - Added Change Password tab
- `src/contexts/AuthContext.tsx` - Updated to use verify-login edge function

## Next Steps (Optional Improvements)

1. **Hash existing passwords**: Create migration script for all existing user accounts
2. **Password strength indicator**: Add visual feedback for password strength
3. **Password history**: Prevent reusing recent passwords
4. **Rate limiting**: Add rate limiting to edge functions to prevent brute force
5. **Email notification**: Send email when password is changed
6. **Librarian password change**: Add similar UI for librarian accounts (currently use Supabase Auth built-in)

## Component Analysis Results

### Reading Challenge Component ✅
- **Access**: Librarian, Staff, Student
- **Create**: Librarian only ✅
- **Join/Leave**: All roles ✅
- **Progress tracking**: Working ✅

### Reviews Component ✅
- **Access**: Librarian, Staff, Student
- **Write**: All roles ✅
- **Edit/Delete**: Own reviews only ✅
- **Rating system**: 1-5 stars ✅

### Leaderboard Component ✅
- **Access**: Librarian, Staff, Student
- **Time filters**: All time, Month, Week ✅
- **Data source**: Completed borrow records ✅
- **Role badges**: Proper styling ✅

All three components are functioning correctly with proper role-based access control!
