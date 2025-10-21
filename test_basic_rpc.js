import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bFZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing basic RPC call...');

  try {
    // Test a simple function that should work
    const { data, error } = await supabase.rpc('is_librarian', {
      user_id: '1c0b4d0f-a877-4555-9a46-d65cafc29cbe'
    });

    console.log('is_librarian result:', { data, error });
  } catch (err) {
    console.log('Exception:', err);
  }

  // Test basic table access
  try {
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    console.log('Table access result:', { data: data?.length, error });
  } catch (err) {
    console.log('Table access exception:', err);
  }
})();