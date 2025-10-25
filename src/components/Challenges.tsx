import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
      alert('Please fill all fields');
      return;
    }
    // Staff can only create challenges for students
    if (isStaff && newChallenge.target_audience !== 'students') {
      alert('Staff can only create challenges for students.');
      return;
    }
    const { error } = await supabase.from('challenges').insert([
      { ...newChallenge, created_by: profile.id, status: 'active' }
    ]);
    if (!error) {
      setShowCreate(false);
      setNewChallenge({ title: '', description: '', target_audience: 'students', start_date: '', end_date: '' });
      fetchChallenges();
    } else {
      alert('Failed to create challenge');
    }
  };

  const deleteChallenge = async (id: string) => {
    if (!window.confirm('Delete this challenge?')) return;
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (!error) fetchChallenges();
    else alert('Failed to delete');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Challenges</h2>
      {canCreate && (
        <button onClick={() => setShowCreate(v => !v)} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg">{showCreate ? 'Cancel' : 'Create Challenge'}</button>
      )}
      {showCreate && (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <input type="text" placeholder="Title" value={newChallenge.title} onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })} className="mb-2 w-full px-3 py-2 border rounded" />
          <textarea placeholder="Description" value={newChallenge.description} onChange={e => setNewChallenge({ ...newChallenge, description: e.target.value })} className="mb-2 w-full px-3 py-2 border rounded" />
          <select value={newChallenge.target_audience} onChange={e => setNewChallenge({ ...newChallenge, target_audience: e.target.value as any })} className="mb-2 w-full px-3 py-2 border rounded" disabled={isStaff}>
            <option value="students">Students</option>
            {isLibrarian && <option value="staff">Staff</option>}
            {isLibrarian && <option value="all">All</option>}
          </select>
          {isStaff && (
            <div className="text-xs text-gray-500 mb-2">Staff can only create challenges for students.</div>
          )}
          <div className="flex gap-2 mb-2">
            <input type="date" value={newChallenge.start_date} onChange={e => setNewChallenge({ ...newChallenge, start_date: e.target.value })} className="flex-1 px-3 py-2 border rounded" />
            <input type="date" value={newChallenge.end_date} onChange={e => setNewChallenge({ ...newChallenge, end_date: e.target.value })} className="flex-1 px-3 py-2 border rounded" />
          </div>
          <button onClick={createChallenge} className="px-4 py-2 bg-green-600 text-white rounded-lg">Create</button>
        </div>
      )}
      {loading ? <div>Loading...</div> : (
        <ul className="space-y-4">
          {challenges.map(challenge => (
            <li key={challenge.id} className="bg-white p-4 rounded shadow flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-lg">{challenge.title}</h3>
                <p className="text-gray-600 text-sm mb-1">{challenge.description}</p>
                <p className="text-xs text-gray-500">Target: {challenge.target_audience}, {challenge.start_date} to {challenge.end_date}</p>
              </div>
              {canDelete(challenge) && (
                <button onClick={() => deleteChallenge(challenge.id)} className="mt-2 sm:mt-0 px-3 py-1 bg-red-600 text-white rounded">Delete</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
