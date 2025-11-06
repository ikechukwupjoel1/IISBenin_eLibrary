const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkTables() {
  console.log('=== Checking students table ===\n');
  
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .limit(3);

  if (studentsError) {
    console.error('Error:', studentsError);
  } else {
    console.log('Students columns:', students && students.length > 0 ? Object.keys(students[0]) : 'No data');
    console.log('Sample data:', JSON.stringify(students?.[0], null, 2));
  }

  console.log('\n=== Checking staff table ===\n');
  
  const { data: staff } = await supabase
    .from('staff')
    .select('*')
    .limit(1);

  console.log('Staff columns:', staff && staff.length > 0 ? Object.keys(staff[0]) : 'No data');
  console.log('Sample data:', JSON.stringify(staff?.[0], null, 2));
}

checkTables().catch(console.error);
