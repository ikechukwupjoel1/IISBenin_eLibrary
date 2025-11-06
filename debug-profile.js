import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_ANON_KEY
);

async function checkProfile() {
  console.log('\n🔍 Checking user_profiles for S0003...\n');

  // Method 1: By enrollment_id and role
  const { data: byEnrollment, error: e1 } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', 'S0003')
    .eq('role', 'student')
    .maybeSingle();

  console.log('Method 1 (enrollment_id + role):');
  console.log(byEnrollment ? JSON.stringify(byEnrollment, null, 2) : 'NOT FOUND');
  if (e1) console.error('Error:', e1);

  // Method 2: By enrollment_id only (case-insensitive)
  const { data: byEnrollmentOnly, error: e2 } = await supabase
    .from('user_profiles')
    .select('*')
    .ilike('enrollment_id', 'S0003')
    .maybeSingle();

  console.log('\nMethod 2 (enrollment_id only, case-insensitive):');
  console.log(byEnrollmentOnly ? JSON.stringify(byEnrollmentOnly, null, 2) : 'NOT FOUND');
  if (e2) console.error('Error:', e2);

  // Method 3: By student_id
  const { data: byStudentId, error: e3 } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('student_id', '24142e48-e76f-4265-86a6-03e3efe18a32')
    .maybeSingle();

  console.log('\nMethod 3 (student_id):');
  console.log(byStudentId ? JSON.stringify(byStudentId, null, 2) : 'NOT FOUND');
  if (e3) console.error('Error:', e3);

  // Method 4: Get all student profiles
  const { data: allStudents, error: e4 } = await supabase
    .from('user_profiles')
    .select('enrollment_id, role, full_name, email')
    .eq('role', 'student')
    .limit(10);

  console.log('\nAll student profiles (first 10):');
  console.log(JSON.stringify(allStudents, null, 2));
  if (e4) console.error('Error:', e4);
}

checkProfile().catch(console.error);
