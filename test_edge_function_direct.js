// Test Edge Function directly
(async () => {
  console.log('Testing Edge Function call...');

  // First, get a session as librarian
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('❌ No session found - login as librarian first');
    return;
  }

  console.log('Session found, calling Edge Function...');

  const testEnrollmentId = 'STAFF_DEBUG_' + Date.now();

  const response = await fetch('https://myxwxakwlfjoovvlkkul.supabase.co/functions/v1/create-user-account', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bFZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw',
    },
    body: JSON.stringify({
      email: testEnrollmentId.toLowerCase() + '@example.com',
      password: 'DebugPass123',
      full_name: 'Debug Test Staff',
      role: 'staff',
      enrollment_id: testEnrollmentId,
      phone_number: '123-456-7890',
    }),
  });

  const result = await response.json();
  console.log('Edge Function Response:', result);
  console.log('Response Status:', response.status);

  if (result.error) {
    console.error('❌ Error from Edge Function:', result.error);
  } else {
    console.log('✅ Edge Function succeeded');

    // Check if staff was created
    setTimeout(async () => {
      console.log('Checking if staff record was created...');
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('enrollment_id', testEnrollmentId);

      if (staffError) {
        console.error('❌ Staff check error:', staffError);
      } else if (staffData && staffData.length > 0) {
        console.log('✅ Staff record found:', staffData[0]);
      } else {
        console.log('❌ Staff record not found');
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
        console.log('❌ Profile not found');
      }
    }, 2000);
  }
})();