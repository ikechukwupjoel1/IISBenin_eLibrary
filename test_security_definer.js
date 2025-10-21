import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bFZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing if SECURITY DEFINER functions work...');

  // Test the create_student_member function to see if it works
  const uniqueId = 'TEST_STUDENT_' + Date.now();
  console.log('Testing create_student_member with ID:', uniqueId);

  try {
    const { data, error } = await supabase.rpc('create_student_member', {
      p_name: 'Test Student',
      p_email: 'teststudent@example.com',
      p_phone_number: '123-456-7890',
      p_grade_level: 'Grade 10',
      p_enrollment_id: uniqueId,
      p_password_hash: 'testpass123',
      p_calling_user_id: '1c0b4d0f-a877-4555-9a46-d65cafc29cbe'
    });

    console.log('Student RPC Result:', { data, error });

    if (!error) {
      // Check if student was created
      const { data: studentCheck, error: studentCheckError } = await supabase
        .from('students')
        .select('*')
        .eq('enrollment_id', uniqueId);

      if (studentCheckError) {
        console.log('❌ Student check error:', studentCheckError);
      } else if (studentCheck && studentCheck.length > 0) {
        console.log('✅ Student created successfully:', studentCheck[0]);
      } else {
        console.log('❌ Student not created');
      }
    }
  } catch (err) {
    console.log('❌ Exception:', err);
  }
})();