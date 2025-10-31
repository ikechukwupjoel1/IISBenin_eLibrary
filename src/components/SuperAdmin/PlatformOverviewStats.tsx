import { Library, CheckCircle, EyeOff, Users, Book, BookUp, FileText } from 'lucide-react';
import { InstitutionStatusPieChart } from './InstitutionStatusPieChart';
import { ActivityBarChart } from './ActivityBarChart';
import { RecentLoginActivity } from './RecentLoginActivity';

type GlobalStats = {
  lifetime: {
    institutions: number;
    active_institutions: number;
    suspended_institutions: number;
    setup_complete_institutions: number;
    setup_pending_institutions: number;
    students: number;
    staff: number;
    books: number;
  };
  range: {
    new_students: number;
    new_staff: number;
    borrows: number;
    book_reports: number;
  };
};

interface ActivityDataPoint {
  date: string;
  new_students: number;
  new_staff: number;
  borrows: number;
  book_reports: number;
}

export function PlatformOverviewStats() {
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [activityData, setActivityData] = useState<ActivityDataPoint[]>([]);
  const [range, setRange] = useState('all'); // 'all', '30d', '90d'

  useEffect(() => {
    const fetchGlobalStats = async () => {
      let startDate = null;
      if (range === '30d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
      } else if (range === '90d') {
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 90);
      }

      const { data, error } = await supabase.rpc('get_global_stats', {
        start_date: startDate ? startDate.toISOString() : null,
      });

      if (error) {
        toast.error('Failed to load global stats: ' + error.message);
      } else {
        setGlobalStats(data);
      }
    };

    const fetchActivityStats = async () => {
      let startDate = new Date();
      let endDate = new Date();

      if (range === '30d') {
        startDate.setDate(startDate.getDate() - 30);
      } else if (range === '90d') {
        startDate.setDate(startDate.getDate() - 90);
      } else if (range === 'all') {
        // For 'all time', fetch a reasonable default range, e.g., last year or since epoch
        // For simplicity, let's default to last year if 'all' is selected for chart data
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const { data, error } = await supabase.rpc('get_activity_stats_timeseries', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (error) {
        toast.error('Failed to load activity stats: ' + error.message);
      } else {
        setActivityData(data);
      }
    };

    const fetchLoginActivity = async () => {
      const { data, error } = await supabase.rpc('get_recent_login_activity');
      if (error) {
        toast.error('Failed to load login activity: ' + error.message);
      } else {
        setLoginActivity(data || []);
      }
    };

    fetchGlobalStats();
    fetchActivityStats();
    fetchLoginActivity();
  }, [range]);

  if (!globalStats) {
    return <div>Loading platform stats...</div>;
  }

  const StatCard = ({ title, value, total, icon: Icon, color }: { title: string, value: string | number, total?: string | number, icon: React.ElementType, color: string }) => (
    <div className={`bg-white overflow-hidden shadow rounded-lg ${color}`}>
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate text-white opacity-80">{title}</dt>
              <dd className="flex items-baseline">
                <span className="text-3xl font-bold text-white">{value}</span>
                {total !== undefined && <span className="text-sm font-medium text-gray-200 ml-2">of {total}</span>}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRangeLabel = () => {
    if (range === '30d') return 'in the last 30 days';
    if (range === '90d') return 'in the last 90 days';
    return 'in total';
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl leading-6 font-medium text-gray-900">Platform Overview</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => setRange('all')} className={`px-3 py-1 text-sm font-medium rounded-md ${range === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>All Time</button>
          <button onClick={() => setRange('90d')} className={`px-3 py-1 text-sm font-medium rounded-md ${range === '90d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>90 Days</button>
          <button onClick={() => setRange('30d')} className={`px-3 py-1 text-sm font-medium rounded-md ${range === '30d' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>30 Days</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stat Cards */}
        <div className="lg:col-span-2">
          {/* Lifetime Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <StatCard title="Total Institutions" value={globalStats.lifetime.institutions} icon={Library} color="bg-blue-500" />
            <StatCard title="Setup Complete" value={globalStats.lifetime.setup_complete_institutions} total={globalStats.lifetime.institutions} icon={CheckCircle} color="bg-sky-500" />
          </div>

          {/* Range-based Stats */}
          <div className="mt-6">
            <h4 className="text-lg font-medium text-gray-800">Activity {renderRangeLabel()}</h4>
            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <StatCard title="New Students" value={globalStats.range.new_students} total={globalStats.lifetime.students} icon={Users} color="bg-teal-500" />
                <StatCard title="New Staff" value={globalStats.range.new_staff} total={globalStats.lifetime.staff} icon={Users} color="bg-cyan-500" />
                <StatCard title="Books Borrowed" value={globalStats.range.borrows} icon={BookUp} color="bg-amber-500" />
                <StatCard title="Book Reports" value={globalStats.range.book_reports} icon={FileText} color="bg-purple-500" />
            </div>
          </div>
        </div>

        {/* Right Column: Pie Chart */}
        <div className="lg:col-span-1">
          <InstitutionStatusPieChart 
            active={globalStats.lifetime.active_institutions} 
            suspended={globalStats.lifetime.suspended_institutions} 
          />
        </div>
      </div>

      {/* Activity Bar Chart */}
      <div className="mt-6">
        <ActivityBarChart data={activityData} />
      </div>

      {/* Recent Login Activity */}
      <div className="mt-6">
        <RecentLoginActivity />
      </div>
    </div>
  );
}
