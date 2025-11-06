import { createClient } from '@supabase/supabase-js';

// Load env vars from .env file
import fs from 'fs';
const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function checkStudentLink() {
  console.log('Checking student S0003 database links...\n');

  // 1. Get student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('id, user_id, enrollment_id, full_name')
    .eq('enrollment_id', 'S0003')
    .single();

  if (studentError) {
    console.error('Error fetching student:', studentError);
    return;
  }

  console.log('Student record:');
  console.log(JSON.stringify(student, null, 2));

  if (!student.user_id) {
    console.log('\n⚠️  WARNING: student.user_id is NULL!');
    console.log('This is why reading progress fails to load.');
    
    // Find the matching user_profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('enrollment_id', 'S0003')
      .single();
    
    if (profile) {
      console.log('\nFound matching user_profile:');
      console.log(JSON.stringify(profile, null, 2));
      console.log('\n✅ FIX: Update students.user_id to:', profile.id);
    }
    return;
  }

  // 2. Check user_profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', student.user_id)
    .single();

  console.log('\nUser profile:');
  console.log(JSON.stringify(profile, null, 2));

  // 3. Check active borrows
  const { data: borrows } = await supabase
    .from('borrow_records')
    .select('*, books:book_id(title)')
    .eq('student_id', student.id)
    .eq('status', 'active');

  console.log(`\nActive borrows: ${borrows?.length || 0}`);
  if (borrows && borrows.length > 0) {
    borrows.forEach((b, i) => {
      console.log(`  ${i + 1}. ${b.books?.title || 'Unknown'} (due: ${b.due_date})`);
    });
  }

  // 4. Check reading progress
  const { data: progress } = await supabase
    .from('reading_progress')
    .select('*')
    .eq('user_id', profile.id)
    .order('session_date', { ascending: false });

  console.log(`\nReading progress records: ${progress?.length || 0}`);
  if (progress && progress.length > 0) {
    progress.slice(0, 3).forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.session_date} - Page ${p.current_page} (${p.percentage_complete}%)`);
    });
  }
}

checkStudentLink().catch(console.error);
