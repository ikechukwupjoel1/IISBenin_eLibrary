-- Insert the default institution for all existing data.
-- All current books, students, staff, etc., will belong to this institution.

INSERT INTO institutions (name)
VALUES ('IISBenin Library')
ON CONFLICT (name) DO NOTHING;
