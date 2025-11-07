import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Trophy, Target, TrendingUp, Award, Flame, Star, Book, Calendar, ChevronRight } from 'lucide-react';

interface UserProgress {
  user_id: string;
  books_read: number;
  current_streak: number;
  longest_streak: number;
  reading_level: string;
  total_pages_read: number;
  achievements: string[];
  weekly_goal: number;
  last_read_date: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  category: 'books' | 'streak' | 'pages' | 'special';
}

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_book', name: 'First Steps', description: 'Read your first book', icon: '📖', requirement: 1, category: 'books' },
  { id: 'bookworm_5', name: 'Bookworm', description: 'Read 5 books', icon: '🐛', requirement: 5, category: 'books' },
  { id: 'scholar_10', name: 'Scholar', description: 'Read 10 books', icon: '🎓', requirement: 10, category: 'books' },
  { id: 'expert_25', name: 'Expert Reader', description: 'Read 25 books', icon: '🏆', requirement: 25, category: 'books' },
  { id: 'master_50', name: 'Master Reader', description: 'Read 50 books', icon: '👑', requirement: 50, category: 'books' },
  { id: 'legend_100', name: 'Legend', description: 'Read 100 books', icon: '⭐', requirement: 100, category: 'books' },
  { id: 'streak_7', name: 'Week Warrior', description: '7-day reading streak', icon: '🔥', requirement: 7, category: 'streak' },
  { id: 'streak_30', name: 'Monthly Master', description: '30-day reading streak', icon: '🌟', requirement: 30, category: 'streak' },
  { id: 'streak_100', name: 'Century Streak', description: '100-day reading streak', icon: '💯', requirement: 100, category: 'streak' },
  { id: 'pages_1000', name: 'Page Turner', description: 'Read 1,000 pages', icon: '📚', requirement: 1000, category: 'pages' },
  { id: 'pages_5000', name: 'Voracious Reader', description: 'Read 5,000 pages', icon: '🌊', requirement: 5000, category: 'pages' },
  { id: 'early_bird', name: 'Early Bird', description: 'Read before 8 AM', icon: '🌅', requirement: 1, category: 'special' },
  { id: 'night_owl', name: 'Night Owl', description: 'Read after 10 PM', icon: '🦉', requirement: 1, category: 'special' },
];

const READING_LEVELS = [
  { name: 'Beginner', minBooks: 0, color: 'bg-gray-500', icon: '🌱' },
  { name: 'Reader', minBooks: 5, color: 'bg-blue-500', icon: '📖' },
  { name: 'Bookworm', minBooks: 15, color: 'bg-green-500', icon: '🐛' },
  { name: 'Scholar', minBooks: 30, color: 'bg-purple-500', icon: '🎓' },
  { name: 'Expert', minBooks: 50, color: 'bg-orange-500', icon: '🏆' },
  { name: 'Master', minBooks: 75, color: 'bg-red-500', icon: '👑' },
  { name: 'Legend', minBooks: 100, color: 'bg-yellow-500', icon: '⭐' },
];

