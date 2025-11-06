const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load env vars from .env file
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function debugReadingProgress() {
  console.log('=== DEBUG: Reading Progress for Student S0003 ===\n');

  // 1. Get user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', 'S0003')
    .single();

  if (!profile) {
    console.error('❌ No user_profile found for S0003');
    return;
  }

  console.log('✅ User Profile:', {
    id: profile.id,
    enrollment_id: profile.enrollment_id,
    role: profile.role,
    full_name: profile.full_name
  });

  // 2. Get student record by enrollment_id
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, enrollment_id, full_name')
    .eq('enrollment_id', profile.enrollment_id)
    .single();

  if (studentError) {
    console.error('\n❌ Error fetching student by enrollment_id:', studentError);
    console.log('\nTrying to list all students with similar enrollment_id...');
    
    const { data: allStudents } = await supabase
      .from('students')
      .select('id, enrollment_id, full_name')
      .ilike('enrollment_id', '%S0003%');
    
    console.log('Students matching S0003:', JSON.stringify(allStudents, null, 2));
    return;
  }

  console.log('\n✅ Student Record:', {
    id: student.id,
    enrollment_id: student.enrollment_id,
    full_name: student.full_name
  });

  // 3. Get borrow records
  const { data: borrows, error: borrowError } = await supabase
    .from('borrow_records')
    .select(`
      id,
      book_id,
      due_date,
      status,
      books:book_id (title, author_publisher)
    `)
    .eq('student_id', student.id)
    .eq('status', 'active');

  if (borrowError) {
    console.error('\n❌ Error fetching borrows:', borrowError);
    return;
  }

  console.log(`\n✅ Active Borrows: ${borrows?.length || 0}`);
  if (borrows && borrows.length > 0) {
    borrows.forEach((b, i) => {
      const bookTitle = Array.isArray(b.books) ? b.books[0]?.title : b.books?.title;
      console.log(`  ${i + 1}. ${bookTitle || 'Unknown'} (ID: ${b.id})`);
    });
  }

  // 4. Check reading progress records
  const { data: progress, error: progressError } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', profile.id);

  if (progressError) {
    console.error('\n❌ Error fetching reading progress:', progressError);
    return;
  }

  console.log(`\n✅ Reading Progress Records: ${progress?.length || 0}`);
  if (progress && progress.length > 0) {
    progress.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.session_date} - Page ${p.current_page} (${p.percentage_complete}%)`);
    });
  }

  console.log('\n=== DEBUG COMPLETE ===');
}

async function debugStaffLogin() {
  console.log('\n\n=== DEBUG: Staff Login Check ===\n');

  // Check staff table structure and records
  const { data: staff, error } = await supabase
    .from('staff')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching staff:', error);
    return;
  }

  console.log(`✅ Staff records found: ${staff?.length || 0}`);
  if (staff && staff.length > 0) {
    staff.forEach((s, i) => {
      console.log(`\n  ${i + 1}. ${s.full_name || s.name}`);
      console.log(`     enrollment_id: ${s.enrollment_id}`);
      console.log(`     email: ${s.email || 'N/A'}`);
      console.log(`     phone: ${s.phone_number || 'N/A'}`);
    });

    // Check if staff have corresponding user_profiles
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('enrollment_id, role, password_hash')
      .in('enrollment_id', staff.map(s => s.enrollment_id));

    console.log(`\n✅ User profiles for staff: ${profiles?.length || 0}`);
    profiles?.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.enrollment_id} (role: ${p.role}, has_password: ${!!p.password_hash})`);
    });
  }

  console.log('\n=== STAFF DEBUG COMPLETE ===');
}

async function main() {
  await debugReadingProgress();
  await debugStaffLogin();
}

main().catch(console.error);
