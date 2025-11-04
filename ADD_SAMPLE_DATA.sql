-- =====================================================
-- ADD SAMPLE DATA FOR IIS BENIN LIBRARY
-- =====================================================
-- This adds sample books, students, and staff to test all features
-- =====================================================

-- Get institution ID
DO $$
DECLARE
  institution_uuid UUID;
BEGIN
  -- Get IIS Benin institution ID
  SELECT id INTO institution_uuid FROM institutions WHERE name ILIKE '%benin%' LIMIT 1;
  
  IF institution_uuid IS NULL THEN
    RAISE EXCEPTION 'IIS Benin institution not found!';
  END IF;
  
  RAISE NOTICE 'Found institution ID: %', institution_uuid;
  
  -- Add sample books
  INSERT INTO books (title, author, isbn, category, total_copies, available_copies, status, institution_id, material_type, condition, page_number)
  VALUES 
    ('Introduction to Mathematics', 'John Smith', '978-1234567890', 'Mathematics', 5, 5, 'available', institution_uuid, 'book', 'good', '350'),
    ('English Grammar Advanced', 'Jane Doe', '978-0987654321', 'English Language', 3, 2, 'borrowed', institution_uuid, 'book', 'good', '420'),
    ('Biology Textbook Grade 10', 'Dr. Brown', '978-1111111111', 'Biology', 10, 10, 'available', institution_uuid, 'book', 'excellent', '580'),
    ('Chemistry Basics', 'Prof. White', '978-2222222222', 'Chemistry', 8, 6, 'borrowed', institution_uuid, 'book', 'good', '400'),
    ('World History Complete', 'Dr. Green', '978-3333333333', 'History', 6, 6, 'available', institution_uuid, 'book', 'good', '650'),
    ('Physics for Beginners', 'Dr. James', '978-4444444444', 'Physics', 7, 5, 'borrowed', institution_uuid, 'book', 'fair', '320'),
    ('Computer Science 101', 'Prof. Tech', '978-5555555555', 'Computer Science', 4, 4, 'available', institution_uuid, 'book', 'excellent', '280'),
    ('Geography Atlas', 'Map Masters', '978-6666666666', 'Geography', 5, 3, 'borrowed', institution_uuid, 'book', 'good', '200'),
    ('Literature Anthology', 'Various Authors', '978-7777777777', 'Literature', 8, 8, 'available', institution_uuid, 'book', 'good', '500'),
    ('Economics Principles', 'Dr. Money', '978-8888888888', 'Economics', 6, 4, 'borrowed', institution_uuid, 'book', 'good', '380')
  ON CONFLICT (isbn, institution_id) DO NOTHING;
  
  RAISE NOTICE '✅ Added 10 sample books';
  
  -- Add sample students (if they don't exist)
  INSERT INTO students (name, email, grade_level, enrollment_id, institution_id)
  VALUES 
    ('Alice Johnson', 'alice.j@student.local', 'Grade 10', 'STU001', institution_uuid),
    ('Bob Williams', 'bob.w@student.local', 'Grade 11', 'STU002', institution_uuid),
    ('Carol Davis', 'carol.d@student.local', 'Grade 9', 'STU003', institution_uuid),
    ('David Miller', 'david.m@student.local', 'Grade 12', 'STU004', institution_uuid),
    ('Emma Wilson', 'emma.w@student.local', 'Grade 10', 'STU005', institution_uuid)
  ON CONFLICT (enrollment_id, institution_id) DO NOTHING;
  
  RAISE NOTICE '✅ Added 5 sample students';
  
  -- Add sample staff (if they don't exist)
  INSERT INTO staff (name, email, enrollment_id, phone_number, institution_id)
  VALUES 
    ('Mr. John Teacher', 'john.teacher@school.com', 'STAFF001', '+229-12345678', institution_uuid),
    ('Ms. Sarah Admin', 'sarah.admin@school.com', 'STAFF002', '+229-87654321', institution_uuid)
  ON CONFLICT (enrollment_id, institution_id) DO NOTHING;
  
  RAISE NOTICE '✅ Added 2 sample staff members';
  
END $$;

-- Verify the data was added
SELECT 
  (SELECT COUNT(*) FROM books WHERE institution_id = (SELECT id FROM institutions WHERE name ILIKE '%benin%' LIMIT 1)) as total_books,
  (SELECT COUNT(*) FROM students WHERE institution_id = (SELECT id FROM institutions WHERE name ILIKE '%benin%' LIMIT 1)) as total_students,
  (SELECT COUNT(*) FROM staff WHERE institution_id = (SELECT id FROM institutions WHERE name ILIKE '%benin%' LIMIT 1)) as total_staff;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SAMPLE DATA ADDED SUCCESSFULLY!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refresh your Books, Students, and Staff tabs to see the data';
  RAISE NOTICE 'You should now see Edit/Delete buttons on books';
END $$;
