import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Users, 
  Building2, 
  BookOpen, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { MetricsCard } from './MetricsCard';
import { ActivityFeed } from './ActivityFeed';
import { QuickActions } from './QuickActions';
import { SystemStatus } from './SystemStatus';

interface DashboardMetrics {
  totalInstitutions: number;
  institutionsTrend: number;
  activeInstitutions: number;
  totalUsers: number;
  usersTrend: number;
  totalBooks: number;
  booksTrend: number;
  activeSessionsCount: number;
  storageUsed: number;
  storageLimit: number;
}

interface ActivityItem {
  id: string;
  type: 'institution_created' | 'institution_suspended' | 'institution_reactivated' | 'librarian_invited' | 'user_registered';
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface DashboardHomeProps {
  onCreateInstitution?: () => void;
  onInviteLibrarian?: () => void;
  onViewAnalytics?: () => void;
  onOpenSettings?: () => void;
}

export function DashboardHome({
  onCreateInstitution,
  onInviteLibrarian,
  onViewAnalytics,
  onOpenSettings
}: DashboardHomeProps = {}) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch metrics and activities in parallel
      const [metricsResult, activitiesResult] = await Promise.all([
        fetchMetrics(),
        fetchActivities()
      ]);

      if (metricsResult) setMetrics(metricsResult);
      if (activitiesResult) setActivities(activitiesResult);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMetrics = async (): Promise<DashboardMetrics | null> => {
    try {
      // Use optimized RPC function for all metrics
      const { data, error } = await supabase.rpc('get_dashboard_metrics');

      if (error) {
        console.error('RPC error:', error);
        return null;
      }

      if (!data || data.length === 0) return null;

      const metrics = data[0];

      // Calculate trends (compare current with 30 days ago)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const isoDate = thirtyDaysAgo.toISOString();

      const [oldInstitutions, oldUsers, oldBooks] = await Promise.all([
        supabase.from('institutions').select('id', { count: 'exact' }).lt('created_at', isoDate),
        supabase.from('user_profiles').select('id', { count: 'exact' }).lt('created_at', isoDate),
        supabase.from('books').select('id', { count: 'exact' }).lt('created_at', isoDate)
      ]);

      const calculateTrend = (current: number, old: number) => {
        if (old === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - old) / old) * 100);
      };

      return {
        totalInstitutions: Number(metrics.total_institutions) || 0,
        institutionsTrend: calculateTrend(
          Number(metrics.total_institutions) || 0,
          oldInstitutions.count || 0
        ),
        activeInstitutions: Number(metrics.active_institutions) || 0,
        totalUsers: Number(metrics.total_users) || 0,
        usersTrend: calculateTrend(
          Number(metrics.total_users) || 0,
          oldUsers.count || 0
        ),
        totalBooks: Number(metrics.total_books) || 0,
        booksTrend: calculateTrend(
          Number(metrics.total_books) || 0,
          oldBooks.count || 0
        ),
        activeSessionsCount: Number(metrics.active_sessions_count) || 0,
        storageUsed: Number(metrics.storage_used_gb) || 0,
        storageLimit: Number(metrics.storage_limit_gb) || 100
      };
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      return null;
    }
  };

  const fetchActivities = async (): Promise<ActivityItem[]> => {
    try {
      // Use optimized RPC function for activity feed
      const { data, error } = await supabase.rpc('get_activity_feed', {
        p_limit: 15,
        p_offset: 0
      });

      if (error) {
        console.error('RPC error:', error);
        return [];
      }

      if (!data) return [];

      // Map database results to ActivityItem format
      return data.map((activity: {
        id: string;
        activity_type: string;
        description: string;
        created_at: string;
        metadata: Record<string, unknown>;
      }) => ({
        id: activity.id,
        type: activity.activity_type as ActivityItem['type'],
        description: activity.description,
        timestamp: activity.created_at,
        metadata: activity.metadata
      }));
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      return [];
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your platform.</p>
      </div>

      {/* Quick Actions */}
      <QuickActions 
        onCreateInstitution={onCreateInstitution}
        onInviteLibrarian={onInviteLibrarian}
        onViewAnalytics={onViewAnalytics}
        onOpenSettings={onOpenSettings}
      />

      {/* Key Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard
            title="Total Institutions"
            value={metrics.totalInstitutions}
            trend={metrics.institutionsTrend}
            icon={Building2}
            color="blue"
            subtitle={`${metrics.activeInstitutions} active`}
          />
          <MetricsCard
            title="Total Users"
            value={metrics.totalUsers}
            trend={metrics.usersTrend}
            icon={Users}
            color="green"
          />
          <MetricsCard
            title="Total Books"
            value={metrics.totalBooks}
            trend={metrics.booksTrend}
            icon={BookOpen}
            color="purple"
          />
          <MetricsCard
            title="Active Sessions"
            value={metrics.activeSessionsCount}
            icon={Activity}
            color="orange"
          />
        </div>
      )}

      {/* System Status and Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed - 2 columns */}
        <div className="lg:col-span-2">
          <ActivityFeed activities={activities} loading={loading} />
        </div>

        {/* System Status - 1 column */}
        <div>
          <SystemStatus 
            storageUsed={metrics?.storageUsed || 0}
            storageLimit={metrics?.storageLimit || 100}
          />
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-yellow-900">System Alerts</h3>
            <p className="text-sm text-yellow-800 mt-1">
              No critical alerts at this time. All systems operational.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
