import React, { useState } from 'react';
import { Home, Building, Users, Settings, LogOut } from 'lucide-react';
import { GlobalStats } from '../components/SuperAdmin/GlobalStats';
import { SuperAdminDashboard as InstitutionManagement } from '../components/SuperAdminDashboard';
import { useAuth } from '../contexts/AuthContext';

type AdminPage = 'dashboard' | 'institutions' | 'users' | 'settings';

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: Home },
  { name: 'Institutions', href: 'institutions', icon: Building },
  // { name: 'Users', href: 'users', icon: Users },
  // { name: 'Settings', href: 'settings', icon: Settings },
];

export function SuperAdminLayout() {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const { signOut } = useAuth();

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <GlobalStats />;
      case 'institutions':
        return <InstitutionManagement />;
      default:
        return <GlobalStats />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-md flex-shrink-0 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">ArkosLIB</h1>
          <p className="text-sm text-gray-500">Super Admin</p>
        </div>
        <nav className="mt-5 px-4 flex-1">
          {navigation.map((item) => (
            <a
              key={item.name}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActivePage(item.href as AdminPage);
              }}
              className={`flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 ${
                activePage === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}>
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </a>
          ))}
        </nav>
        {/* Sidebar Footer for Logout */}
        <div className="p-4 border-t border-gray-200">
            <button
              onClick={signOut}
              className={`w-full flex items-center px-4 py-3 my-1 rounded-lg transition-colors duration-200 text-gray-700 hover:bg-gray-200'
              }`}>
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
