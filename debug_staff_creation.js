import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing create_staff_member with detailed error handling...');

  try {
    // Try with a unique enrollment ID
    const uniqueId = 'TEST_' + Date.now();
    console.log('Trying with enrollment ID:', uniqueId);

    const { data, error } = await supabase.rpc('create_staff_member', {
      p_name: 'Test Staff Debug',
      p_email: 'testdebug@example.com',
      p_phone_number: '123-456-7890',
      p_enrollment_id: uniqueId,
      p_password_hash: 'testpass123',
      p_calling_user_id: '1c0b4d0f-a877-4555-9a46-d65cafc29cbe'
    });

    console.log('RPC Result:', { data, error });

    if (error) {
      console.log('❌ RPC Error details:', error);
    } else {
      console.log('✅ RPC returned:', data);

      // Check if the staff was actually created
      const { data: staffCheck, error: staffCheckError } = await supabase
        .from('staff')
        .select('*')
        .eq('enrollment_id', uniqueId);

      if (staffCheckError) {
        console.log('❌ Staff check error:', staffCheckError);
      } else if (staffCheck && staffCheck.length > 0) {
        console.log('✅ Staff actually created:', staffCheck[0]);
      } else {
        console.log('❌ Staff not created despite RPC success');
      }
    }
  } catch (err) {
    console.log('❌ Exception during RPC call:', err);
  }
})();