export default function ReadingStreaks({ userId }: { userId: string }) {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [booksThisWeek, setBooksThisWeek] = useState(0);

  useEffect(() => {
    fetchUserProgress();
  }, [userId]);

  const fetchUserProgress = async () => {
    try {
      setLoading(true);

      // Get or create user progress
      let { data: progressData, error: progressError } = await supabase
        .from('user_reading_progress')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (progressError && progressError.code === 'PGRST116') {
        // Create new progress record
        const { data: newProgress, error: createError } = await supabase
          .from('user_reading_progress')
          .insert([{
            user_id: userId,
            books_read: 0,
            current_streak: 0,
            longest_streak: 0,
            reading_level: 'Beginner',
            total_pages_read: 0,
            achievements: [],
            weekly_goal: 3,
            last_read_date: null,
          }])
          .select()
          .single();

        if (createError) throw createError;
        progressData = newProgress;
      } else if (progressError) {
        throw progressError;
      }

      setProgress(progressData);
      setWeeklyGoal(progressData.weekly_goal || 3);

      // Calculate books read this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data: recentBorrows, error: borrowError } = await supabase
        .from('borrows')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'returned')
        .gte('return_date', oneWeekAgo.toISOString());

      if (borrowError) throw borrowError;
      setBooksThisWeek(recentBorrows?.length || 0);

      // Check and update streak
      await updateStreak(progressData);
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = async (currentProgress: UserProgress) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastRead = currentProgress.last_read_date
        ? new Date(currentProgress.last_read_date).toISOString().split('T')[0]
        : null;

      if (!lastRead) return;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      let newStreak = currentProgress.current_streak;

      if (lastRead === yesterday) {
        // Continue streak
        newStreak = currentProgress.current_streak + 1;
      } else if (lastRead !== today && lastRead < yesterdayStr) {
        // Streak broken
        newStreak = 0;
      }

      if (newStreak !== currentProgress.current_streak) {
        const { error } = await supabase
          .from('reading_progress')
          .update({
            current_streak: newStreak,
            longest_streak: Math.max(newStreak, currentProgress.longest_streak),
          })
          .eq('user_id', userId);

        if (!error) {
          setProgress({ ...currentProgress, current_streak: newStreak });
        }
      }
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const updateWeeklyGoal = async () => {
    try {
      const { error } = await supabase
        .from('user_reading_progress')
        .update({ weekly_goal: weeklyGoal })
        .eq('user_id', userId);

      if (error) throw error;

      setShowGoalModal(false);
      if (progress) {
        setProgress({ ...progress, weekly_goal: weeklyGoal });
      }
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal');
    }
  };

  const checkNewAchievements = (booksRead: number, currentStreak: number, pagesRead: number) => {
    if (!progress) return;

    const unlockedAchievements = progress.achievements || [];
    const newUnlocked: Achievement[] = [];

    ACHIEVEMENTS.forEach((achievement) => {
      if (unlockedAchievements.includes(achievement.id)) return;

      let unlocked = false;

      switch (achievement.category) {
        case 'books':
          unlocked = booksRead >= achievement.requirement;
          break;
        case 'streak':
          unlocked = currentStreak >= achievement.requirement;
          break;
        case 'pages':
          unlocked = pagesRead >= achievement.requirement;
          break;
      }

      if (unlocked) {
        newUnlocked.push(achievement);
      }
    });

    if (newUnlocked.length > 0) {
      setNewAchievement(newUnlocked[0]);
      updateAchievements([...unlockedAchievements, ...newUnlocked.map(a => a.id)]);
    }
  };

  const updateAchievements = async (achievements: string[]) => {
    try {
      const { error } = await supabase
        .from('reading_progress')
        .update({ achievements })
        .eq('user_id', userId);

      if (!error && progress) {
        setProgress({ ...progress, achievements });
      }
    } catch (error) {
      console.error('Error updating achievements:', error);
    }
  };

  const getCurrentLevel = () => {
    if (!progress) return READING_LEVELS[0];

    for (let i = READING_LEVELS.length - 1; i >= 0; i--) {
      if (progress.books_read >= READING_LEVELS[i].minBooks) {
        return READING_LEVELS[i];
      }
    }
    return READING_LEVELS[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const currentIndex = READING_LEVELS.findIndex(l => l.name === currentLevel.name);
    return currentIndex < READING_LEVELS.length - 1
      ? READING_LEVELS[currentIndex + 1]
      : null;
  };

  const getLevelProgress = () => {
    if (!progress) return 0;
    const nextLevel = getNextLevel();
    if (!nextLevel) return 100;

    const currentLevel = getCurrentLevel();
    const booksInLevel = progress.books_read - currentLevel.minBooks;
    const booksNeeded = nextLevel.minBooks - currentLevel.minBooks;
    return (booksInLevel / booksNeeded) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load reading progress</p>
      </div>
    );
  }

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const weeklyProgress = (booksThisWeek / progress.weekly_goal) * 100;

  return (
    <div className="space-y-6">
      {/* Achievement Unlock Notification */}
      {newAchievement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center transform animate-scaleIn">
            <div className="text-6xl mb-4">{newAchievement.icon}</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Achievement Unlocked!</h3>
            <p className="text-xl font-semibold text-blue-600 mb-2">{newAchievement.name}</p>
            <p className="text-gray-600 mb-6">{newAchievement.description}</p>
            <button
              onClick={() => setNewAchievement(null)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Your Reading Journey</h2>
            <p className="text-blue-100">Track your progress and earn achievements</p>
          </div>
          <Trophy className="w-16 h-16 opacity-80" />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Book className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-bold text-gray-900">{progress.books_read}</span>
          </div>
          <p className="text-sm text-gray-600">Books Read</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Flame className="w-8 h-8 text-orange-500" />
            <span className="text-3xl font-bold text-gray-900">{progress.current_streak}</span>
          </div>
          <p className="text-sm text-gray-600">Current Streak (days)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold text-gray-900">{progress.longest_streak}</span>
          </div>
          <p className="text-sm text-gray-600">Longest Streak</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <Star className="w-8 h-8 text-yellow-500" />
            <span className="text-3xl font-bold text-gray-900">{progress.achievements?.length || 0}</span>
          </div>
          <p className="text-sm text-gray-600">Achievements</p>
        </div>
      </div>

      {/* Reading Level */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Reading Level</h3>
          <span className={`${currentLevel.color} text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2`}>
            <span>{currentLevel.icon}</span>
            {currentLevel.name}
          </span>
        </div>

        {nextLevel && (
          <>
            <div className="mb-2">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Progress to {nextLevel.name}</span>
                <span>{progress.books_read} / {nextLevel.minBooks} books</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`${currentLevel.color} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(getLevelProgress(), 100)}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              {nextLevel.minBooks - progress.books_read} more books to reach {nextLevel.name} {nextLevel.icon}
            </p>
          </>
        )}

        {!nextLevel && (
          <div className="text-center py-4">
            <p className="text-lg font-semibold text-yellow-600">🎉 Maximum Level Reached! 🎉</p>
            <p className="text-sm text-gray-600 mt-2">You've mastered reading. Keep up the amazing work!</p>
          </div>
        )}
      </div>

      {/* Weekly Goal */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Weekly Goal</h3>
          </div>
          <button
            onClick={() => setShowGoalModal(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Edit Goal
          </button>
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Books this week</span>
            <span>{booksThisWeek} / {progress.weekly_goal}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                weeklyProgress >= 100 ? 'bg-green-500' : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(weeklyProgress, 100)}%` }}
            />
          </div>
        </div>

        {weeklyProgress >= 100 ? (
          <div className="flex items-center gap-2 text-green-600 font-semibold mt-3">
            <Award className="w-5 h-5" />
            <span>Goal completed! Great job! 🎉</span>
          </div>
        ) : (
          <p className="text-sm text-gray-600 mt-2">
            {progress.weekly_goal - booksThisWeek} more books to reach your goal
          </p>
        )}
      </div>

      {/* Achievements */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-6 h-6 text-yellow-500" />
          Achievements
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ACHIEVEMENTS.map((achievement) => {
            const unlocked = progress.achievements?.includes(achievement.id);
            return (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  unlocked
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 bg-gray-50 opacity-50'
                }`}
              >
                <div className="text-4xl text-center mb-2">{achievement.icon}</div>
                <p className="text-sm font-semibold text-gray-900 text-center mb-1">
                  {achievement.name}
                </p>
                <p className="text-xs text-gray-600 text-center">{achievement.description}</p>
                {unlocked && (
                  <div className="mt-2 text-center">
                    <span className="inline-flex items-center gap-1 text-xs text-yellow-600 font-semibold">
                      <Award className="w-3 h-3" /> Unlocked
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal Setting Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Set Weekly Goal</h3>
            <p className="text-gray-600 mb-4">
              How many books do you want to read per week?
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Books per week: {weeklyGoal}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={weeklyGoal}
                  onChange={(e) => setWeeklyGoal(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>1 book</span>
                  <span>10 books</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGoalModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={updateWeeklyGoal}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
