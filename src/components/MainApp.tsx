import React, { useState } from 'react';
import { BookOpen, Users, BookMarked, LayoutDashboard, LogOut, UserCog, Calendar, Trophy, Star, Target, Shield, Library, Monitor, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import schoolLogo from '../assets/Iisbenin logo.png';
import { Dashboard } from './Dashboard';
import { BookManagement } from './BookManagement';
import { StudentManagement } from './StudentManagement';
import { StaffManagement } from './StaffManagement';
import { LibrarianManagement } from './LibrarianManagement';
import { BorrowingSystem } from './BorrowingSystem';
import { Reservations } from './Reservations';
import { Leaderboard } from './Leaderboard';
import { Reviews } from './Reviews';
import { ReadingChallenge } from './ReadingChallenge';
import { MyBooks } from './MyBooks';
import { DigitalLibrary } from './DigitalLibrary';
import { LoginLogs } from './LoginLogs';

type Tab = 'dashboard' | 'books' | 'mybooks' | 'digital' | 'students' | 'staff' | 'librarians' | 'borrowing' | 'reservations' | 'leaderboard' | 'reviews' | 'challenges' | 'loginlogs';

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
      { id: 'students' as Tab, label: 'Students', icon: Users, roles: ['librarian'] },
      { id: 'staff' as Tab, label: 'Staff', icon: UserCog, roles: ['librarian'] },
      { id: 'librarians' as Tab, label: 'Librarians', icon: Shield, roles: ['librarian'] },
      { id: 'loginlogs' as Tab, label: 'Login Logs', icon: Clock, roles: ['librarian'] },
      { id: 'borrowing' as Tab, label: 'Borrowing', icon: BookMarked, roles: ['librarian', 'staff'] },
      { id: 'reservations' as Tab, label: 'Reservations', icon: Calendar, roles: ['librarian', 'staff', 'student'] },
      { id: 'leaderboard' as Tab, label: 'Leaderboard', icon: Trophy, roles: ['librarian', 'staff', 'student'] },
      { id: 'reviews' as Tab, label: 'Reviews', icon: Star, roles: ['librarian', 'staff', 'student'] },
      { id: 'challenges' as Tab, label: 'Challenges', icon: Target, roles: ['librarian', 'staff', 'student'] },
    ];

    return allTabs.filter(tab => profile?.role && tab.roles.includes(profile.role));
  };

  const tabs = getAvailableTabs();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <nav className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg p-2 shadow-sm border border-gray-200">
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'mybooks' && <MyBooks />}
          {activeTab === 'digital' && <DigitalLibrary />}
          {activeTab === 'books' && <BookManagement />}
          {activeTab === 'students' && <StudentManagement />}
          {activeTab === 'staff' && <StaffManagement />}
          {activeTab === 'librarians' && <LibrarianManagement />}
          {activeTab === 'loginlogs' && <LoginLogs />}
          {activeTab === 'borrowing' && <BorrowingSystem />}
          {activeTab === 'reservations' && <Reservations />}
          {activeTab === 'leaderboard' && <Leaderboard />}
          {activeTab === 'reviews' && <Reviews />}
          {activeTab === 'challenges' && <ReadingChallenge />}
        </div>
      </div>
    </div>
  );
}
