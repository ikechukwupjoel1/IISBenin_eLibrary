-- ============================================
-- FIX BOOKS TABLE - PART 1: ADD COLUMNS
-- ============================================
-- Run this first, then run PART 2
-- ============================================

-- Add publisher column (separate from author_publisher)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publisher TEXT;

-- Add publication_year column
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS publication_year INTEGER;

-- Add pages column (different from page_number for ebooks)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS pages INTEGER;

-- Add quantity column (total copies in library)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Add available_quantity column (copies currently available to borrow)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS available_quantity INTEGER DEFAULT 1;

-- Add location column (shelf location for physical books)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add description column (book summary/description)
ALTER TABLE books 
ADD COLUMN IF NOT EXISTS description TEXT;
