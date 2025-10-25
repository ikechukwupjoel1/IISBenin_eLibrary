import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Users, MessageCircle, BookOpen, Plus, Search, UserPlus, Send, Heart, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

interface BookClub {
  id: string;
  name: string;
  description: string;
  category: string;
  created_by: string;
  created_at: string;
  member_count: number;
  is_private: boolean;
  current_book_id?: string;
  current_book_title?: string;
}

interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
  user_name: string;
}

interface Discussion {
  id: string;
  club_id: string;
  user_id: string;
  user_name: string;
  message: string;
  created_at: string;
  likes: number;
  liked_by_user: boolean;
}

interface ReadingListItem {
  id: string;
  club_id: string;
  book_id: string;
  book_title: string;
  book_author: string;
  added_by: string;
  added_at: string;
  status: 'upcoming' | 'current' | 'completed';
}

export default function BookClubs({ userId }: { userId: string; userName?: string }) {
  const { profile } = useAuth();
  const [view, setView] = useState<'browse' | 'myClubs' | 'clubDetail'>('browse');
  const [clubs, setClubs] = useState<BookClub[]>([]);
  const [myClubs, setMyClubs] = useState<BookClub[]>([]);
  const [selectedClub, setSelectedClub] = useState<BookClub | null>(null);
  const [clubMembers, setClubMembers] = useState<ClubMember[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [readingList, setReadingList] = useState<ReadingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Check if user can create clubs (staff or librarian only)
  const canCreateClub = profile?.role === 'staff' || profile?.role === 'librarian';
  // Librarian can delete any club; staff can delete clubs they created
  const isLibrarian = profile?.role === 'librarian';
  const isStaff = profile?.role === 'staff';
  const isClubCreator = selectedClub && selectedClub.created_by === userId;
  const canDeleteClub = isLibrarian || (isStaff && isClubCreator);
  // Delete club logic
  const deleteClub = async (clubId: string) => {
    if (!canDeleteClub) return;
    if (!window.confirm('Are you sure you want to delete this club? This action cannot be undone.')) return;
    try {
      const { error } = await supabase
        .from('book_clubs')
        .delete()
        .eq('id', clubId);
      if (error) throw error;
      setSelectedClub(null);
      fetchClubs();
      fetchMyClubs();
      alert('Book club deleted successfully.');
    } catch (error) {
      console.error('Error deleting club:', error);
      alert('Failed to delete club.');
    }
  };

  // Create Club Form
  const [newClub, setNewClub] = useState({
    name: '',
    description: '',
    category: 'General',
    is_private: false,
  });

  const CATEGORIES = ['General', 'Fiction', 'Non-Fiction', 'Science', 'History', 'Technology', 'Arts', 'Business'];

  useEffect(() => {
    fetchClubs();
    fetchMyClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (selectedClub) {
      fetchClubDetails(selectedClub.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClub]);

  const fetchClubs = async () => {
    try {
      setLoading(true);

      const { data: clubsData, error: clubsError } = await supabase
        .from('book_clubs')
        .select(`
          *,
          book_club_members(count)
        `)
        .eq('is_private', false)
        .order('created_at', { ascending: false });

      if (clubsError) throw clubsError;

      const formattedClubs = clubsData?.map(club => ({
        ...club,
        member_count: club.book_club_members?.[0]?.count || 0,
      })) || [];

      setClubs(formattedClubs);
    } catch (error) {
      console.error('Error fetching clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyClubs = async () => {
    try {
      const { data: memberData, error: memberError } = await supabase
        .from('book_club_members')
        .select(`
          club_id,
          book_clubs(*)
        `)
        .eq('user_id', userId);

      if (memberError) throw memberError;

      const myClubsData = memberData?.map(m => m.book_clubs).filter(Boolean) || [];
      
      // Get member counts for each club
      const clubsWithCounts = await Promise.all(
        myClubsData.map(async (club: BookClub) => {
          const { count } = await supabase
            .from('book_club_members')
            .select('*', { count: 'exact', head: true })
            .eq('club_id', club.id);
          
          return { ...club, member_count: count || 0 };
        })
      );

      setMyClubs(clubsWithCounts);
    } catch (error) {
      console.error('Error fetching my clubs:', error);
    }
  };

  const fetchClubDetails = async (clubId: string) => {
    try {
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('book_club_members')
        .select(`
          *,
          user_profiles(full_name)
        `)
        .eq('club_id', clubId);

      if (membersError) throw membersError;

      const formattedMembers = membersData?.map(m => ({
        ...m,
        user_name: m.user_profiles?.full_name || 'Unknown User',
      })) || [];

      setClubMembers(formattedMembers);

      // Fetch discussions
      const { data: discussionsData, error: discussionsError } = await supabase
        .from('club_discussions')
        .select(`
          *,
          user_profiles(full_name),
          discussion_likes(user_id)
        `)
        .eq('club_id', clubId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (discussionsError) throw discussionsError;

      const formattedDiscussions = discussionsData?.map(d => ({
        ...d,
        user_name: d.user_profiles?.full_name || 'Unknown User',
        likes: d.discussion_likes?.length || 0,
        liked_by_user: d.discussion_likes?.some((l: { user_id: string }) => l.user_id === userId) || false,
      })) || [];

      setDiscussions(formattedDiscussions);

      // Fetch reading list
      const { data: readingListData, error: readingListError } = await supabase
        .from('club_reading_list')
        .select(`
          *,
          books(title, author)
        `)
        .eq('club_id', clubId)
        .order('added_at', { ascending: false });

      if (readingListError) throw readingListError;

      const formattedReadingList = readingListData?.map(item => ({
        ...item,
        book_title: item.books?.title || 'Unknown Book',
        book_author: item.books?.author || 'Unknown Author',
      })) || [];

      setReadingList(formattedReadingList);
    } catch (error) {
      console.error('Error fetching club details:', error);
    }
  };

  const createClub = async () => {
    // Only staff and librarians can create clubs
    if (!canCreateClub) {
      alert('Only staff and librarians can create book clubs');
      return;
    }

    if (!newClub.name.trim() || !newClub.description.trim()) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const { data: clubData, error: clubError } = await supabase
        .from('book_clubs')
        .insert([{
          name: newClub.name,
          description: newClub.description,
          category: newClub.category,
          is_private: newClub.is_private,
          created_by: userId,
        }])
        .select()
        .single();

      if (clubError) throw clubError;

      // Add creator as admin
      const { error: memberError } = await supabase
        .from('book_club_members')
        .insert([{
          club_id: clubData.id,
          user_id: userId,
          role: 'admin',
        }]);

      if (memberError) throw memberError;

      setShowCreateModal(false);
      setNewClub({ name: '', description: '', category: 'General', is_private: false });
      fetchClubs();
      fetchMyClubs();
      alert('Book club created successfully!');
    } catch (error) {
      console.error('Error creating club:', error);
      alert('Failed to create club');
    }
  };

  const joinClub = async (clubId: string) => {
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('book_club_members')
        .select('id')
        .eq('club_id', clubId)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        alert('You are already a member of this club');
        return;
      }

      const { error } = await supabase
        .from('book_club_members')
        .insert([{
          club_id: clubId,
          user_id: userId,
          role: 'member',
        }]);

      if (error) throw error;

      fetchClubs();
      fetchMyClubs();
      alert('Successfully joined the club!');
    } catch (error) {
      console.error('Error joining club:', error);
      alert('Failed to join club');
    }
  };

  const leaveClub = async (clubId: string) => {
    if (!confirm('Are you sure you want to leave this club?')) return;

    try {
      const { error } = await supabase
        .from('book_club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', userId);

      if (error) throw error;

      setView('myClubs');
      setSelectedClub(null);
      fetchClubs();
      fetchMyClubs();
      alert('Successfully left the club');
    } catch (error) {
      console.error('Error leaving club:', error);
      alert('Failed to leave club');
    }
  };

  const postMessage = async () => {
    if (!newMessage.trim() || !selectedClub) return;

    try {
      const { error } = await supabase
        .from('club_discussions')
        .insert([{
          club_id: selectedClub.id,
          user_id: userId,
          message: newMessage,
        }]);

      if (error) throw error;

      setNewMessage('');
      fetchClubDetails(selectedClub.id);
    } catch (error) {
      console.error('Error posting message:', error);
      alert('Failed to post message');
    }
  };

  const toggleLike = async (discussionId: string, currentlyLiked: boolean) => {
    try {
      if (currentlyLiked) {
        const { error } = await supabase
          .from('discussion_likes')
          .delete()
          .eq('discussion_id', discussionId)
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('discussion_likes')
          .insert([{
            discussion_id: discussionId,
            user_id: userId,
          }]);

        if (error) throw error;
      }

      if (selectedClub) {
        fetchClubDetails(selectedClub.id);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const filteredClubs = clubs.filter(club => {
    const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         club.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || club.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const isMember = selectedClub && clubMembers.some(m => m.user_id === userId);

  if (loading) {
    return <LoadingSkeleton type="cards" title="Book Clubs" subtitle="Join reading groups and connect with fellow readers" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Book Clubs</h2>
            <p className="text-purple-100">Join reading groups and connect with fellow readers</p>
          </div>
          <Users className="w-16 h-16 opacity-80" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setView('browse'); setSelectedClub(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'browse' && !selectedClub
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          Browse Clubs
        </button>
        <button
          onClick={() => { setView('myClubs'); setSelectedClub(null); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === 'myClubs' && !selectedClub
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          My Clubs ({myClubs.length})
        </button>
        {canCreateClub && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Club
          </button>
        )}
      </div>

      {/* Club Detail View */}
      {selectedClub && (
        <div className="bg-white rounded-lg shadow">
          {/* Club Header */}
          <div className="p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <button
                  onClick={() => setSelectedClub(null)}
                  className="text-sm text-gray-600 hover:text-gray-900 mb-2"
                >
                  ← Back
                </button>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{selectedClub.name}</h3>
                <p className="text-gray-600 mb-3">{selectedClub.description}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {selectedClub.category}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {clubMembers.length} members
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {!isMember ? (
                  <button
                    onClick={() => joinClub(selectedClub.id)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Join Club
                  </button>
                ) : (
                  <button
                    onClick={() => leaveClub(selectedClub.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Leave Club
                  </button>
                )}
                {canDeleteClub && (
                  <button
                    onClick={() => deleteClub(selectedClub.id)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-red-600 hover:text-white font-medium"
                  >
                    Delete Club
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
            {/* Discussions */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-purple-600" />
                Discussions
              </h4>

              {isMember && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Share your thoughts with the club..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={postMessage}
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {discussions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No discussions yet. Be the first to start a conversation!</p>
                  </div>
                ) : (
                  discussions.map((discussion) => (
                    <div key={discussion.id} className="bg-white border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{discussion.user_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(discussion.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 mb-3">{discussion.message}</p>
                      <button
                        onClick={() => toggleLike(discussion.id, discussion.liked_by_user)}
                        className={`flex items-center gap-1 text-sm ${
                          discussion.liked_by_user ? 'text-pink-600' : 'text-gray-500 hover:text-pink-600'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${discussion.liked_by_user ? 'fill-current' : ''}`} />
                        {discussion.likes}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Members */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Members ({clubMembers.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clubMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{member.user_name}</span>
                      {member.role === 'admin' && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                          Admin
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Reading List */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                  Reading List
                </h4>
                {readingList.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No books added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {readingList.map((item) => (
                      <div key={item.id} className="border-l-4 border-purple-500 pl-3 py-2">
                        <p className="text-sm font-semibold text-gray-900">{item.book_title}</p>
                        <p className="text-xs text-gray-600">{item.book_author}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                          item.status === 'current' ? 'bg-green-100 text-green-700' :
                          item.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Browse/My Clubs View */}
      {!selectedClub && (
        <>
          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clubs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(view === 'browse' ? filteredClubs : myClubs).map((club) => (
              <div
                key={club.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedClub(club)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">
                      {club.name}
                    </h3>
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                      {club.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {club.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="w-4 h-4" />
                      {club.member_count} members
                    </div>
                    <button className="text-purple-600 hover:text-purple-700 font-medium text-sm flex items-center gap-1">
                      View
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(view === 'browse' ? filteredClubs : myClubs).length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                {view === 'browse' ? 'No clubs found' : 'You haven\'t joined any clubs yet'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Create Club Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Create a Book Club</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Club Name *
                </label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="e.g., Science Fiction Lovers"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={newClub.description}
                  onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Describe what your club is about..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newClub.category}
                  onChange={(e) => setNewClub({ ...newClub, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={newClub.is_private}
                  onChange={(e) => setNewClub({ ...newClub, is_private: e.target.checked })}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="private" className="text-sm text-gray-700">
                  Make this club private (invite only)
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={createClub}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Club
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
