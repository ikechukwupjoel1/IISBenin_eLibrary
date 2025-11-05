

import { useState, lazy, Suspense, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { StaffManagement } from './StaffManagement';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import { LibrarySettings } from './LibrarySettings';
import { BorrowingSystem } from './BorrowingSystem';

// Lazy load components that are not immediately needed
const Leaderboard = lazy(() => import('./Leaderboard').then(m => ({ default: m.Leaderboard })));
const Reviews = lazy(() => import('./Reviews').then(m => ({ default: m.Reviews })));
const Challenges = lazy(() => import('./Challenges'));
const BookClubs = lazy(() => import('./BookClubs'));
const DigitalLibrary = lazy(() => import('./DigitalLibrary').then(m => ({ default: m.DigitalLibrary })));
const Reservations = lazy(() => import('./Reservations').then(m => ({ default: m.Reservations })));
const ChatMessaging = lazy(() => import('./ChatMessaging').then(m => ({ default: m.ChatMessaging })));

// Additional feature components (lazy-loaded)
const BookReportReview = lazy(() => import('./BookReportReview').then(m => ({ default: m.BookReportReview })));
const ReadingChallenge = lazy(() => import('./ReadingChallenge').then(m => ({ default: m.ReadingChallenge })));
const MyBooks = lazy(() => import('./MyBooks').then(m => ({ default: m.MyBooks })));
const Announcements = lazy(() => import('./Announcements').then(m => ({ default: m.Announcements })));
const WaitingList = lazy(() => import('./WaitingList'));

// Loading component for lazy-loaded routes
const LoadingFallback = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

function MainApp() {
  const { profile, institution, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpenDropdown(null);
    }
  };
  
  // Wait for profile to load to prevent flash of wrong dashboard
  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  // Dynamic tab logic: role and feature-flag filtering with grouped menus
  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', roles: ['librarian', 'staff', 'student', 'super_admin'] },
    
    // Library group
    { id: 'books', label: 'Books', roles: ['librarian', 'staff'], group: 'library' },
    { id: 'borrowing', label: 'Borrowing', roles: ['librarian', 'staff', 'student'], group: 'library' },
    { id: 'myBooks', label: 'My Books', roles: ['student', 'staff'], group: 'library' },
    { id: 'digitalLibrary', label: 'Digital Library', roles: ['librarian', 'staff', 'student'], group: 'library' },
    { id: 'waiting', label: 'Waiting List', roles: ['student', 'staff'], group: 'library' },
    { id: 'reservations', label: 'Reservations', roles: ['librarian', 'staff', 'student'], featureFlag: 'reservations', group: 'library' },
    
    // Management (librarian only)
    { id: 'students', label: 'Students', roles: ['librarian'] },
    { id: 'staff', label: 'Staff', roles: ['librarian'] },
    
    // Communication
    { id: 'messaging', label: 'Messaging', roles: ['librarian', 'staff'], featureFlag: 'messages' },
    { id: 'announcements', label: 'Announcements', roles: ['librarian', 'staff', 'student'] },
    
    // Community group
    { id: 'leaderboard', label: 'Leaderboard', roles: ['librarian', 'staff', 'student'], featureFlag: 'leaderboard', group: 'community' },
    { id: 'bookClubs', label: 'Book Clubs', roles: ['librarian', 'staff', 'student'], featureFlag: 'bookclubs', group: 'community' },
    { id: 'challenges', label: 'Challenges', roles: ['librarian', 'staff', 'student'], featureFlag: 'challenges', group: 'community' },
    { id: 'readingChallenge', label: 'Reading Challenge', roles: ['librarian', 'staff', 'student'], featureFlag: 'challenges', group: 'community' },
    
    // Reports group
    { id: 'reviews', label: 'Reviews', roles: ['librarian', 'staff', 'student'], featureFlag: 'reviews', group: 'reports' },
    { id: 'bookReportReview', label: 'Review Reports', roles: ['librarian'], group: 'reports' },
    
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
      <nav className="mb-4 sm:mb-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 overflow-hidden" ref={dropdownRef}>
        <div className="flex sm:flex-wrap justify-center gap-1 sm:gap-2 p-2 overflow-x-auto scrollbar-hide">
          {/* Group tabs by category */}
          {tabs.filter(t => !t.group).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleKeyDown}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
          
          {/* Library dropdown */}
          {tabs.some(t => t.group === 'library') && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'library' ? null : 'library')}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                  tabs.filter(t => t.group === 'library').some(t => t.id === activeTab)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>Library</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {openDropdown === 'library' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {tabs.filter(t => t.group === 'library').map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Community dropdown */}
          {tabs.some(t => t.group === 'community') && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'community' ? null : 'community')}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                  tabs.filter(t => t.group === 'community').some(t => t.id === activeTab)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>Community</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {openDropdown === 'community' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {tabs.filter(t => t.group === 'community').map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Reports dropdown */}
          {tabs.some(t => t.group === 'reports') && (
            <div className="relative">
              <button
                onClick={() => setOpenDropdown(openDropdown === 'reports' ? null : 'reports')}
                onKeyDown={handleKeyDown}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                  tabs.filter(t => t.group === 'reports').some(t => t.id === activeTab)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span>Reports</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {openDropdown === 'reports' && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px] z-50">
                  {tabs.filter(t => t.group === 'reports').map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setOpenDropdown(null); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                        activeTab === tab.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 relative z-10">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 overflow-hidden">
          <Suspense fallback={<LoadingFallback />}>
            {activeTab === 'dashboard' && (profile?.role === 'super_admin' ? <SuperAdminDashboard /> : <Dashboard />)}
            {activeTab === 'books' && <BookManagement />}
            {activeTab === 'borrowing' && <BorrowingSystem />}
            {activeTab === 'myBooks' && <MyBooks />}
            {activeTab === 'students' && <StudentManagement />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'messaging' && <ChatMessaging />}
            {activeTab === 'announcements' && <Announcements />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'reviews' && <Reviews />}
            {activeTab === 'bookReportReview' && <BookReportReview />}
            {activeTab === 'challenges' && <Challenges />}
            {activeTab === 'readingChallenge' && <ReadingChallenge />}
            {activeTab === 'bookClubs' && <BookClubs userId={profile?.id || ''} />}
            {activeTab === 'digitalLibrary' && <DigitalLibrary />}
            {activeTab === 'waiting' && <WaitingList />}
            {activeTab === 'reservations' && <Reservations />}
            {activeTab === 'settings' && <LibrarySettings />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default MainApp;

