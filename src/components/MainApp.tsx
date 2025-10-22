import { useState, lazy, Suspense } from 'react';
import { BookOpen, Users, BookMarked, LayoutDashboard, LogOut, UserCog, Calendar, Trophy, Star, Target, Shield, Library, Monitor, Settings, TrendingUp, BarChart3, FileText, Flame, MessageCircle, Clock, ThumbsUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import schoolLogo from '../assets/Iisbenin logo.png';
import BackgroundCarousel from './BackgroundCarousel';
import NetworkStatus from './NetworkStatus';

// Lazy load components for better code splitting
const Dashboard = lazy(() => import('./Dashboard').then(m => ({ default: m.Dashboard })));
const BookManagement = lazy(() => import('./BookManagement').then(m => ({ default: m.BookManagement })));
const StudentManagement = lazy(() => import('./StudentManagement').then(m => ({ default: m.StudentManagement })));
const StaffManagement = lazy(() => import('./StaffManagement').then(m => ({ default: m.StaffManagement })));
const LibrarianManagement = lazy(() => import('./LibrarianManagement').then(m => ({ default: m.LibrarianManagement })));
const BorrowingSystem = lazy(() => import('./BorrowingSystem').then(m => ({ default: m.BorrowingSystem })));
const Reservations = lazy(() => import('./Reservations').then(m => ({ default: m.Reservations })));
const Leaderboard = lazy(() => import('./Leaderboard').then(m => ({ default: m.Leaderboard })));
const Reviews = lazy(() => import('./Reviews').then(m => ({ default: m.Reviews })));
const ReadingChallenge = lazy(() => import('./ReadingChallenge').then(m => ({ default: m.ReadingChallenge })));
const ChangePassword = lazy(() => import('./ChangePassword'));
const MyBooks = lazy(() => import('./MyBooks').then(m => ({ default: m.MyBooks })));
const DigitalLibrary = lazy(() => import('./DigitalLibrary').then(m => ({ default: m.DigitalLibrary })));
const LibrarySettings = lazy(() => import('./LibrarySettings').then(m => ({ default: m.LibrarySettings })));
const BookRecommendations = lazy(() => import('./BookRecommendations').then(m => ({ default: m.BookRecommendations })));
const LibrarianAnalytics = lazy(() => import('./LibrarianAnalytics').then(m => ({ default: m.LibrarianAnalytics })));
const ReportsExports = lazy(() => import('./ReportsExports').then(m => ({ default: m.ReportsExports })));
const EnhancedLoginLogs = lazy(() => import('./EnhancedLoginLogs').then(m => ({ default: m.EnhancedLoginLogs })));
const ReadingStreaks = lazy(() => import('./ReadingStreaks'));
const BookClubs = lazy(() => import('./BookClubs'));
const WaitingList = lazy(() => import('./WaitingList'));
const ReviewModeration = lazy(() => import('./ReviewModeration'));

type Tab = 'dashboard' | 'books' | 'mybooks' | 'digital' | 'students' | 'staff' | 'librarians' | 'borrowing' | 'reservations' | 'leaderboard' | 'reviews' | 'challenges' | 'loginlogs' | 'settings' | 'changePassword' | 'recommendations' | 'analytics' | 'reports' | 'securitylogs' | 'streaks' | 'bookclubs' | 'waitinglist' | 'moderation';

export function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { signOut, profile } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, roles: ['librarian', 'staff', 'student'] },
      { id: 'mybooks' as Tab, label: 'My Books', icon: Library, roles: ['student', 'staff'] },
      { id: 'digital' as Tab, label: 'Digital Library', icon: Monitor, roles: ['librarian', 'staff', 'student'] },
      { id: 'books' as Tab, label: 'Books', icon: BookOpen, roles: ['librarian', 'staff'] },
      { id: 'recommendations' as Tab, label: 'Recommended', icon: TrendingUp, roles: ['librarian', 'staff', 'student'] },
      { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3, roles: ['librarian'] },
      { id: 'reports' as Tab, label: 'Reports', icon: FileText, roles: ['librarian'] },
      { id: 'students' as Tab, label: 'Students', icon: Users, roles: ['librarian'] },
      { id: 'staff' as Tab, label: 'Staff', icon: UserCog, roles: ['librarian'] },
      { id: 'librarians' as Tab, label: 'Librarians', icon: Shield, roles: ['librarian'] },
      { id: 'securitylogs' as Tab, label: 'Security Logs', icon: Shield, roles: ['librarian'] },
      { id: 'settings' as Tab, label: 'Settings', icon: Settings, roles: ['librarian'] },
      { id: 'borrowing' as Tab, label: 'Borrowing', icon: BookMarked, roles: ['librarian', 'staff'] },
      { id: 'reservations' as Tab, label: 'Reservations', icon: Calendar, roles: ['librarian', 'staff', 'student'] },
      { id: 'waitinglist' as Tab, label: 'Waiting Lists', icon: Clock, roles: ['librarian', 'staff', 'student'] },
      { id: 'bookclubs' as Tab, label: 'Book Clubs', icon: MessageCircle, roles: ['librarian', 'staff', 'student'] },
      { id: 'leaderboard' as Tab, label: 'Leaderboard', icon: Trophy, roles: ['librarian', 'staff', 'student'] },
      { id: 'streaks' as Tab, label: 'My Progress', icon: Flame, roles: ['student', 'staff'] },
      { id: 'reviews' as Tab, label: 'Reviews', icon: Star, roles: ['librarian', 'staff', 'student'] },
      { id: 'moderation' as Tab, label: 'Review Moderation', icon: ThumbsUp, roles: ['librarian'] },
      { id: 'challenges' as Tab, label: 'Challenges', icon: Target, roles: ['librarian', 'staff', 'student'] },
      { id: 'changePassword' as Tab, label: 'Change Password', icon: UserCog, roles: ['staff', 'student'] },
    ];

    return allTabs.filter(tab => profile?.role && tab.roles.includes(profile.role));
  };

  const tabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50 relative">
      <NetworkStatus />
      <BackgroundCarousel />
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <img
                src={schoolLogo}
                alt="IISBenin Logo"
                className="h-12 w-12 mr-3 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">IISBenin Library Management System</h1>
                {profile && (
                  <p className="text-sm text-gray-600">
                    Welcome, {profile.full_name} ({profile.role})
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <nav className="flex flex-wrap gap-2 mb-6 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-sm border border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-6">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'mybooks' && <MyBooks />}
            {activeTab === 'digital' && <DigitalLibrary />}
            {activeTab === 'books' && <BookManagement />}
            {activeTab === 'recommendations' && <BookRecommendations />}
            {activeTab === 'analytics' && <LibrarianAnalytics />}
            {activeTab === 'reports' && <ReportsExports />}
            {activeTab === 'students' && <StudentManagement />}
            {activeTab === 'staff' && <StaffManagement />}
            {activeTab === 'librarians' && <LibrarianManagement />}
            {activeTab === 'securitylogs' && <EnhancedLoginLogs />}
            {activeTab === 'settings' && <LibrarySettings />}
            {activeTab === 'borrowing' && <BorrowingSystem />}
            {activeTab === 'reservations' && <Reservations />}
            {activeTab === 'waitinglist' && profile && <WaitingList userId={profile.id} userRole={profile.role} />}
            {activeTab === 'bookclubs' && profile && <BookClubs userId={profile.id} />}
            {activeTab === 'leaderboard' && <Leaderboard />}
            {activeTab === 'streaks' && profile && <ReadingStreaks userId={profile.id} />}
            {activeTab === 'reviews' && <Reviews />}
            {activeTab === 'moderation' && profile && <ReviewModeration userId={profile.id} userRole={profile.role} />}
            {activeTab === 'challenges' && <ReadingChallenge />}
            {activeTab === 'changePassword' && <ChangePassword />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
