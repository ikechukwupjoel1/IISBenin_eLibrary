import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing direct staff table access...');

  // First, check if staff table exists by trying to select
  const { data: existingStaff, error: selectError } = await supabase
    .from('staff')
    .select('*')
    .limit(5);

  if (selectError) {
    console.log('❌ Staff table select error:', selectError);
    return;
  } else {
    console.log('✅ Staff table exists, current records:', existingStaff?.length || 0);
  }

  // Try to insert directly (this should fail due to RLS, but let's see the error)
  const { data: insertData, error: insertError } = await supabase
    .from('staff')
    .insert({
      name: 'Test Direct Insert',
      email: 'test@example.com',
      phone_number: '123-456-7890',
      enrollment_id: 'TEST_DIRECT'
    });

  if (insertError) {
    console.log('❌ Direct insert failed (expected due to RLS):', insertError.message);
  } else {
    console.log('✅ Direct insert succeeded:', insertData);
  }

  // Check if the direct insert actually worked
  const { data: checkInsert, error: checkError } = await supabase
    .from('staff')
    .select('*')
    .eq('enrollment_id', 'TEST_DIRECT');

  if (checkError) {
    console.log('❌ Check insert error:', checkError);
  } else if (checkInsert && checkInsert.length > 0) {
    console.log('✅ Direct insert actually worked:', checkInsert[0]);
  } else {
    console.log('❌ Direct insert did not work');
  }
})();