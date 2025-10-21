// TEST: Verify that student creation actually inserts records into the database
// Run this after running test-student-creation.js to verify the records exist

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  console.log('Session:', session ? 'EXISTS' : 'MISSING');

  if (!session) {
    console.error('❌ No session found - please login');
    return;
  }

  console.log('Checking database records after student creation...');

  // Check students table
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent students:', students);
  if (studentsError) {
    console.error('Error fetching students:', studentsError);
  }

  // Check user_profiles table
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent user profiles:', profiles);
  if (profilesError) {
    console.error('Error fetching profiles:', profilesError);
  }

  // Check if the latest student has a corresponding profile
  if (students && students.length > 0 && profiles && profiles.length > 0) {
    const latestStudent = students[0];
    const latestProfile = profiles[0];

    console.log('Latest student:', latestStudent);
    console.log('Latest profile:', latestProfile);

    if (latestStudent.id === latestProfile.student_id) {
      console.log('✅ Student and profile IDs match!');
    } else {
      console.log('❌ Student and profile IDs do not match');
    }
  }
})();