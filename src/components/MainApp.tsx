import { useState, lazy, Suspense, useEffect } from 'react';
import { BookOpen, Users, BookMarked, LayoutDashboard, LogOut, UserCog, Calendar, Trophy, Star, Target, Shield, Library, Monitor, Settings, TrendingUp, BarChart3, FileText, Flame, MessageCircle, Clock, ThumbsUp, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useReportNotifications } from '../hooks/useReportNotifications';
import schoolLogo from '../assets/Iisbenin logo.png';
import BackgroundCarousel from './BackgroundCarousel';
import NetworkStatus from './NetworkStatus';

// Set document title based on institution
const useDynamicTitle = () => {
  const { institution } = useAuth();
  useEffect(() => {
    const favicon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;

    if (institution?.name) {
      document.title = institution.name;
    } else {
      document.title = 'ArkosLIB';
    }

    if (favicon && institution?.theme_settings?.favicon_url) {
      favicon.href = institution.theme_settings.favicon_url;
    }

    // Reset title on component unmount (logout)
    return () => {
      document.title = 'ArkosLIB';
    };
  }, [institution]);
};

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
const Challenges = lazy(() => import('./Challenges').then(m => ({ default: m.default })));
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
const ChatMessaging = lazy(() => import('./ChatMessaging').then(m => ({ default: m.ChatMessaging })));
const BulkBookUpload = lazy(() => import('./BulkBookUpload').then(m => ({ default: m.BulkBookUpload })));
const BulkUserRegistration = lazy(() => import('./BulkUserRegistration').then(m => ({ default: m.BulkUserRegistration })));
const BookReportReview = lazy(() => import('./BookReportReview').then(m => ({ default: m.BookReportReview })));
const ReadingProgress = lazy(() => import('./ReadingProgress').then(m => ({ default: m.ReadingProgress })));
const SuperAdminLayout = lazy(() => import('../layouts/SuperAdminLayout').then(m => ({ default: m.SuperAdminLayout })));


type Tab = 'dashboard' | 'books' | 'mybooks' | 'digital' | 'students' | 'staff' | 'librarians' | 'borrowing' | 'reservations' | 'leaderboard' | 'reviews' | 'challenges' | 'loginlogs' | 'settings' | 'changePassword' | 'recommendations' | 'analytics' | 'reports' | 'securitylogs' | 'streaks' | 'bookclubs' | 'waitinglist' | 'moderation' | 'messages' | 'bulkbooks' | 'bulkusers' | 'bookreports' | 'progress';

