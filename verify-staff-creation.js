// TEST: Verify that staff creation actually inserts records into the database
// Run this after running test-staff-creation.js to verify the records exist

(async () => {
  const { data: { session } } = await supabase.auth.getSession();

  console.log('Session:', session ? 'EXISTS' : 'MISSING');

  if (!session) {
    console.error('❌ No session found - please login');
    return;
  }

  console.log('Checking database records after staff creation...');

  // Check staff table
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  console.log('Recent staff:', staff);
  if (staffError) {
    console.error('Error fetching staff:', staffError);
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

  // Check if the latest staff has a corresponding profile
  if (staff && staff.length > 0 && profiles && profiles.length > 0) {
    const latestStaff = staff[0];
    const latestProfile = profiles[0];

    console.log('Latest staff:', latestStaff);
    console.log('Latest profile:', latestProfile);

    if (latestStaff.id === latestProfile.staff_id) {
      console.log('✅ Staff and profile IDs match!');
    } else {
      console.log('❌ Staff and profile IDs do not match');
    }
  }
})();