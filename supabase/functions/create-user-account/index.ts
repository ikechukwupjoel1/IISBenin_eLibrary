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
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY') ?? '';
    
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

    const { email, password, full_name, role, enrollment_id, grade_level, phone_number, parent_email, institution_id } = await req.json();

    // Verify the requesting user's permissions for librarian/super_admin creation
    if (role === 'librarian' || role === 'super_admin') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Get the requesting user's profile
      const { data: requestingProfile, error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .select('role, institution_id')
        .eq('id', user.id)
        .single();

      if (profileError || !requestingProfile) {
        return new Response(JSON.stringify({ error: 'User profile not found' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Check permissions
      if (role === 'super_admin') {
        // Only super admins can create super admins
        if (requestingProfile.role !== 'super_admin') {
          return new Response(JSON.stringify({ error: 'Only super administrators can create super admin accounts' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      } else if (role === 'librarian') {
        // Super admins can create librarians anywhere, librarians can only create in their institution
        if (requestingProfile.role === 'librarian') {
          if (!institution_id || requestingProfile.institution_id !== institution_id) {
            return new Response(JSON.stringify({ error: 'Librarians can only create accounts in their own institution' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
        } else if (requestingProfile.role !== 'super_admin') {
          return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    if (!institution_id && role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'institution_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let authUserId = null;

    if (role === 'librarian' || role === 'super_admin') {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password,
        email_confirm: true,
        user_metadata: { 
          institution_id: role === 'librarian' ? institution_id : null,
          role: role
        },
      });

      if (authError || !authData.user) {
        return new Response(
          JSON.stringify({ error: authError?.message || 'Failed to create user' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      authUserId = authData.user.id;
    }

    let recordId: string | undefined;
    if (role === 'student') {
      const studentId = crypto.randomUUID();
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          id: studentId,
          name: full_name,
          email: parent_email || null,
          phone_number: phone_number || null,
          grade_level: grade_level,
          enrollment_id: enrollment_id,
          institution_id: institution_id,
        });

      if (studentError) {
        return new Response(JSON.stringify({ error: `Student creation failed: ${studentError.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      recordId = studentId;
    } else if (role === 'staff') {
      const staffId = crypto.randomUUID();
      const { data: staffData, error: staffError } = await supabaseAdmin
        .from('staff')
        .insert({
          id: staffId,
          name: full_name,
          email: email,
          phone_number: phone_number || null,
          enrollment_id: enrollment_id,
          institution_id: institution_id,
        });

      if (staffError) {
        return new Response(JSON.stringify({ error: `Staff creation failed: ${staffError.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      recordId = staffId;
    } else if (role === 'librarian' || role === 'super_admin') {
      // Librarians and super_admins don't need separate student/staff records
      recordId = undefined;
    } else {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const profileId = authUserId || recordId;

    const profileData: Record<string, any> = {
      id: profileId,
      email: role === 'librarian' || role === 'super_admin' ? email : (email ?? parent_email ?? null),
      full_name,
      role,
      enrollment_id: role === 'student' || role === 'staff' ? enrollment_id : null,
      password_hash: role !== 'librarian' && role !== 'super_admin' ? password : null,
      institution_id: role === 'super_admin' ? null : institution_id,
    };

    if (role === 'student') {
      profileData.student_id = recordId;
    } else if (role === 'staff') {
      profileData.staff_id = recordId;
    }

    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert(profileData);

    if (profileError) {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      }
      return new Response(JSON.stringify({ error: `Profile creation failed: ${profileError.message}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, user_id: profileId, enrollment_id }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});