export function MainApp() {
  useDynamicTitle(); // Set document title dynamically
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const { signOut, profile, institution } = useAuth();
  
  // Enable real-time notifications for report status changes
  useReportNotifications();

  // If the user is a super_admin, render the dedicated admin layout
  if (profile?.role === 'super_admin') {
    return (
      <Suspense fallback={<div>Loading Admin Dashboard...</div>}>
        <SuperAdminLayout />
      </Suspense>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getAvailableTabs = () => {
    const allTabs = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['librarian', 'staff', 'student'] },
      { id: 'messages', label: 'Messages', icon: MessageCircle, roles: ['librarian', 'staff', 'student'], featureFlag: 'messages' },
      { id: 'mybooks', label: 'My Books', icon: Library, roles: ['student', 'staff'] },
      { id: 'digital', label: 'Digital Library', icon: Monitor, roles: ['librarian', 'staff', 'student'] },
      { id: 'books', label: 'Books', icon: BookOpen, roles: ['librarian', 'staff'] },
      { id: 'bulkbooks', label: 'Bulk Upload Books', icon: Upload, roles: ['librarian'] },
      { id: 'recommendations', label: 'Recommended', icon: TrendingUp, roles: ['librarian', 'staff', 'student'] },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, roles: ['librarian'] },
      { id: 'reports', label: 'Reports', icon: FileText, roles: ['librarian'] },
      { id: 'students', label: 'Students', icon: Users, roles: ['librarian'] },
      { id: 'bulkusers', label: 'Bulk Register Users', icon: Users, roles: ['librarian'] },
      { id: 'staff', label: 'Staff', icon: UserCog, roles: ['librarian'] },
      { id: 'librarians', label: 'Librarians', icon: Shield, roles: ['librarian'] },
      { id: 'securitylogs', label: 'Security Logs', icon: Shield, roles: ['librarian'] },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['librarian'] },
      { id: 'borrowing', label: 'Borrowing', icon: BookMarked, roles: ['librarian', 'staff'] },
      { id: 'reservations', label: 'Reservations', icon: Calendar, roles: ['librarian', 'staff', 'student'], featureFlag: 'reservations' },
      { id: 'waitinglist', label: 'Waiting Lists', icon: Clock, roles: ['librarian', 'staff', 'student'] },
      { id: 'bookclubs', label: 'Book Clubs', icon: Users, roles: ['librarian', 'staff', 'student'], featureFlag: 'bookclubs' },
      { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['librarian', 'staff', 'student'], featureFlag: 'leaderboard' },
      { id: 'streaks', label: 'My Progress', icon: Flame, roles: ['student', 'staff'] },
      { id: 'progress', label: 'Reading Progress', icon: TrendingUp, roles: ['student', 'staff'] },
      { id: 'reviews', label: 'Reviews', icon: Star, roles: ['librarian', 'staff', 'student'], featureFlag: 'reviews' },
      { id: 'bookreports', label: 'Book Reports', icon: FileText, roles: ['librarian', 'staff'] },
      { id: 'moderation', label: 'Review Moderation', icon: ThumbsUp, roles: ['librarian'] },
      { id: 'challenges', label: 'Challenges', icon: Target, roles: ['librarian', 'staff', 'student'], featureFlag: 'challenges' },
      { id: 'changePassword', label: 'Change Password', icon: UserCog, roles: ['staff', 'student'] },
    ];

    return allTabs.filter(tab => {
      // Role check
      if (!profile?.role || !tab.roles.includes(profile.role)) {
        return false;
      }
      // Feature flag check
      if (tab.featureFlag) {
        return institution?.feature_flags?.[tab.featureFlag] === true;
      }
      // If no feature flag is defined for the tab, show it by default
      return true;
    });
  };

  const tabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-x-hidden">
      <NetworkStatus />
      <BackgroundCarousel />
      <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200 relative z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <img
                src={institution?.theme_settings?.logo_url || schoolLogo}
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
              onClick={handleSignOut}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] flex-shrink-0"
            >
              <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline text-sm">Sign Out</span>
              <span className="sm:hidden text-xs">Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-3 sm:py-6 relative z-10">
        {/* Mobile: Horizontal scrollable tabs */}
        <nav className="mb-4 sm:mb-6 bg-white/95 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex sm:flex-wrap gap-1 sm:gap-2 p-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap text-xs sm:text-sm flex-shrink-0 min-h-[44px] ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'messages' && <ChatMessaging />}
            {activeTab === 'mybooks' && <MyBooks />}
            {activeTab === 'digital' && <DigitalLibrary />}
            {activeTab === 'books' && <BookManagement />}
            {activeTab === 'bulkbooks' && <BulkBookUpload />}
            {activeTab === 'recommendations' && <BookRecommendations />}
            {activeTab === 'analytics' && <LibrarianAnalytics />}
            {activeTab === 'reports' && <ReportsExports />}
            {activeTab === 'students' && <StudentManagement />}
            {activeTab === 'bulkusers' && <BulkUserRegistration />}
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
            {activeTab === 'progress' && <ReadingProgress />}
            {activeTab === 'reviews' && <Reviews />}
            {activeTab === 'bookreports' && <BookReportReview />}
            {activeTab === 'moderation' && profile && <ReviewModeration userId={profile.id} userRole={profile.role} />}
            {activeTab === 'challenges' && <Challenges />}
            {activeTab === 'changePassword' && <ChangePassword />}
            {activeTab === 'super_admin' && <SuperAdminDashboard />} 
          </Suspense>
        </div>
      </div>
    </div>
  );
}
