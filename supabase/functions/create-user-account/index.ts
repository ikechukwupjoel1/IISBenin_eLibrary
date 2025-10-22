import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Note: SUPABASE_URL is automatically provided by Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    
    console.log('Environment check:', {
      supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
      serviceRoleKey: serviceRoleKey ? 'SET (length: ' + serviceRoleKey.length + ')' : 'NOT SET'
    });
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // TEMPORARY: Hardcode librarian ID for testing
    const callingUserId = '1c0b4d0f-a877-4555-9a46-d65cafc29cbe';
    console.log('Using hardcoded librarian ID:', callingUserId);

    const { email, password, full_name, role, enrollment_id, grade_level, phone_number, parent_email } = await req.json();

    // For students and staff, don't create auth user, for librarians use email
    const authEmail = role === 'librarian' ? email : null;
    let authUserId = null;

    if (role === 'librarian') {
      // Create auth user using admin client (doesn't affect current session)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ error: authError?.message || 'Failed to create user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authUserId = authData.user.id;
    }

    // Create student or staff record
    let recordId: string;
    if (role === 'student') {
      // Insert student record directly using admin client to bypass RLS
      const studentId = crypto.randomUUID();
      console.log('Attempting to insert student record:', {
        id: studentId,
        name: full_name,
        email: parent_email || null,
        phone_number: phone_number || null,
        grade_level: grade_level,
        enrollment_id: enrollment_id
      });

      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          id: studentId,
          name: full_name,
          email: parent_email || null, // Use parent email for student email field
          phone_number: phone_number || null,
          grade_level: grade_level,
          enrollment_id: enrollment_id
        });

      console.log('Student insert result:', { data: studentData, error: studentError });

      if (studentError) {
        console.error('Student insertion failed:', studentError);
        return new Response(
          JSON.stringify({ 
            error: `Student creation failed: ${studentError.message}`,
            debug: {
              studentId,
              enrollment_id,
              full_name,
              parent_email,
              phone_number,
              grade_level
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Student record created successfully with ID:', studentId);
      recordId = studentId;
    } else if (role === 'staff') {
      // For staff, DON'T create auth users - they work like students with password hashes
      // Insert staff record directly using admin client to bypass RLS
      const staffId = crypto.randomUUID();
      console.log('Attempting to insert staff record:', {
        id: staffId,
        name: full_name,
        email: email,
        phone_number: phone_number || null,
        enrollment_id: enrollment_id
      });

      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('staff')
        .insert({
          id: staffId,
          name: full_name,
          email: email,
          phone_number: phone_number || null,
          enrollment_id: enrollment_id
        });

      console.log('Staff insert result:', { data: staffData, error: staffError });

      if (staffError) {
        console.error('Staff insertion failed:', staffError);
        return new Response(
          JSON.stringify({ 
            error: `Staff creation failed: ${staffError.message}`,
            debug: {
              staffId,
              enrollment_id,
              full_name,
              email,
              phone_number
            }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Staff record created successfully with ID:', staffId);
      recordId = staffId;
    } else {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user profile using admin client to bypass RLS
    const profileId = authUserId || recordId; // Use recordId (student/staff ID) as profile ID for non-librarian users

    // Check if profile already exists (for librarians who might already have accounts)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', profileId)
      .maybeSingle();

    if (existingProfile) {
      console.log('Profile already exists for ID:', profileId);
      return new Response(
        JSON.stringify({
          success: true,
          user_id: profileId,
          enrollment_id,
          message: 'Account already exists',
          debug: {
            role,
            recordId,
            profileId,
            authUserId,
            existing: true
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prefer the auth email (librarians), then the provided email (staff), fall back to parent_email (students) or null
    const profileData: any = {
      id: profileId,
      email: authEmail ?? email ?? parent_email ?? null,
      full_name,
      role,
      enrollment_id,
      password_hash: role !== 'librarian' ? password : null, // Store password for students and staff
    };

    // If no contact info provided for non-librarian users, return a clear validation error
    if (role !== 'librarian' && !profileData.email && !phone_number) {
      console.error('Validation failed: missing email and phone for profile', { profileData, phone_number });
      // Cleanup created student/staff record if present
      if (role === 'student' && recordId) {
        await supabaseAdmin.from('students').delete().eq('id', recordId);
      }
      if (role === 'staff' && recordId) {
        await supabaseAdmin.from('staff').delete().eq('id', recordId);
      }
      return new Response(
        JSON.stringify({ code: 'validation_failed', message: 'missing email or phone' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (role === 'student') {
      profileData.student_id = recordId;
    } else if (role === 'staff') {
      profileData.staff_id = recordId;
    }

    console.log('Attempting to create user profile:', profileData);

    const { data: profileInsertData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData);

    console.log('Profile insert result:', { data: profileInsertData, error: profileError });

    if (profileError) {
      console.error('Profile creation failed:', profileError);
      // Cleanup: delete the auth user if it exists
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return new Response(
        JSON.stringify({ 
          error: `Profile creation failed: ${profileError.message}`,
          debug: profileData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile created successfully with ID:', profileId);

    // Fetch the created record (student or staff) to return to the caller for verification
    let createdRecord = null;
    if (role === 'student') {
      const { data } = await supabaseAdmin.from('students').select('*').eq('id', recordId).maybeSingle();
      createdRecord = data ?? null;
    } else if (role === 'staff') {
      const { data } = await supabaseAdmin.from('staff').select('*').eq('id', recordId).maybeSingle();
      createdRecord = data ?? null;
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: profileId,
        enrollment_id,
        createdRecord,
        debug: {
          role,
          recordId,
          profileId,
          authUserId
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});