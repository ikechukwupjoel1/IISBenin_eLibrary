# Client Insert Snippet - Create Student with Auto-Generated Credentials

## Complete Example

```typescript
// Generate credentials
const enrollmentId = 'STU' + Date.now().toString().slice(-8);
const password = generatePassword(); // Use your password generation function
const email = `${enrollmentId.toLowerCase()}@iisbenin.edu`;

// Get current user session
const { data: { session } } = await supabase.auth.getSession();

if (!session) {
  alert('You must be logged in');
  return;
}

// Call Edge Function to create student
const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user-account`;

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: email,
      password: password,
      full_name: formData.name,
      role: 'student',
      enrollment_id: enrollmentId,
      grade_level: formData.grade_level,
      phone_number: null,
    }),
  });

  const result = await response.json();

  if (!response.ok || result.error) {
    console.error('Error:', result.error);
    alert('Error creating student: ' + (result.error || 'Unknown error'));
    return;
  }

  // SUCCESS! Display the credentials
  console.log('Student created successfully!');
  console.log('Enrollment ID:', enrollmentId);
  console.log('Password:', password);
  
  // Show credentials to user (example using state)
  setGeneratedCredentials({
    enrollment_id: enrollmentId,
    password: password,
  });
  setShowCredentials(true);

} catch (error) {
  console.error('Error:', error);
  alert('Error creating student: ' + error.message);
}
```

## Password Generation Function

```typescript
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};
```

## Key Points

1. **Generate BEFORE calling API**: Create both `enrollmentId` and `password` on the client side
2. **Send to Edge Function**: Pass them in the request body
3. **Return to user**: Since you generated them, you already have them - just display them!

## Response Format

The Edge Function returns:
```json
{
  "success": true,
  "user_id": "uuid-here",
  "enrollment_id": "STU12345678"
}
```

But you already have both `enrollmentId` and `password` from step 1, so you can display them immediately after success!

## Display Example

```typescript
// After successful creation, show credentials
<div className="credentials-display">
  <h3>Student Created Successfully!</h3>
  <div className="credential-item">
    <label>Enrollment ID:</label>
    <span>{enrollmentId}</span>
  </div>
  <div className="credential-item">
    <label>Password:</label>
    <span>{password}</span>
  </div>
  <button onClick={() => printCredentials(enrollmentId, password)}>
    Print Credentials
  </button>
</div>
```

## Important Notes

- ✅ Generate `enrollmentId` and `password` on the CLIENT before calling the API
- ✅ You don't need to "return" them from the server - you already have them!
- ✅ The Edge Function validates and creates the account with those credentials
- ✅ Display the credentials immediately after successful API response
- ⚠️ Make sure to SAVE/PRINT the credentials before closing the modal - they cannot be retrieved later!
