-- Create librarian invitations table
CREATE TABLE IF NOT EXISTS public.librarian_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_user_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  UNIQUE(institution_id, email, status)
);

-- Add RLS policies
ALTER TABLE public.librarian_invitations ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "Super admins full access" ON public.librarian_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Anyone can view their own invitation by token (for registration page)
CREATE POLICY "Public can view by token" ON public.librarian_invitations
  FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > NOW());

-- Create index for faster lookups
CREATE INDEX idx_librarian_invitations_token ON public.librarian_invitations(token);
CREATE INDEX idx_librarian_invitations_email ON public.librarian_invitations(email);
CREATE INDEX idx_librarian_invitations_status ON public.librarian_invitations(status);

-- Function to create invitation
CREATE OR REPLACE FUNCTION public.create_librarian_invitation(
  p_institution_id UUID,
  p_email TEXT
)
RETURNS TABLE (
  id UUID,
  institution_id UUID,
  email TEXT,
  token TEXT,
  invited_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  -- Check if caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can create invitations';
  END IF;

  -- Generate secure random token
  v_token := encode(gen_random_bytes(32), 'base64');
  v_token := replace(replace(replace(v_token, '/', '_'), '+', '-'), '=', '');

  -- Revoke any existing pending invitations for this email at this institution
  UPDATE librarian_invitations
  SET status = 'revoked'
  WHERE librarian_invitations.institution_id = p_institution_id
    AND librarian_invitations.email = p_email
    AND status = 'pending';

  -- Create new invitation
  INSERT INTO librarian_invitations (
    institution_id,
    email,
    token,
    invited_by
  )
  VALUES (
    p_institution_id,
    p_email,
    v_token,
    auth.uid()
  )
  RETURNING librarian_invitations.id INTO v_invitation_id;

  -- Return the invitation details
  RETURN QUERY
  SELECT
    i.id,
    i.institution_id,
    i.email,
    i.token,
    i.invited_at,
    i.expires_at
  FROM librarian_invitations i
  WHERE i.id = v_invitation_id;
END;
$$;

-- Function to accept invitation and create librarian account
CREATE OR REPLACE FUNCTION public.accept_librarian_invitation(
  p_token TEXT,
  p_full_name TEXT,
  p_password TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invitation RECORD;
  v_user_id UUID;
  v_institution_name TEXT;
BEGIN
  -- Find valid invitation
  SELECT * INTO v_invitation
  FROM librarian_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Invalid or expired invitation token', NULL::UUID;
    RETURN;
  END IF;

  -- Get institution name
  SELECT name INTO v_institution_name
  FROM institutions
  WHERE id = v_invitation.institution_id;

  -- Create auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  )
  VALUES (
    v_invitation.email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    false,
    'authenticated'
  )
  RETURNING id INTO v_user_id;

  -- Create user profile
  INSERT INTO user_profiles (
    id,
    email,
    full_name,
    role,
    institution_id
  )
  VALUES (
    v_user_id,
    v_invitation.email,
    p_full_name,
    'librarian',
    v_invitation.institution_id
  );

  -- Mark invitation as accepted
  UPDATE librarian_invitations
  SET
    status = 'accepted',
    accepted_at = NOW(),
    created_user_id = v_user_id
  WHERE id = v_invitation.id;

  RETURN QUERY SELECT true, 'Account created successfully', v_user_id;
END;
$$;
