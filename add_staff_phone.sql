-- Add phone_number column to staff table to match the create_staff_member function
ALTER TABLE staff ADD COLUMN phone_number text;

-- Add comment
COMMENT ON COLUMN staff.phone_number IS 'Staff phone number';