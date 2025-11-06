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

async function testStudentLogin() {
  const enrollmentId = 'S0003';
  const password = '*Zy5C^LemK$6';

  console.log('\n🔍 Testing Student Login...');
  console.log('Enrollment ID:', enrollmentId);
  console.log('Password:', password);

  // Check if student exists
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();

  console.log('\n📋 Student Record:');
  if (studentError) {
    console.error('❌ Error fetching student:', studentError);
  } else if (!student) {
    console.log('❌ No student found with enrollment_id:', enrollmentId);
  } else {
    console.log('✅ Student found:', {
      id: student.id,
      name: student.name,
      enrollment_id: student.enrollment_id,
      institution_id: student.institution_id
    });
  }

  // Check user_profiles
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .eq('role', 'student')
    .maybeSingle();

  console.log('\n👤 User Profile:');
  if (profileError) {
    console.error('❌ Error fetching profile:', profileError);
  } else if (!profile) {
    console.log('❌ No user profile found with enrollment_id:', enrollmentId);
  } else {
    console.log('✅ Profile found:', {
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      enrollment_id: profile.enrollment_id,
      role: profile.role,
      has_password_hash: !!profile.password_hash,
      password_hash_preview: profile.password_hash ? profile.password_hash.substring(0, 20) + '...' : 'null'
    });
    
    // Check if password matches
    if (profile.password_hash === password) {
      console.log('\n✅ Password matches (plain text)');
    } else {
      console.log('\n❌ Password does NOT match');
      console.log('Expected:', password);
      console.log('Stored (first 20 chars):', profile.password_hash?.substring(0, 20));
    }
  }

  // Test the verify-login endpoint
  console.log('\n🔐 Testing verify-login endpoint...');
  try {
    const response = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/verify-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        enrollment_id: enrollmentId,
        password: password,
        role: 'student',
      }),
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', result);

    if (result.valid) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Error calling verify-login:', error);
  }
}

testStudentLogin().catch(console.error);
