import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bFZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing direct staff table insertion...');

  const testId = crypto.randomUUID();
  const testEnrollmentId = 'TEST_DEBUG_' + Date.now();

  console.log('Attempting to insert staff record with:');
  console.log('- ID:', testId);
  console.log('- Enrollment ID:', testEnrollmentId);
  console.log('- Name: Test Debug Staff');

  const { data, error } = await supabase
    .from('staff')
    .insert({
      id: testId,
      name: 'Test Debug Staff',
      email: 'testdebug@example.com',
      phone_number: '123-456-7890',
      enrollment_id: testEnrollmentId
    });

  console.log('Insert result:', { data, error });

  if (error) {
    console.log('❌ Insert failed with error:', error);
  } else {
    console.log('✅ Insert succeeded');

    // Check if it was actually inserted
    const { data: checkData, error: checkError } = await supabase
      .from('staff')
      .select('*')
      .eq('id', testId);

    console.log('Verification check:', { checkData, checkError });
  }
})();