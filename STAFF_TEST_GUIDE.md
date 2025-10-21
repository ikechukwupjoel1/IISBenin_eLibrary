# Staff Creation and Authentication Test Guide

## Summary of Changes Made

1. **Edge Function Updated**: `create-user-account` now handles staff creation without creating Supabase auth users, storing passwords directly in user_profiles table.

2. **AuthContext Updated**: Staff authentication now uses direct password checking like students, instead of Supabase auth.

3. **Database Schema**: Ensured password_hash column exists in user_profiles and phone_number column exists in staff table.

## Testing Steps

### 1. Test Staff Creation
1. Open the application at http://localhost:5173
2. Login as a librarian (use existing librarian credentials)
3. Navigate to Staff Management
4. Create a new staff member with:
   - Full Name: Test Staff Member
   - Email: staff123@example.com
   - Enrollment ID: STAFF123
   - Password: StaffPass123
   - Phone: 123-456-7890

### 2. Test Staff Login
1. Logout from librarian account
2. On the login page, select "Staff" role
3. Enter:
   - Enrollment ID: STAFF123
   - Password: StaffPass123
4. Click Login

### 3. Expected Results
- Staff creation should succeed without errors
- Staff login should work and redirect to appropriate dashboard
- No duplicate key errors should occur

## Alternative Console Testing

If you prefer testing via browser console:

### Test Staff Creation (after logging in as librarian):
```javascript
// Copy and paste this into browser console after librarian login
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { console.error('Login as librarian first'); return; }

  const response = await fetch('https://myxwxakwlfjoovvlkkul.supabase.co/functions/v1/create-user-account', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxNTk5MjgsImV4cCI6MjA0MzczNTkyOH0.Rjn-1Y28p7TBp2BppfYsR1yuJfNdkNNKZKO5e_A5vGk',
    },
    body: JSON.stringify({
      email: 'staff' + Date.now() + '@example.com',
      password: 'StaffPass123',
      full_name: 'Test Staff Member',
      role: 'staff',
      enrollment_id: 'STAFF' + Date.now(),
      phone_number: '123-456-7890',
    }),
  });

  const result = await response.json();
  console.log('Staff Creation Result:', result);
})();
```

### Test Staff Login:
```javascript
// Test staff login via API (if available) or through the UI
// Use enrollment ID: STAFF123, password: StaffPass123, role: staff
```

## Troubleshooting

If staff creation still fails:
1. Check browser console for error messages
2. Verify database has required columns (password_hash in user_profiles, phone_number in staff)
3. Ensure Edge Function is deployed (it was deployed successfully)
4. Check that RLS policies allow the operations

If staff login fails:
1. Verify the staff account was created successfully
2. Check that password is stored correctly in user_profiles table
3. Ensure AuthContext changes are working (check browser network tab for login requests)

## Files Modified
- `src/contexts/AuthContext.tsx`: Unified staff/student authentication logic
- `supabase/functions/create-user-account/index.ts`: Updated to handle staff without auth users
- Created test files: `test-staff-creation.js`, `test-staff-login.js`