const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function testReadingProgressFix() {
  console.log('=== Testing Reading Progress Fix ===\n');

  // Simulate what the component does
  const profile = {
    id: '24142e48-e76f-4265-86a6-03e3efe18a32',
    enrollment_id: 'S0003',
    role: 'student'
  };

  console.log('1. Fetching student by enrollment_id:', profile.enrollment_id);
  
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id, enrollment_id, name')
    .eq('enrollment_id', profile.enrollment_id)
    .single();

  if (studentError) {
    console.error('❌ Error:', studentError.message);
    return;
  }

  console.log('✅ Student found:', studentData);

  console.log('\n2. Fetching active borrows for student_id:', studentData.id);
  
  const { data: borrows, error: borrowError } = await supabase
    .from('borrow_records')
    .select(`
      id,
      book_id,
      due_date,
      status,
      books:book_id (title, author_publisher)
    `)
    .eq('student_id', studentData.id)
    .eq('status', 'active');

  if (borrowError) {
    console.error('❌ Error:', borrowError.message);
    return;
  }

  console.log(`✅ Active borrows found: ${borrows?.length || 0}`);
  if (borrows && borrows.length > 0) {
    borrows.forEach((b, i) => {
      const bookData = Array.isArray(b.books) ? b.books[0] : b.books;
      console.log(`  ${i + 1}. ${bookData?.title || 'Unknown'} (due: ${b.due_date})`);
    });
  } else {
    console.log('  (No active borrows - this is why reading progress shows empty)');
  }

  console.log('\n✅ Reading Progress should now load without errors!');
}

testReadingProgressFix().catch(console.error);
