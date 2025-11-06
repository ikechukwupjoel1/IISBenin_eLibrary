-- MANUAL BADGE AWARD TEST
-- Run this to manually award the "Bookworm" badge to your account for testing

-- Step 1: Find your user ID
SELECT id, full_name, email, role FROM user_profiles WHERE email = 'YOUR_EMAIL_HERE';

-- Step 2: Get the Bookworm badge ID
SELECT id, name, icon FROM badges WHERE name = 'Bookworm';

-- Step 3: Manually award Bookworm badge (replace YOUR_USER_ID and BADGE_ID)
INSERT INTO user_badges (user_id, badge_id, progress_value)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your user ID from Step 1
  (SELECT id FROM badges WHERE name = 'Bookworm'),
  5  -- Progress value
);

-- Step 4: Verify badge was awarded
SELECT 
  up.full_name,
  b.name as badge_name,
  b.icon,
  b.tier,
  ub.earned_at
FROM user_badges ub
JOIN user_profiles up ON ub.user_id = up.id
JOIN badges b ON ub.badge_id = b.id
WHERE up.email = 'YOUR_EMAIL_HERE';

-- Step 5: Now go to Leaderboard tab and you should see the badge!
