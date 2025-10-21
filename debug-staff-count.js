// DEBUG: Check staff count and data
// Run this in browser console to see why staff count isn't updating

(async () => {
  console.log('Checking staff data...');

  // Check staff table
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Staff table data:', staff);
  console.log('Staff error:', staffError);
  console.log('Staff count:', staff?.length || 0);

  // Check user_profiles for staff
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', 'staff')
    .order('created_at', { ascending: false })
    .limit(10);

  console.log('Staff profiles:', profiles);
  console.log('Profiles error:', profilesError);
  console.log('Staff profiles count:', profiles?.length || 0);

  // Check if they match
  if (staff && profiles) {
    const staffIds = staff.map(s => s.id);
    const profileStaffIds = profiles.map(p => p.staff_id);

    console.log('Staff IDs:', staffIds);
    console.log('Profile staff_ids:', profileStaffIds);

    const matches = staffIds.filter(id => profileStaffIds.includes(id));
    console.log('Matching IDs:', matches);
    console.log('Match count:', matches.length);
  }
})();