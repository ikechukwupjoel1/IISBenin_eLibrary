-- ============================================
-- FIX BOOKS TABLE - PART 3: ADD CONSTRAINTS & INDEXES
-- ============================================
-- Run this AFTER Part 2 completes successfully
-- ============================================

-- Add constraint to ensure available_quantity never exceeds quantity
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_available_quantity'
  ) THEN
    ALTER TABLE books 
    ADD CONSTRAINT check_available_quantity 
    CHECK (available_quantity >= 0 AND available_quantity <= quantity);
  END IF;
END $$;

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_books_quantity ON books(quantity);
CREATE INDEX IF NOT EXISTS idx_books_available_quantity ON books(available_quantity);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_material_type ON books(material_type);
CREATE INDEX IF NOT EXISTS idx_books_category ON books(category);
