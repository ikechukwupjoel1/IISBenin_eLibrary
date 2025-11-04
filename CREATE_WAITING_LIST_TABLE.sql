-- Create book_waitlist table
CREATE TABLE IF NOT EXISTS public.book_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'notified', 'cancelled', 'fulfilled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_waitlist_book_id ON public.book_waitlist(book_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_user_id ON public.book_waitlist(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_status ON public.book_waitlist(status);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.book_waitlist(created_at);

-- Enable Row Level Security
ALTER TABLE public.book_waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own waitlist entries" ON public.book_waitlist;
DROP POLICY IF EXISTS "Users can create their own waitlist entries" ON public.book_waitlist;
DROP POLICY IF EXISTS "Users can update their own waitlist entries" ON public.book_waitlist;
DROP POLICY IF EXISTS "Librarians can view all waitlist in their institution" ON public.book_waitlist;
DROP POLICY IF EXISTS "Librarians can manage all waitlist in their institution" ON public.book_waitlist;
DROP POLICY IF EXISTS "Super admins can view all waitlist" ON public.book_waitlist;
DROP POLICY IF EXISTS "Super admins can manage all waitlist" ON public.book_waitlist;

-- RLS Policies for book_waitlist

-- Users can view their own waitlist entries
CREATE POLICY "Users can view their own waitlist entries"
  ON public.book_waitlist
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own waitlist entries
CREATE POLICY "Users can create their own waitlist entries"
  ON public.book_waitlist
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own waitlist entries (cancel only)
CREATE POLICY "Users can update their own waitlist entries"
  ON public.book_waitlist
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Librarians can view all waitlist entries
CREATE POLICY "Librarians can view all waitlist in their institution"
  ON public.book_waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
    )
  );

-- Librarians can manage waitlist entries
CREATE POLICY "Librarians can manage all waitlist in their institution"
  ON public.book_waitlist
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'librarian'
    )
  );

-- Super admins can view all waitlist
CREATE POLICY "Super admins can view all waitlist"
  ON public.book_waitlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Super admins can manage all waitlist
CREATE POLICY "Super admins can manage all waitlist"
  ON public.book_waitlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'super_admin'
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_waitlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_waitlist_updated_at_trigger ON public.book_waitlist;
CREATE TRIGGER update_waitlist_updated_at_trigger
  BEFORE UPDATE ON public.book_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_waitlist_updated_at();

-- Create function to auto-notify next person in queue when book is returned
CREATE OR REPLACE FUNCTION notify_next_in_waitlist()
RETURNS TRIGGER AS $$
BEGIN
  -- When a book is returned, notify the first person in the waiting list
  IF NEW.return_date IS NOT NULL AND OLD.return_date IS NULL THEN
    UPDATE public.book_waitlist
    SET status = 'notified',
        notified_at = NOW(),
        updated_at = NOW()
    WHERE book_id = NEW.book_id
      AND status = 'waiting'
      AND id = (
        SELECT id FROM public.book_waitlist
        WHERE book_id = NEW.book_id
          AND status = 'waiting'
        ORDER BY created_at ASC
        LIMIT 1
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on borrow_records table to notify waitlist
DROP TRIGGER IF EXISTS notify_waitlist_on_return ON public.borrow_records;
CREATE TRIGGER notify_waitlist_on_return
  AFTER UPDATE ON public.borrow_records
  FOR EACH ROW
  EXECUTE FUNCTION notify_next_in_waitlist();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.book_waitlist TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

COMMENT ON TABLE public.book_waitlist IS 'Stores waiting list for borrowed books';
COMMENT ON COLUMN public.book_waitlist.status IS 'Waitlist status: waiting, notified, cancelled, fulfilled';
