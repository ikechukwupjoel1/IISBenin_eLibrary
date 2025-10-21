// Test the fixed staff creation
// Run this in browser console after logging in as librarian

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('❌ Login as librarian first');
    return;
  }

  console.log('Testing fixed staff creation...');

  const testEnrollmentId = 'STAFF_TEST_' + Date.now();

  const response = await fetch('https://myxwxakwlfjoovvlkkul.supabase.co/functions/v1/create-user-account', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bFZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw',
    },
    body: JSON.stringify({
      email: testEnrollmentId.toLowerCase() + '@example.com',
      password: 'TestPass123',
      full_name: 'Test Staff Fixed',
      role: 'staff',
      enrollment_id: testEnrollmentId,
      phone_number: '123-456-7890',
    }),
  });

  const result = await response.json();
  console.log('Edge Function Response:', result);

  if (result.error) {
    console.error('❌ Error:', result.error);
    return;
  }

  console.log('✅ Staff creation successful!');

  // Check if staff was actually created
  setTimeout(async () => {
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('enrollment_id', testEnrollmentId);

    if (staffError) {
      console.error('❌ Staff check error:', staffError);
    } else if (staffData && staffData.length > 0) {
      console.log('✅ Staff record found:', staffData[0]);
    } else {
      console.error('❌ Staff record not found');
    }

    // Check profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('enrollment_id', testEnrollmentId);

    if (profileError) {
      console.error('❌ Profile check error:', profileError);
    } else if (profileData && profileData.length > 0) {
      console.log('✅ Profile found:', profileData[0]);
    } else {
      console.error('❌ Profile not found');
    }
  }, 1000);
})();