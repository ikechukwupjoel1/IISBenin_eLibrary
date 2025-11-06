import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env file
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

async function checkAndFixStudent() {
  console.log('\n🔍 Checking student S0003...\n');

  // Get full student record
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('enrollment_id', 'S0003')
    .single();

  if (studentError) {
    console.error('❌ Error:', studentError);
    return;
  }

  console.log('📋 Student Record:');
  console.log(JSON.stringify(student, null, 2));

  // Check if user_profile exists
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('student_id', student.id)
    .maybeSingle();

  if (profile) {
    console.log('\n✅ User profile exists:', profile.id);
  } else {
    console.log('\n❌ NO user profile found!');
    console.log('\n🔧 Creating user profile...');

    // Create the missing user_profile
    const email = student.parent_email || student.email || `${student.enrollment_id.toLowerCase()}@temp.com`;
    
    const { data: newProfile, error: insertError } = await supabase
      .from('user_profiles')
      .insert({
        email: email.toLowerCase(),
        full_name: student.name,
        role: 'student',
        enrollment_id: student.enrollment_id,
        student_id: student.id,
        institution_id: student.institution_id,
        password_hash: '*Zy5C^LemK$6',  // The password you're trying to use
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating profile:', insertError);
    } else {
      console.log('✅ Profile created successfully!');
      console.log(JSON.stringify(newProfile, null, 2));
    }
  }
}

checkAndFixStudent().catch(console.error);
