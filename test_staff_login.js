// Test staff login with the fixed system
// Run this in browser console

(async () => {
  console.log('Testing staff login...');

  // Use the enrollment ID and password from the test above
  const enrollmentId = 'STAFF1582393'; // The original one that was created
  const password = '6AVzVfyL'; // The password that was generated

  try {
    // First, check if the profile exists
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('enrollment_id', enrollmentId)
      .eq('role', 'staff')
      .maybeSingle();

    if (profileError) {
      console.error('❌ Profile lookup error:', profileError);
      return;
    }

    if (!profileData) {
      console.error('❌ Staff profile not found');
      return;
    }

    console.log('✅ Profile found:', profileData);
    console.log('Password hash matches:', profileData.password_hash === password);

    // Now test the login logic (simulate what AuthContext does)
    if (profileData.password_hash !== password) {
      console.error('❌ Password mismatch');
      return;
    }

    console.log('✅ Password verified! Staff login should work.');

    // Check if staff record exists
    if (profileData.staff_id) {
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('id', profileData.staff_id)
        .maybeSingle();

      if (staffError) {
        console.error('❌ Staff record lookup error:', staffError);
      } else if (staffData) {
        console.log('✅ Staff record found:', staffData);
      } else {
        console.error('❌ Staff record not found despite profile existing');
      }
    } else {
      console.error('❌ No staff_id in profile');
    }

  } catch (err) {
    console.error('❌ Exception:', err);
  }
})();