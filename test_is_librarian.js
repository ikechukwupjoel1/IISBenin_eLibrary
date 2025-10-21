import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://myxwxakwlfjoovvlkkul.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15eHd4YWt3bGZqb292dmxra3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMzUzNzcsImV4cCI6MjA3NTcxMTM3N30.UJSR_IVnabXNY-ITNkU-2RxETKsLjEBYKAWxD7fKDpw');

(async () => {
  console.log('Testing is_librarian function...');

  const librarianId = '1c0b4d0f-a877-4555-9a46-d65cafc29cbe';

  try {
    const { data, error } = await supabase.rpc('is_librarian', { user_id: librarianId });

    if (error) {
      console.log('❌ is_librarian Error:', error);
    } else {
      console.log('✅ is_librarian result:', data);
    }
  } catch (err) {
    console.log('❌ Exception:', err);
  }

  // Also check the user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', librarianId);

  if (profileError) {
    console.log('❌ Profile check error:', profileError);
  } else {
    console.log('✅ Librarian profile:', profile);
  }
})();