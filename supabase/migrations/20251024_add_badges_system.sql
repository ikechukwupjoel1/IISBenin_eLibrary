-- Migration: Add Reading Badges System
-- Gamification: Award badges based on reading achievements

-- Create badges table (defines available badges)
CREATE TABLE IF NOT EXISTS badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL UNIQUE,
  description text NOT NULL,
  icon text NOT NULL, -- Emoji or icon class
  color text DEFAULT '#3B82F6', -- Badge color
  requirement_type text NOT NULL CHECK (requirement_type IN ('reports_count', 'points_total', 'books_read', 'streak_days')),
  requirement_value integer NOT NULL, -- Threshold to earn badge
  tier integer DEFAULT 1 CHECK (tier >= 1 AND tier <= 5), -- 1=Bronze, 2=Silver, 3=Gold, 4=Platinum, 5=Diamond
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Create user_badges table (track which users have earned which badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  progress_value integer DEFAULT 0, -- Current progress toward next badge
  
  UNIQUE(user_id, badge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_badges_requirement_type ON badges(requirement_type);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at);

-- Enable RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- RLS Policies for badges (everyone can view available badges)
CREATE POLICY "Anyone can view badges"
  ON badges FOR SELECT
  USING (true);

CREATE POLICY "Librarians can manage badges"
  ON badges FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

-- RLS Policies for user_badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Librarians can view all user badges"
  ON user_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('librarian', 'admin')
    )
  );

CREATE POLICY "System can award badges"
  ON user_badges FOR INSERT
  WITH CHECK (true); -- Badges awarded by triggers/functions

-- Insert default badges
INSERT INTO badges (name, description, icon, color, requirement_type, requirement_value, tier) VALUES
  -- Reports-based badges
  ('Bookworm', 'Submitted 5 book reports', '🐛', '#10B981', 'reports_count', 5, 1),
  ('Avid Reader', 'Submitted 20 book reports', '📚', '#3B82F6', 'reports_count', 20, 2),
  ('Literary Scholar', 'Submitted 50 book reports', '🎓', '#8B5CF6', 'reports_count', 50, 3),
  ('Reading Master', 'Submitted 100 book reports', '👑', '#F59E0B', 'reports_count', 100, 4),
  ('Legend of Literature', 'Submitted 200 book reports', '⭐', '#EF4444', 'reports_count', 200, 5),
  
  -- Points-based badges
  ('Point Collector', 'Earned 100 total points', '💎', '#10B981', 'points_total', 100, 1),
  ('Point Master', 'Earned 500 total points', '💰', '#3B82F6', 'points_total', 500, 2),
  ('Point Legend', 'Earned 1000 total points', '🏆', '#8B5CF6', 'points_total', 1000, 3),
  
  -- Quality-based achievement
  ('Quality Reader', 'Average quality score above 80%', '⭐', '#F59E0B', 'reports_count', 10, 2),
  ('Perfect Reports', '5 reports with 100% quality score', '💯', '#EF4444', 'reports_count', 5, 3)
ON CONFLICT (name) DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(
  user_id_param uuid
) RETURNS json AS $$
DECLARE
  report_count integer;
  total_points integer;
  badges_awarded integer := 0;
  badge_record RECORD;
  new_badges json[] := ARRAY[]::json[];
BEGIN
  -- Get user's report count
  SELECT COUNT(*) INTO report_count
  FROM book_reports
  WHERE user_id = user_id_param AND status = 'approved';
  
  -- Get user's total points
  SELECT COALESCE(SUM(points_awarded), 0) INTO total_points
  FROM book_reports
  WHERE user_id = user_id_param AND status = 'approved';
  
  -- Check reports_count badges
  FOR badge_record IN 
    SELECT * FROM badges 
    WHERE requirement_type = 'reports_count' 
    AND requirement_value <= report_count
  LOOP
    -- Try to award badge (will fail silently if already earned due to UNIQUE constraint)
    INSERT INTO user_badges (user_id, badge_id, progress_value)
    VALUES (user_id_param, badge_record.id, report_count)
    ON CONFLICT (user_id, badge_id) DO UPDATE
    SET progress_value = report_count;
    
    IF FOUND THEN
      badges_awarded := badges_awarded + 1;
      new_badges := array_append(new_badges, json_build_object(
        'name', badge_record.name,
        'icon', badge_record.icon,
        'description', badge_record.description
      ));
    END IF;
  END LOOP;
  
  -- Check points_total badges
  FOR badge_record IN 
    SELECT * FROM badges 
    WHERE requirement_type = 'points_total' 
    AND requirement_value <= total_points
  LOOP
    INSERT INTO user_badges (user_id, badge_id, progress_value)
    VALUES (user_id_param, badge_record.id, total_points)
    ON CONFLICT (user_id, badge_id) DO UPDATE
    SET progress_value = total_points;
    
    IF FOUND THEN
      badges_awarded := badges_awarded + 1;
      new_badges := array_append(new_badges, json_build_object(
        'name', badge_record.name,
        'icon', badge_record.icon,
        'description', badge_record.description
      ));
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'badges_awarded', badges_awarded,
    'new_badges', new_badges,
    'total_reports', report_count,
    'total_points', total_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-award badges when reports are approved
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check when report is approved
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    PERFORM check_and_award_badges(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_report_approved
  AFTER INSERT OR UPDATE ON book_reports
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges();

-- Comments
COMMENT ON TABLE badges IS 'Defines available achievement badges for reading accomplishments';
COMMENT ON TABLE user_badges IS 'Tracks which badges each user has earned';
COMMENT ON FUNCTION check_and_award_badges IS 'Checks user achievements and awards appropriate badges';
