// TEST: Can we call the Edge Function for staff creation?
// Open browser console (F12) and paste this code after logging in as librarian

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  console.log('Session:', session ? 'EXISTS' : 'MISSING');
  console.log('Access Token:', session?.access_token ? 'EXISTS' : 'MISSING');
  console.log('User ID:', session?.user?.id);

  if (!session) {
    console.error('❌ No session found - please login');
    return;
  }

  // Test calling the Edge Function for staff creation
  const apiUrl = `https://myxwxakwlfjoovvlkkul.supabase.co/functions/v1/create-user-account`;

  console.log('Testing Edge Function call for staff creation...');

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFub24iLCJpYXQiOjE3MjgxNTk5MjgsImV4cCI6MjA0MzczNTkyOH0.Rjn-1Y28p7TBp2BppfYsR1yuJfNdkNNKZKO5e_A5vGk',
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

  console.log('Response Status:', response.status);
  console.log('Response:', result);

  if (result.error) {
    console.error('❌ Error:', result.error);
  } else {
    console.log('✅ Success!', result);
  }
})();