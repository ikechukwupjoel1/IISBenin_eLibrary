import { Plus, UserPlus, BarChart3, Settings, Mail } from 'lucide-react';

interface QuickActionsProps {
  onCreateInstitution?: () => void;
  onInviteLibrarian?: () => void;
  onViewAnalytics?: () => void;
  onOpenSettings?: () => void;
}

export function QuickActions({ 
  onCreateInstitution, 
  onInviteLibrarian,
  onViewAnalytics,
  onOpenSettings
}: QuickActionsProps = {}) {
  const actions = [
    {
      label: 'Create Institution',
      icon: Plus,
      color: 'blue',
      onClick: onCreateInstitution,
    },
    {
      label: 'Invite Librarian',
      icon: UserPlus,
      color: 'purple',
      onClick: onInviteLibrarian,
    },
    {
      label: 'View Analytics',
      icon: BarChart3,
      color: 'green',
      onClick: onViewAnalytics,
    },
    {
      label: 'System Settings',
      icon: Settings,
      color: 'gray',
      onClick: onOpenSettings,
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    purple: 'bg-purple-600 hover:bg-purple-700',
    green: 'bg-green-600 hover:bg-green-700',
    gray: 'bg-gray-600 hover:bg-gray-700',
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-lg p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <p className="text-blue-100 text-sm mt-1">Common tasks at your fingertips</p>
        </div>
        <Mail className="h-8 w-8 text-blue-200" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.label}
              onClick={action.onClick}
              className={`${colorClasses[action.color as keyof typeof colorClasses]} text-white rounded-lg p-4 flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 hover:shadow-xl group`}
            >
              <div className="bg-white bg-opacity-20 rounded-lg p-3 group-hover:bg-opacity-30 transition-all">
                <Icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium text-center">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
