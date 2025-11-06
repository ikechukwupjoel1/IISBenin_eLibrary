-- Verify Feature Flags for All Institutions

-- Check all institutions and their feature flags
SELECT 
  id,
  name,
  feature_flags,
  created_at
FROM institutions
ORDER BY created_at DESC;

-- If you need to enable features for a specific institution by ID:
-- UPDATE institutions
-- SET feature_flags = jsonb_build_object(
--   'messages', true,
--   'bookclubs', true,
--   'leaderboard', true,
--   'challenges', true,
--   'reviews', true,
--   'reservations', true
-- )
-- WHERE id = 'YOUR_INSTITUTION_ID_HERE';
