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

async function fixEnrollmentId() {
  console.log('\n🔧 Fixing enrollment_id mismatch for student...\n');

  const studentId = '24142e48-e76f-4265-86a6-03e3efe18a32';

  // Update user_profiles to match students table
  const { data, error } = await supabase
    .from('user_profiles')
    .update({
      enrollment_id: 'S0003'
    })
    .eq('student_id', studentId)
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Fixed! Updated enrollment_id in user_profiles:');
    console.log(JSON.stringify(data, null, 2));
  }

  // Verify
  console.log('\n🔍 Verifying fix...');
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', 'S0003')
    .eq('role', 'student')
    .maybeSingle();

  if (profile) {
    console.log('\n✅ SUCCESS! Profile found with enrollment_id S0003:');
    console.log(JSON.stringify(profile, null, 2));
    console.log('\n✅ You can now login with:');
    console.log('   Enrollment ID: S0003');
    console.log('   Password: *Zy5C^LemK$6');
  } else {
    console.log('\n❌ Still not found');
  }
}

fixEnrollmentId().catch(console.error);
