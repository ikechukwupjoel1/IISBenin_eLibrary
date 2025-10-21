import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Checking current create_staff_member function definition...');

  try {
    // Try to get function info from information_schema
    const { data, error } = await supabase.rpc('get_function_definition', { function_name: 'create_staff_member' });

    if (error) {
      console.log('❌ Could not get function definition:', error.message);
    } else {
      console.log('Function definition:', data);
    }
  } catch (err) {
    console.log('❌ Exception getting function:', err);
  }

  // Let's try a different approach - check if we can see the function in the database
  console.log('Checking if function exists...');
  const { data: funcData, error: funcError } = await supabase
    .from('information_schema.routines')
    .select('routine_name, routine_definition')
    .eq('routine_name', 'create_staff_member')
    .eq('routine_schema', 'public');

  if (funcError) {
    console.log('❌ Function check error:', funcError.message);
  } else if (funcData && funcData.length > 0) {
    console.log('✅ Function exists');
    console.log('Definition preview:', funcData[0].routine_definition?.substring(0, 200));
  } else {
    console.log('❌ Function does not exist');
  }
})();