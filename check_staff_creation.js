import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Checking if staff STAFF1582393 was created...');

  // Check staff table
  const { data: staffData, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .eq('enrollment_id', 'STAFF1582393');

  if (staffError) {
    console.log('❌ Staff table check failed:', staffError.message);
  } else if (staffData && staffData.length > 0) {
    console.log('✅ Staff found in staff table:', staffData[0]);
  } else {
    console.log('❌ Staff not found in staff table');
  }

  // Check user_profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', 'STAFF1582393');

  if (profileError) {
    console.log('❌ Profile check failed:', profileError.message);
  } else if (profileData && profileData.length > 0) {
    console.log('✅ Profile found:', profileData[0]);
    console.log('Password hash present:', !!profileData[0].password_hash);
  } else {
    console.log('❌ Profile not found in user_profiles table');
  }

  // Count total staff
  const { count, error: countError } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.log('❌ Count failed:', countError.message);
  } else {
    console.log('Total staff count:', count);
  }
})();