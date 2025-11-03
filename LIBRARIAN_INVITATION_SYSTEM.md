# Librarian Invitation System

## Overview
A professional token-based invitation system for adding librarians to institutions. Super admins can generate invitation links that allow new librarians to register with pre-configured access to their institution.

## Features
- 🔐 **Secure Token-Based Invitations**: Each invitation has a unique, cryptographically secure token
- ⏰ **Expiration Control**: Invitations expire after 7 days
- ✅ **Status Tracking**: Track invitation states (pending, accepted, expired, revoked)
- 🎯 **Direct Institution Assignment**: Librarians are automatically assigned to the correct institution
- 📧 **Email-Based Flow**: Invitations are tied to specific email addresses

## Database Setup

### Step 1: Run the SQL Migration
Execute the SQL file to create the necessary database objects:

```bash
# In Supabase SQL Editor, run:
CREATE_LIBRARIAN_INVITATIONS_TABLE.sql
```

This creates:
- `librarian_invitations` table
- RLS policies for super admin access and public token validation
- `create_librarian_invitation()` RPC function
- `accept_librarian_invitation()` RPC function

### Database Schema

**librarian_invitations table:**
```sql
- id: UUID (Primary Key)
- institution_id: UUID (Foreign Key to institutions)
- email: TEXT
- token: TEXT (Unique, indexed)
- status: TEXT ('pending', 'accepted', 'expired', 'revoked')
- invited_by: UUID (Foreign Key to user_profiles - super admin)
- invited_at: TIMESTAMP
- expires_at: TIMESTAMP
- accepted_at: TIMESTAMP (nullable)
```

## User Flow

### For Super Admins

1. **View Institution Details**
   - Navigate to Super Admin Dashboard → Institutions
   - Click on an institution to view details

2. **Invite a Librarian**
   - Click "Invite Librarian" button
   - Enter the librarian's email address
   - Click "Create Invitation"
   - Copy the generated invitation link

3. **Share the Link**
   - Send the invitation link to the librarian via email or other secure channel
   - The link format: `https://your-app.com/?invite=TOKEN`

### For Invited Librarians

1. **Receive Invitation Link**
   - Get the invitation link from the super admin

2. **Open Registration Page**
   - Click the invitation link
   - System validates the token automatically

3. **Complete Registration**
   - Email is pre-filled (read-only)
   - Enter full name
   - Create a password (minimum 8 characters)
   - Confirm password
   - Click "Create Account"

4. **Login**
   - Account is created with librarian role
   - Automatically assigned to the invited institution
   - Can immediately login with their email and password

## RPC Functions

### create_librarian_invitation

Creates a new invitation and returns a secure token.

**Parameters:**
- `target_institution_id` (UUID): The institution ID
- `invitee_email` (TEXT): The email address of the invitee

**Returns:** TEXT (the invitation token)

**Security:** Only super admins can execute

**Example:**
```sql
SELECT create_librarian_invitation(
  'institution-uuid-here',
  'librarian@example.com'
);
```

### accept_librarian_invitation

Processes an invitation acceptance, creates the user account and profile.

**Parameters:**
- `invite_token` (TEXT): The invitation token from the URL
- `new_full_name` (TEXT): The librarian's full name
- `new_password` (TEXT): The chosen password

**Returns:** VOID

**Security:** Public access (anyone with valid token)

**Process:**
1. Validates token is pending and not expired
2. Creates auth user with provided email and password
3. Creates user_profile with librarian role
4. Updates invitation status to 'accepted'
5. All operations in a transaction (atomic)

**Example:**
```sql
CALL accept_librarian_invitation(
  'secure-token-here',
  'John Doe',
  'secure-password'
);
```

## Frontend Components

### SuperAdminDashboard
**Location:** `src/components/SuperAdminDashboard.tsx`

**New Features:**
- Invitation modal with email input
- Token generation and display
- Copy-to-clipboard functionality
- Invitation success feedback

**Key State:**
```typescript
const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
const [inviteEmail, setInviteEmail] = useState('');
const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
```

**Handler:**
```typescript
const handleInviteLibrarian = async (e: React.FormEvent) => {
  // Calls create_librarian_invitation RPC
  // Generates full invitation URL
  // Displays link for copying
};
```

### AcceptInvitation
**Location:** `src/components/AcceptInvitation.tsx`

**Features:**
- Token validation on mount
- Institution name display
- Registration form with validation
- Error handling for expired/invalid tokens

**Props:**
```typescript
interface AcceptInvitationProps {
  token: string;
  onComplete: () => void;
}
```

