-- Check ALL institutions and their feature flags
SELECT 
  id,
  name,
  is_active,
  feature_flags,
  created_at
FROM institutions 
ORDER BY created_at;

-- Enable ALL features for ALL institutions
UPDATE institutions
SET feature_flags = jsonb_build_object(
  'messages', true,
  'bookclubs', true,
  'leaderboard', true,
  'challenges', true,
  'reviews', true,
  'reservations', true
);

-- Verify all institutions now have features enabled
SELECT 
  name,
  is_active,
  feature_flags
FROM institutions 
ORDER BY name;

DO $$
BEGIN
  RAISE NOTICE '✅ All features enabled for ALL institutions!';
  RAISE NOTICE 'Oak International School, IIS Benin, and all others now have full access';
END $$;
