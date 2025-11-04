-- =====================================================
-- ADD SAMPLE DATA FOR IIS BENIN LIBRARY
-- =====================================================
-- This adds sample books, students, and staff to test all features
-- Simplified version matching original schema
-- =====================================================

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
  
  -- Add sample books (filling both author AND author_publisher columns, plus institution_id)
  INSERT INTO books (title, author, author_publisher, isbn, category, status, institution_id)
  VALUES 
    ('Introduction to Mathematics', 'John Smith', 'John Smith', '978-1234567890', 'Mathematics', 'available', institution_uuid),
    ('English Grammar Advanced', 'Jane Doe', 'Jane Doe', '978-0987654321', 'English Language', 'borrowed', institution_uuid),
    ('Biology Textbook Grade 10', 'Dr. Brown', 'Dr. Brown', '978-1111111111', 'Biology', 'available', institution_uuid),
    ('Chemistry Basics', 'Prof. White', 'Prof. White', '978-2222222222', 'Chemistry', 'borrowed', institution_uuid),
    ('World History Complete', 'Dr. Green', 'Dr. Green', '978-3333333333', 'History', 'available', institution_uuid),
    ('Physics for Beginners', 'Dr. James', 'Dr. James', '978-4444444444', 'Physics', 'borrowed', institution_uuid),
    ('Computer Science 101', 'Prof. Tech', 'Prof. Tech', '978-5555555555', 'Computer Science', 'available', institution_uuid),
    ('Geography Atlas', 'Map Masters', 'Map Masters', '978-6666666666', 'Geography', 'borrowed', institution_uuid),
    ('Literature Anthology', 'Various Authors', 'Various Authors', '978-7777777777', 'Literature', 'available', institution_uuid),
    ('Economics Principles', 'Dr. Money', 'Dr. Money', '978-8888888888', 'Economics', 'borrowed', institution_uuid)
  ON CONFLICT (isbn) DO NOTHING;
  
  RAISE NOTICE '✅ Added 10 sample books';
  
  -- Add sample students (if they don't exist)
  INSERT INTO students (name, email, grade_level, enrollment_id, institution_id)
  VALUES 
    ('Alice Johnson', 'alice.j@student.local', 'Grade 10', 'STU001', institution_uuid),
    ('Bob Williams', 'bob.w@student.local', 'Grade 11', 'STU002', institution_uuid),
    ('Carol Davis', 'carol.d@student.local', 'Grade 9', 'STU003', institution_uuid),
    ('David Miller', 'david.m@student.local', 'Grade 12', 'STU004', institution_uuid),
    ('Emma Wilson', 'emma.w@student.local', 'Grade 10', 'STU005', institution_uuid)
  ON CONFLICT (enrollment_id) DO NOTHING;
  
  RAISE NOTICE '✅ Added 5 sample students';
  
  -- Add sample staff (if they don't exist)
  INSERT INTO staff (name, email, enrollment_id, phone_number, institution_id)
  VALUES 
    ('Mr. John Teacher', 'john.teacher@school.com', 'STAFF001', '+229-12345678', institution_uuid),
    ('Ms. Sarah Admin', 'sarah.admin@school.com', 'STAFF002', '+229-87654321', institution_uuid)
  ON CONFLICT (enrollment_id) DO NOTHING;
  
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
