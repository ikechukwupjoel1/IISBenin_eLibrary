import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing create_staff_member RPC function...');

  try {
    const { data, error } = await supabase.rpc('create_staff_member', {
      p_name: 'Test Staff',
      p_email: 'test@example.com',
      p_phone_number: '123-456-7890',
      p_enrollment_id: 'TEST_STAFF_RPC',
      p_password_hash: 'testpass123',
      p_calling_user_id: '1c0b4d0f-a877-4555-9a46-d65cafc29cbe'
    });

    if (error) {
      console.log('❌ RPC Error:', error);
    } else {
      console.log('✅ RPC Success:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err);
  }

  // Also check if the staff was created
  const { data: staffCheck, error: staffCheckError } = await supabase
    .from('staff')
    .select('*')
    .eq('enrollment_id', 'TEST_STAFF_RPC');

  if (staffCheckError) {
    console.log('❌ Staff check error:', staffCheckError);
  } else if (staffCheck && staffCheck.length > 0) {
    console.log('✅ Staff created:', staffCheck[0]);
  } else {
    console.log('❌ Staff not created');
  }
})();