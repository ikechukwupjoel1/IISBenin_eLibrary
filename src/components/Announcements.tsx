import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Trash2 } from 'lucide-react';

type Announcement = {
  id: string;
  created_at: string;
  message: string;
  created_by: {
    id: string;
    full_name: string;
  };
  target_audience: string;
};

export function Announcements() {
  const { profile } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('announcements')
      .select(`
        id,
        created_at,
        message,
        created_by:user_profiles (
          id,
          full_name
        ),
        target_audience
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
    } else {
      setAnnouncements(data as Announcement[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile) return;

    const { error } = await supabase
      .from('announcements')
      .insert({
        message: newMessage,
        created_by: profile.id,
        target_audience: targetAudience,
      });

    if (error) {
      console.error('Error posting announcement:', error);
    } else {
      setNewMessage('');
      fetchAnnouncements();
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
    } else {
      fetchAnnouncements();
    }
  };

  const canPostAnnouncement = profile?.role === 'librarian' || profile?.role === 'staff';

  const getAudienceOptions = () => {
    if (profile?.role === 'librarian') {
      return ['all', 'staff', 'students'];
    }
    if (profile?.role === 'staff') {
      const grades = Array.from({ length: 12 }, (_, i) => `grade_${i + 1}`);
      return ['students', ...grades];
    }
    return [];
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Megaphone className="h-6 w-6 text-indigo-600" />
        <h3 className="text-lg font-bold text-gray-900">Announcements</h3>
      </div>

      {canPostAnnouncement && (
        <form onSubmit={handlePostAnnouncement} className="mb-6">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your announcement..."
            className="w-full p-2 border rounded-md"
            rows={3}
          />
          <div className="flex items-center justify-between mt-2">
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="p-2 border rounded-md"
            >
              {getAudienceOptions().map(option => (
                <option key={option} value={option}>
                  {option.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">
              Post
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p>No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800">{announcement.message}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>
                  - {announcement.created_by?.full_name || 'System'} | {new Date(announcement.created_at).toLocaleString()}
                </span>
                {profile?.id === announcement.created_by?.id && (
                  <button onClick={() => handleDeleteAnnouncement(announcement.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
