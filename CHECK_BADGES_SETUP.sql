-- Check Badges System Setup

-- 1. Check if badges table exists and has data
SELECT COUNT(*) as total_badges FROM badges;

-- 2. View all available badges
SELECT 
  name,
  description,
  icon,
  requirement_type,
  requirement_value,
  tier
FROM badges
ORDER BY tier, requirement_value;

-- 3. Check if any users have earned badges
SELECT COUNT(*) as users_with_badges FROM user_badges;

-- 4. See which users have badges (if any)
SELECT 
  up.full_name,
  up.email,
  b.name as badge_name,
  b.icon,
  b.tier,
  ub.earned_at
FROM user_badges ub
JOIN user_profiles up ON ub.user_id = up.id
JOIN badges b ON ub.badge_id = b.id
ORDER BY ub.earned_at DESC
LIMIT 10;

-- 5. Check your institution's feature flags
SELECT 
  name,
  feature_flags->'leaderboard' as leaderboard_enabled,
  feature_flags->'challenges' as challenges_enabled,
  feature_flags
FROM institutions
WHERE name ILIKE '%benin%' OR name ILIKE '%english%';

-- 6. Check if you have approved book reports (needed to earn badges)
SELECT 
  up.full_name,
  COUNT(*) as approved_reports,
  SUM(br.points_awarded) as total_points
FROM book_reports br
JOIN user_profiles up ON br.user_id = up.id
WHERE br.status = 'approved'
GROUP BY up.id, up.full_name
ORDER BY total_points DESC
LIMIT 10;
