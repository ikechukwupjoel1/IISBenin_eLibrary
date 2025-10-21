// DEBUG: Test student login authentication
// Run this in browser console after creating a student

(async () => {
  // Replace these with the actual credentials from student creation
  const enrollmentId = 'STU85043294'; // From the student record you showed
  const password = 'TestPass123'; // You'll need to get this from the creation response

  console.log('Testing student login with:', { enrollmentId, password });

  // Step 1: Check if student exists in students table
  const { data: student, error: studentError } = await supabase
    .from('students')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .maybeSingle();

  console.log('Student lookup result:', { student, error: studentError });

  if (!student) {
    console.error('❌ Student not found in students table');
    return;
  }

  // Step 2: Check if profile exists in user_profiles table
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .eq('role', 'student')
    .maybeSingle();

  console.log('Profile lookup result:', { profile, error: profileError });

  if (!profile) {
    console.error('❌ Profile not found in user_profiles table');

    // Try fallback lookup by student_id
    const { data: fallbackProfile, error: fallbackError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('student_id', student.id)
      .eq('role', 'student')
      .maybeSingle();

    console.log('Fallback profile lookup result:', { fallbackProfile, error: fallbackError });

    if (!fallbackProfile) {
      console.error('❌ Profile not found even with fallback lookup');
      return;
    }
  }

  const foundProfile = profile || fallbackProfile;

  // Step 3: Check password
  console.log('Stored password hash:', foundProfile.password_hash);
  console.log('Provided password:', password);
  console.log('Password match:', foundProfile.password_hash === password);

  if (foundProfile.password_hash !== password) {
    console.error('❌ Password mismatch');
    return;
  }

  console.log('✅ Student authentication should work');
})();