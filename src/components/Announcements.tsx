import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Megaphone, Trash2, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [targetAudience, setTargetAudience] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);

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
      .order('created_at', { ascending: false })
      .limit(2);

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

  const handleDeleteAnnouncement = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    } else {
      fetchAnnouncements();
      toast.success('Announcement deleted');
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (!profile?.institution_id) {
      toast.error('Institution not found');
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('announcements')
        .insert({
          message: newMessage.trim(),
          created_by: profile.id,
          institution_id: profile.institution_id,
          target_audience: targetAudience
        });

      if (error) throw error;

      toast.success('Announcement created!');
      setNewMessage('');
      setTargetAudience('all');
      setShowCreateForm(false);
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      toast.error(`Failed to create announcement: ${(error as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canCreate = profile?.role === 'librarian' || profile?.role === 'super_admin';

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg font-bold text-gray-900">Announcements</h3>
        </div>
        {canCreate && !showCreateForm && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            New
          </button>
        )}
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateAnnouncement} className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900">Create Announcement</h4>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewMessage('');
                setTargetAudience('all');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Enter announcement message..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Audience
              </label>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">Everyone</option>
                <option value="staff">Staff Only</option>
                <option value="students">Students Only</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewMessage('');
                  setTargetAudience('all');
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading announcements...</p>
      ) : announcements.length === 0 ? (
        <p className="text-gray-500 text-center py-4">No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-800">{announcement.message}</p>
              <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                <span>
                  - {announcement.created_by?.full_name || 'System'} | {new Date(announcement.created_at).toLocaleString()}
                </span>
                {(profile?.role === 'librarian' || profile?.role === 'super_admin' || profile?.id === announcement.created_by?.id) && (
                  <button onClick={() => handleDeleteAnnouncement(announcement.id)} className="hover:text-red-600 transition-colors">
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
