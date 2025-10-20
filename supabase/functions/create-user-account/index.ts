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
    
    const supabaseAdmin = createClient(
      supabaseUrl,
      Deno.env.get('SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // TEMPORARY: Hardcode librarian ID for testing
    // We know you have librarian: iksotech@gmail.com with ID: 1c0b4d0f-a877-4555-9a46-d65cafc29cbe
    const callingUserId = '1c0b4d0f-a877-4555-9a46-d65cafc29cbe';
    console.log('Using hardcoded librarian ID:', callingUserId);

    const { email, password, full_name, role, enrollment_id, grade_level, phone_number, parent_email } = await req.json();

    // For students, use parent_email for auth, otherwise use email
    const authEmail = role === 'student' ? (parent_email || email) : email;

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

    // Check if user profile already exists (shouldn't happen with new auth user)
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (existingProfile) {
      // Cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'User profile already exists for this user' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create student or staff record
    let recordId: string;
    if (role === 'student') {
      const { data: studentIdResult, error: studentError } = await supabaseAdmin.rpc('create_student_member', {
        p_name: full_name,
        p_email: authEmail,
        p_phone_number: phone_number || null,
        p_grade_level: grade_level,
        p_enrollment_id: enrollment_id,
        p_password_hash: password,
        p_calling_user_id: callingUserId,
      });

      if (studentError) {
        // Cleanup: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: studentError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      recordId = studentIdResult;
    } else if (role === 'staff') {
      const { data: staffIdResult, error: staffError } = await supabaseAdmin.rpc('create_staff_member', {
        p_name: full_name,
        p_email: email,
        p_phone_number: phone_number || null,
        p_enrollment_id: enrollment_id,
        p_password_hash: password,
        p_calling_user_id: callingUserId,
      });

      if (staffError) {
        // Cleanup: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(
          JSON.stringify({ error: staffError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      recordId = staffIdResult;
    } else {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: 'Invalid role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user profile using admin client to bypass RLS
    const profileData: any = {
      id: authData.user.id,
      email: authEmail,
      full_name,
      role,
      enrollment_id,
    };

    if (role === 'student') {
      profileData.student_id = recordId;
      profileData.parent_email = parent_email || authEmail;
    } else if (role === 'staff') {
      profileData.staff_id = recordId;
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData);

    if (profileError) {
      // Cleanup: delete the auth user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: profileError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authData.user.id,
        enrollment_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});