### App Integration
**Location:** `src/App.tsx`

**Changes:**
- Detects `?invite=TOKEN` query parameter
- Routes to AcceptInvitation component
- Clears URL parameter after completion

## Security Features

### RLS Policies

1. **Super Admin Management**
   ```sql
   - Super admins can create invitations
   - Super admins can view all invitations
   - Super admins can update invitation status (revoke)
   ```

2. **Public Token Validation**
   ```sql
   - Anyone can read invitations by token (for validation)
   - No ability to see other invitation details
   ```

### Token Generation
- Uses `gen_random_uuid()` for cryptographic randomness
- 36-character unique identifier
- Indexed for fast lookup

### Expiration
- Default: 7 days from creation
- Checked automatically during acceptance
- Cannot accept expired invitations

## Testing Guide

### Test Invitation Creation

1. Login as super admin
2. Navigate to Super Admin Dashboard
3. Click on any institution
4. Click "Invite Librarian"
5. Enter test email: `test-librarian@example.com`
6. Click "Create Invitation"
7. Verify invitation link is displayed
8. Copy the link

### Test Invitation Acceptance

1. Logout from super admin account
2. Paste the invitation URL in browser
3. Verify institution name is displayed correctly
4. Fill in the form:
   - Full Name: "Test Librarian"
   - Password: "password123"
   - Confirm Password: "password123"
5. Click "Create Account"
6. Verify success message
7. Login with the new credentials

### Test Error Cases

**Expired Token:**
```sql
-- Manually expire an invitation
UPDATE librarian_invitations 
SET expires_at = NOW() - INTERVAL '1 day'
WHERE token = 'your-token-here';
```

**Invalid Token:**
- Use a random UUID in the URL
- Should show "Invalid or expired invitation link"

**Already Used:**
- Try using the same invitation link twice
- Should show "This invitation has already been used or revoked"

## Future Enhancements

### Phase 2 (Optional)
1. **Email Integration**
   - Automatic email sending via Supabase Auth or custom SMTP
   - Beautiful HTML email templates
   - Reminder emails for pending invitations

2. **Invitation Management Dashboard**
   - View all pending/accepted invitations per institution
   - Resend invitation (generate new token)
   - Revoke invitations
   - Invitation analytics

3. **Bulk Invitations**
   - CSV upload for multiple librarians
   - Batch invitation creation
   - Progress tracking

4. **Customization**
   - Configurable expiration periods
   - Custom invitation messages
   - Institution branding in invitation page

## Troubleshooting

### "Failed to create invitation"
- Check user is logged in as super admin
- Verify institution_id exists
- Check Supabase connection

### "Invalid or expired invitation link"
- Token may have expired (>7 days old)
- Token may have been used already
- Token may not exist in database

### "Failed to create account"
- Email may already be registered
- Password may be too weak
- Database connection issue

### Check Invitation Status
```sql
SELECT 
  id,
  email,
  status,
  invited_at,
  expires_at,
  institutions.name as institution_name
FROM librarian_invitations
JOIN institutions ON librarian_invitations.institution_id = institutions.id
WHERE email = 'librarian@example.com'
ORDER BY invited_at DESC;
```

## API Reference

### Frontend API Calls

**Create Invitation:**
```typescript
const { data, error } = await supabase.rpc('create_librarian_invitation', {
  target_institution_id: 'uuid-here',
  invitee_email: 'email@example.com'
});
// Returns: token string
```

**Accept Invitation:**
```typescript
const { error } = await supabase.rpc('accept_librarian_invitation', {
  invite_token: 'token-from-url',
  new_full_name: 'John Doe',
  new_password: 'securepassword'
});
```

**Validate Token (Read):**
```typescript
const { data, error } = await supabase
  .from('librarian_invitations')
  .select('email, status, expires_at, institutions:institution_id(name)')
  .eq('token', 'token-from-url')
  .single();
```

## Deployment Checklist

- [ ] Run `CREATE_LIBRARIAN_INVITATIONS_TABLE.sql` in Supabase SQL Editor
- [ ] Test invitation creation as super admin
- [ ] Test invitation acceptance flow
- [ ] Verify new librarian can login
- [ ] Test expired token handling
- [ ] Test invalid token handling
- [ ] Update production environment variables if needed
- [ ] Document invitation process for institution admins

## Support

For issues or questions:
1. Check Supabase logs for RPC errors
2. Verify RLS policies are enabled
3. Check browser console for frontend errors
4. Review invitation status in database
