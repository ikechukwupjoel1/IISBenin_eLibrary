import { useState, useEffect } from 'react';
import { Target, Trophy, Calendar, Users, Plus, Trash2, Zap, Award, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface Challenge {
  id: string;
  title: string;
  description: string;
  created_by: string;
  target_audience: 'students' | 'staff' | 'all';
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export default function Challenges() {
  const { profile } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    target_audience: 'students',
    start_date: '',
    end_date: '',
  });

  const isLibrarian = profile?.role === 'librarian';
  const isStaff = profile?.role === 'staff';

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (!error) setChallenges(data || []);
    setLoading(false);
  };

  const canCreate = isLibrarian || isStaff;
  const canDelete = (challenge: Challenge) => isLibrarian || (isStaff && challenge.created_by === profile?.id);

  const createChallenge = async () => {
    if (!newChallenge.title.trim() || !newChallenge.description.trim() || !newChallenge.start_date || !newChallenge.end_date) {
      toast.error('Please fill all fields');
      return;
    }
    // Staff can only create challenges for students
    if (isStaff && newChallenge.target_audience !== 'students') {
      toast.error('Staff can only create challenges for students.');
      return;
    }
    if (!profile?.id) return;
    
    const { error } = await supabase.from('challenges').insert([
      { ...newChallenge, created_by: profile.id, status: 'active' }
    ]);
    if (!error) {
      setShowCreate(false);
      setNewChallenge({ title: '', description: '', target_audience: 'students', start_date: '', end_date: '' });
      fetchChallenges();
      toast.success('Challenge created successfully!');
    } else {
      toast.error('Failed to create challenge');
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!window.confirm('Delete this challenge? This action cannot be undone.')) return;
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (!error) {
      fetchChallenges();
      toast.success('Challenge deleted successfully');
    } else {
      toast.error('Failed to delete challenge');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
            <Trophy className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Reading Challenges</h2>
            <p className="text-sm text-gray-600">Compete, achieve, and grow together</p>
          </div>
        </div>
        {canCreate && (
          <button 
            onClick={() => setShowCreate(v => !v)} 
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95"
          >
            <Plus className="h-5 w-5" />
            {showCreate ? 'Cancel' : 'Create Challenge'}
          </button>
        )}
      </div>
      {/* Create Challenge Form */}
      {showCreate && (
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Create New Challenge
          </h3>
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="Challenge Title (e.g., Read 5 Books This Month)" 
              value={newChallenge.title} 
              onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <textarea 
              placeholder="Challenge Description & Rules" 
              value={newChallenge.description} 
              onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })} 
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24 resize-none"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Target Audience</label>
              <select 
                value={newChallenge.target_audience} 
                onChange={e => setNewChallenge({ ...newChallenge, target_audience: e.target.value as 'students' | 'staff' | 'all' })} 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent" 
                disabled={isStaff}
              >
                <option value="students">📚 Students Only</option>
                {isLibrarian && <option value="staff">👨‍🏫 Staff Only</option>}
                {isLibrarian && <option value="all">🌟 Everyone</option>}
              </select>
              {isStaff && (
                <p className="text-xs text-gray-500 mt-2">📌 Staff can only create challenges for students</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input 
                  type="date" 
                  value={newChallenge.start_date} 
                  onChange={e => setNewChallenge({ ...newChallenge, start_date: e.target.value })} 
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input 
                  type="date" 
                  value={newChallenge.end_date} 
                  onChange={e => setNewChallenge({ ...newChallenge, end_date: e.target.value })} 
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            <button 
              onClick={createChallenge} 
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 shadow-md hover:shadow-lg font-semibold"
            >
              <Zap className="h-5 w-5" />
              Launch Challenge
            </button>
          </div>
        </div>
      )}
      {/* Challenges List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : challenges.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <Award className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Challenges Yet</h3>
          <p className="text-gray-500">
            {canCreate ? 'Create the first challenge to motivate your community!' : 'Check back soon for exciting challenges!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge, index) => {
            const gradients = [
              'from-blue-500 to-cyan-500',
              'from-purple-500 to-pink-500',
              'from-orange-500 to-red-500',
              'from-green-500 to-emerald-500',
              'from-indigo-500 to-purple-500',
              'from-yellow-500 to-orange-500'
            ];
            const gradient = gradients[index % gradients.length];
            
            const isActive = challenge.status === 'active';
            const daysLeft = Math.ceil((new Date(challenge.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            
            return (
              <div 
                key={challenge.id} 
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:scale-105"
              >
                {/* Card Header with Gradient */}
                <div className={`bg-gradient-to-r ${gradient} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-3">
                    <Trophy className="h-8 w-8" />
                    {canDelete(challenge) && (
                      <button 
                        onClick={() => deleteChallenge(challenge.id)} 
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-bold text-xl mb-2">{challenge.title}</h3>
                  <div className="flex items-center gap-2 text-sm opacity-90">
                    <Users className="h-4 w-4" />
                    <span className="capitalize">{challenge.target_audience}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  <p className="text-gray-600 mb-4 line-clamp-3">{challenge.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4 text-purple-600" />
                      <span>{new Date(challenge.start_date).toLocaleDateString()}</span>
                      <span>→</span>
                      <span>{new Date(challenge.end_date).toLocaleDateString()}</span>
                    </div>
                    
                    {isActive && daysLeft > 0 && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-sm font-semibold text-orange-600">
                          {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-3 border-t border-gray-200">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        <TrendingUp className="h-3 w-3" />
                        {isActive ? 'Active' : 'Completed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
