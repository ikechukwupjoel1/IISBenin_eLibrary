
-- Re-create the borrow_records table as it does not exist.
CREATE TABLE IF NOT EXISTS borrow_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  borrow_date timestamptz DEFAULT now(),
  due_date timestamptz NOT NULL,
  return_date timestamptz,
  status text DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  created_at timestamptz DEFAULT now()
);

-- Add staff support to borrow_records (from 20251008085142_add_role_based_access_and_new_features.sql)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_records' AND column_name = 'staff_id'
  ) THEN
    ALTER TABLE borrow_records ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE CASCADE;
    ALTER TABLE borrow_records DROP CONSTRAINT IF EXISTS borrower_check;
    ALTER TABLE borrow_records ADD CONSTRAINT borrower_check 
      CHECK ((student_id IS NOT NULL AND staff_id IS NULL) OR (student_id IS NULL AND staff_id IS NOT NULL));
  END IF;
END $$;

-- Enable Row Level Security for borrow_records
ALTER TABLE borrow_records ENABLE ROW LEVEL SECURITY;

-- Re-apply RLS policies for borrow_records (from 20251008085142_add_role_based_access_and_new_features.sql and 20251021000005_add_borrow_records_select_policy.sql)
DROP POLICY IF EXISTS "Authenticated users can manage borrow records" ON borrow_records;

CREATE POLICY "Librarians and staff can insert borrow records"
  ON borrow_records FOR INSERT
  TO authenticated
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Librarians and staff can update borrow records"
  ON borrow_records FOR UPDATE
  TO authenticated
  USING (get_user_role(auth.uid()) IN ('librarian', 'staff'))
  WITH CHECK (get_user_role(auth.uid()) IN ('librarian', 'staff'));

CREATE POLICY "Only librarians can delete borrow records"
  ON borrow_records FOR DELETE
  TO authenticated
  USING (get_user_role(auth.uid()) = 'librarian');

CREATE POLICY "Librarians and staff can view all borrow records"
  ON borrow_records FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid()) IN ('librarian', 'staff')
  );
