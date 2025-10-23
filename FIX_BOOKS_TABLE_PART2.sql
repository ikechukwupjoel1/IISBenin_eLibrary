-- ============================================
-- FIX BOOKS TABLE - PART 2: UPDATE DATA
-- ============================================
-- Run this AFTER Part 1 completes successfully
-- ============================================

-- Update available_quantity for existing books (set to quantity, or 1 if quantity not set)
UPDATE books 
SET available_quantity = COALESCE(quantity, 1)
WHERE available_quantity IS NULL;

-- Update quantity for existing books where it's null
UPDATE books 
SET quantity = 1
WHERE quantity IS NULL;
