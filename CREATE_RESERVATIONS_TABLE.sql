-- Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled', 'expired')),
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_book_id ON public.reservations(book_id);
CREATE INDEX IF NOT EXISTS idx_reservations_student_id ON public.reservations(student_id);
CREATE INDEX IF NOT EXISTS idx_reservations_staff_id ON public.reservations(staff_id);
CREATE INDEX IF NOT EXISTS idx_reservations_institution_id ON public.reservations(institution_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_expires_at ON public.reservations(expires_at);

-- Enable Row Level Security
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can create their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Users can update their own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Librarians can view all reservations in their institution" ON public.reservations;
DROP POLICY IF EXISTS "Librarians can manage all reservations in their institution" ON public.reservations;
DROP POLICY IF EXISTS "Super admins can view all reservations" ON public.reservations;
DROP POLICY IF EXISTS "Super admins can manage all reservations" ON public.reservations;

-- RLS Policies for reservations

-- Students and staff can view their own reservations
CREATE POLICY "Users can view their own reservations"
  ON public.reservations
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = reservations.institution_id
    )
  );

-- Users can create their own reservations
CREATE POLICY "Users can create their own reservations"
  ON public.reservations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own reservations (cancel only)
CREATE POLICY "Users can update their own reservations"
  ON public.reservations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Librarians can view all reservations in their institution
CREATE POLICY "Librarians can view all reservations in their institution"
  ON public.reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = reservations.institution_id
    )
  );

-- Librarians can manage (fulfill/cancel) reservations in their institution
CREATE POLICY "Librarians can manage all reservations in their institution"
  ON public.reservations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
      AND user_profiles.institution_id = reservations.institution_id
    )
  );

-- Super admins can view all reservations
CREATE POLICY "Super admins can view all reservations"
  ON public.reservations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can manage all reservations
CREATE POLICY "Super admins can manage all reservations"
  ON public.reservations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_reservations_updated_at_trigger ON public.reservations;
CREATE TRIGGER update_reservations_updated_at_trigger
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_reservations_updated_at();

-- Create function to auto-expire old reservations
CREATE OR REPLACE FUNCTION expire_old_reservations()
RETURNS void AS $$
BEGIN
  UPDATE public.reservations
  SET status = 'expired',
      updated_at = NOW()
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.reservations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE public.reservations IS 'Stores book reservation requests from students and staff';
COMMENT ON COLUMN public.reservations.status IS 'Reservation status: pending, fulfilled, cancelled, expired';
COMMENT ON COLUMN public.reservations.expires_at IS 'Reservation expires after 48 hours if not fulfilled';
