import React, { useEffect, useState } from 'react';
import { Target, Trophy, Calendar, Users, Plus, X, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

type Challenge = {
  id: string;
  title: string;
  description: string;
  target_books: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_by: string;
  participant_count?: number;
  user_progress?: {
    books_read: number;
    completed_at: string | null;
    joined: boolean;
  };
};

export function ReadingChallenge() {
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetBooks, setTargetBooks] = useState(10);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadChallenges();
  }, [profile]);

  const loadChallenges = async () => {
    if (!profile) return;

    const { data: challengesData, error } = await supabase
      .from('reading_challenges')
      .select('*')
      .eq('is_active', true)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Error loading challenges:', error);
      setLoading(false);
      return;
    }

    const challengesWithProgress = await Promise.all(
      (challengesData || []).map(async (challenge) => {
        const { count } = await supabase
          .from('challenge_participants')
          .select('*', { count: 'exact', head: true })
          .eq('challenge_id', challenge.id);

        const { data: userParticipation } = await supabase
          .from('challenge_participants')
          .select('books_read, completed_at')
          .eq('challenge_id', challenge.id)
          .eq('user_id', profile.id)
          .maybeSingle();

        return {
          ...challenge,
          participant_count: count || 0,
          user_progress: userParticipation
            ? {
                books_read: userParticipation.books_read,
                completed_at: userParticipation.completed_at,
                joined: true,
              }
            : { books_read: 0, completed_at: null, joined: false },
        };
      })
    );

    setChallenges(challengesWithProgress);
    setLoading(false);
  };

  const handleCreateChallenge = async () => {
    if (!profile || profile.role !== 'librarian') {
      alert('Only librarians can create challenges');
      return;
    }

    if (!title.trim() || !startDate || !endDate || targetBooks < 1) {
      alert('Please fill in all fields');
      return;
    }

    const { error } = await supabase.from('reading_challenges').insert({
      title,
      description,
      target_books: targetBooks,
      start_date: startDate,
      end_date: endDate,
      created_by: profile.id,
    });

    if (error) {
      alert('Error creating challenge: ' + error.message);
    } else {
      closeModal();
      loadChallenges();
    }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!profile) return;

    const { error } = await supabase.from('challenge_participants').insert({
      challenge_id: challengeId,
      user_id: profile.id,
    });

    if (error) {
      alert('Error joining challenge: ' + error.message);
    } else {
      loadChallenges();
    }
  };

  const handleLeaveChallenge = async (challengeId: string) => {
    if (!profile || !confirm('Are you sure you want to leave this challenge?')) return;

    const { error } = await supabase
      .from('challenge_participants')
      .delete()
      .eq('challenge_id', challengeId)
      .eq('user_id', profile.id);

    if (error) {
      alert('Error leaving challenge: ' + error.message);
    } else {
      loadChallenges();
    }
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setTargetBooks(10);
    setStartDate('');
    setEndDate('');
  };

  const getProgressPercentage = (progress: number, target: number) => {
    return Math.min((progress / target) * 100, 100);
  };

  const isChallengeActive = (startDate: string, endDate: string) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    return now >= start && now <= end;
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-green-100 p-3 rounded-xl">
            <Target className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reading Challenges</h2>
            <p className="text-sm text-gray-600">Join challenges and track your progress</p>
          </div>
        </div>

        {profile?.role === 'librarian' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Challenge
          </button>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Target className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Challenges</h3>
          <p className="text-gray-500">Check back later for new reading challenges</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {challenges.map((challenge) => {
            const isActive = isChallengeActive(challenge.start_date, challenge.end_date);
            const progressPercentage = challenge.user_progress?.joined
              ? getProgressPercentage(
                  challenge.user_progress.books_read,
                  challenge.target_books
                )
              : 0;
            const isCompleted = challenge.user_progress?.completed_at !== null;

            return (
              <div
                key={challenge.id}
                className={`bg-white rounded-xl border-2 p-6 ${
                  isCompleted
                    ? 'border-green-300 bg-green-50/30'
                    : challenge.user_progress?.joined
                    ? 'border-blue-300'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{challenge.title}</h3>
                      {isCompleted && <Trophy className="h-5 w-5 text-yellow-500" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{challenge.description}</p>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target className="h-4 w-4" />
                      <span>Target: {challenge.target_books} books</span>
                    </div>
                    {!isActive && (
                      <span className="text-gray-500 text-xs">
                        {new Date(challenge.start_date) > new Date() ? 'Upcoming' : 'Ended'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(challenge.start_date).toLocaleDateString()} -{' '}
                      {new Date(challenge.end_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{challenge.participant_count} participants</span>
                  </div>
                </div>

                {challenge.user_progress?.joined && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium text-gray-700">Your Progress</span>
                      <span className="font-semibold text-blue-600">
                        {challenge.user_progress.books_read} / {challenge.target_books}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {isActive && (
                  <div>
                    {challenge.user_progress?.joined ? (
                      <button
                        onClick={() => handleLeaveChallenge(challenge.id)}
                        className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-700 px-4 py-2 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Leave Challenge
                      </button>
                    ) : (
                      <button
                        onClick={() => handleJoinChallenge(challenge.id)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Join Challenge
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Create Reading Challenge</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Summer Reading Challenge"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Read as many books as you can this summer!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Books
                </label>
                <input
                  type="number"
                  value={targetBooks}
                  onChange={(e) => setTargetBooks(parseInt(e.target.value) || 0)}
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChallenge}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
