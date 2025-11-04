

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { StaffManagement } from './StaffManagement';
import { Leaderboard } from './Leaderboard';
import { Reviews } from './Reviews';
import Challenges from './Challenges';
import BookClubs from './BookClubs';
import { DigitalLibrary } from './DigitalLibrary';
import { Reservations } from './Reservations';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { ChatMessaging } from './ChatMessaging';

function MainApp() {
  const { profile, institution, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Wait for profile to load to prevent flash of wrong dashboard
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  // Dynamic tab logic: role and feature-flag filtering
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', roles: ['librarian', 'staff', 'student', 'super_admin'] },
    { id: 'books', label: 'Books', roles: ['librarian', 'staff'] },
    { id: 'students', label: 'Students', roles: ['librarian'] },
    { id: 'staff', label: 'Staff', roles: ['librarian'] },
    { id: 'messaging', label: 'Chat / Messaging', roles: ['librarian', 'staff', 'student'], featureFlag: 'messages' },
    { id: 'leaderboard', label: 'Leaderboard', roles: ['librarian', 'staff', 'student'], featureFlag: 'leaderboard' },
    { id: 'reviews', label: 'Reviews', roles: ['librarian', 'staff', 'student'], featureFlag: 'reviews' },
    { id: 'challenges', label: 'Challenges', roles: ['librarian', 'staff', 'student'], featureFlag: 'challenges' },
    { id: 'bookClubs', label: 'Book Clubs', roles: ['librarian', 'staff', 'student'], featureFlag: 'bookclubs' },
    { id: 'digitalLibrary', label: 'Digital Library', roles: ['librarian', 'staff', 'student'] },
    { id: 'reservations', label: 'Reservations', roles: ['librarian', 'staff', 'student'], featureFlag: 'reservations' },
    { id: 'settings', label: 'Settings', roles: ['librarian'] },
  ];
  const tabs = allTabs.filter(tab => {
    if (!profile?.role || !tab.roles.includes(profile.role)) return false;
    // Super admin bypasses feature flags when impersonating
    if (profile.role === 'super_admin') return true;
    if (tab.featureFlag) {
      return institution?.feature_flags?.[tab.featureFlag] === true;
    }
    return true;
  });
  return (
    <div className="min-h-screen bg-gray-50 relative overflow-x-hidden">
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <img
                src={institution?.theme_settings?.logo_url || '/logo192.png'}
                alt={institution?.name || 'Logo'}
                className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 object-contain"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 truncate">
                  {institution?.name || 'eLibrary'}
                </h1>
                {profile && (
                  <p className="text-xs sm:text-sm text-gray-600 truncate">
                    {profile.full_name} ({profile.role})
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] flex-shrink-0"
            >
              <span className="hidden sm:inline text-sm">Sign Out</span>
              <span className="sm:hidden text-xs">Out</span>
            </button>
          </div>
        </div>
      </header>
      <nav className="mb-4 sm:mb-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex sm:flex-wrap gap-1 sm:gap-2 p-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 overflow-hidden">
          {activeTab === 'dashboard' && (profile?.role === 'super_admin' ? <SuperAdminDashboard /> : <Dashboard />)}
          {activeTab === 'books' && <BookManagement />}
          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'messaging' && <ChatMessaging />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'reviews' && <Reviews />}
          {activeTab === 'challenges' && <Challenges />}
          {activeTab === 'bookClubs' && <BookClubs userId={profile?.id || ''} />}
          {activeTab === 'digitalLibrary' && <DigitalLibrary />}
          {activeTab === 'reservations' && <Reservations />}
        </div>
      </main>
    </div>
  );
}

export default MainApp;

