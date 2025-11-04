-- Check IIS Benin institution feature flags
SELECT 
  name,
  is_active,
  feature_flags,
  theme_settings
FROM institutions 
WHERE name ILIKE '%benin%' OR name ILIKE '%IIS%';

-- Enable ALL feature flags for IIS Benin
UPDATE institutions
SET feature_flags = jsonb_build_object(
  'messages', true,
  'bookclubs', true,
  'leaderboard', true,
  'challenges', true,
  'reviews', true,
  'reservations', true
)
WHERE name ILIKE '%benin%' OR name ILIKE '%IIS%';

-- Verify the update
SELECT 
  name,
  feature_flags
FROM institutions 
WHERE name ILIKE '%benin%' OR name ILIKE '%IIS%';

DO $$
BEGIN
  RAISE NOTICE '✅ All features enabled for IIS Benin institution!';
END $$;
