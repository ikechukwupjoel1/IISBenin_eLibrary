import { 
  Building2, 
  UserPlus, 
  Power, 
  PowerOff, 
  Clock 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
  id: string;
  type: 'institution_created' | 'institution_suspended' | 'institution_reactivated' | 'librarian_invited' | 'user_registered';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  loading?: boolean;
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'institution_created':
        return { icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'institution_suspended':
        return { icon: PowerOff, color: 'text-red-600', bg: 'bg-red-50' };
      case 'institution_reactivated':
        return { icon: Power, color: 'text-green-600', bg: 'bg-green-50' };
      case 'librarian_invited':
        return { icon: UserPlus, color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'user_registered':
        return { icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' };
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <span className="text-sm text-gray-500">{activities.length} events</span>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            const { icon: Icon, color, bg } = getActivityIcon(activity.type);
            
            return (
              <div key={activity.id} className="flex gap-4 items-start group hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                <div className={`${bg} rounded-lg p-2.5 flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(activity.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View all activity →
        </button>
      </div>
    </div>
  );
}
