import { useEffect, useState } from 'react';
import { Shield, MapPin, Smartphone, Clock, AlertTriangle, CheckCircle, XCircle, Filter, Search, Monitor, Tablet, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UAParser } from 'ua-parser-js';

type LoginLog = {
  id: string;
  user_id: string;
  login_at: string;
  ip_address?: string;
  user_agent?: string;
  status?: string;
  location?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  city?: string;
  country?: string;
  user?: {
    full_name: string;
    enrollment_id: string;
    role: string;
  };
};

export function EnhancedLoginLogs() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LoginLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [deviceFilter, setDeviceFilter] = useState<'all' | 'desktop' | 'mobile' | 'tablet'>('all');
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    uniqueUsers: 0,
  });

  useEffect(() => {
    if (profile?.role === 'librarian') {
      loadLogs();
    }
  }, [profile]);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter, deviceFilter]);

  const loadLogs = async () => {
    setLoading(true);

    // Get login logs with user details
    const { data, error } = await supabase
      .from('login_logs')
      .select(`
        *,
        user:user_profiles(full_name, enrollment_id, role)
      `)
      .order('login_at', { ascending: false })
      .limit(500);

    console.log('📊 Login logs query result:', { data, error, count: data?.length });
    
    if (error) {
      console.error('❌ Error loading login logs:', error);
    }

    if (!error && data) {
      // Log first record to see what data we have
      if (data.length > 0) {
        console.log('🔍 Sample login log:', data[0]);
        console.log('📱 User Agent:', data[0].user_agent);
        console.log('📍 Location:', data[0].location);
        console.log('🌐 IP Address:', data[0].ip_address);
      }

      // Parse user agent and detect device/browser
      const enhancedLogs = data.map(log => ({
        ...log,
        device_type: detectDeviceType(log.user_agent),
        browser: detectBrowser(log.user_agent),
        os: detectOS(log.user_agent),
        city: log.location ? parseLocation(log.location).city : 'Unknown',
        country: log.location ? parseLocation(log.location).country : 'Unknown',
      }));

      console.log('✅ Enhanced logs:', enhancedLogs.slice(0, 2));

      setLogs(enhancedLogs);

      // Calculate stats
      const uniqueUsers = new Set(data.map(l => l.user_id)).size;
      const successCount = data.filter(l => l.status === 'success' || !l.status).length;
      const failedCount = data.filter(l => l.status === 'failed').length;

      setStats({
        total: data.length,
        success: successCount,
        failed: failedCount,
        uniqueUsers,
      });
    }

    setLoading(false);
  };

  const filterLogs = () => {
    let filtered = [...logs];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user?.enrollment_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ip_address?.includes(searchTerm) ||
        log.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.country?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(log => {
        const status = log.status || 'success';
        return status === statusFilter;
      });
    }

    // Device filter
    if (deviceFilter !== 'all') {
      filtered = filtered.filter(log => log.device_type === deviceFilter);
    }

    setFilteredLogs(filtered);
  };

  const detectDeviceType = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown';
    
    const parser = new UAParser(userAgent);
    const deviceType = parser.getDevice().type;
    
    // Map UAParser device types to our categories
    if (deviceType === 'tablet') return 'tablet';
    if (deviceType === 'mobile') return 'mobile';
    if (deviceType === 'wearable') return 'mobile';
    if (deviceType === 'smarttv') return 'desktop';
    if (deviceType === 'console') return 'desktop';
    
    // If no device type, it's usually desktop
    return deviceType || 'desktop';
  };

  const detectBrowser = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown';
    
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    
    // Return browser name with version
    if (browser.name) {
      const version = browser.version ? ` ${browser.version.split('.')[0]}` : '';
      return `${browser.name}${version}`;
    }
    
    return 'Unknown';
  };

  const detectOS = (userAgent?: string): string => {
    if (!userAgent) return 'Unknown';
    
    const parser = new UAParser(userAgent);
    const os = parser.getOS();
    
    // Return OS name with version
    if (os.name) {
      const version = os.version ? ` ${os.version}` : '';
      return `${os.name}${version}`;
    }
    
    return 'Unknown';
  };

  const parseLocation = (location?: string): { city: string; country: string } => {
    if (!location) return { city: 'Unknown', country: 'Unknown' };
    
    // Expected format: "City, Country" or similar
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      return { city: parts[0], country: parts[parts.length - 1] };
    }
    return { city: location, country: 'Unknown' };
  };

  const getStatusIcon = (status?: string) => {
    const actualStatus = status || 'success';
    if (actualStatus === 'success') return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (actualStatus === 'failed') return <XCircle className="h-5 w-5 text-red-600" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
  };

  const getDeviceIcon = (deviceType?: string) => {
    if (deviceType === 'mobile') return <Phone className="h-4 w-4" />;
    if (deviceType === 'tablet') return <Tablet className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  if (profile?.role !== 'librarian') {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">This feature is only available to librarians.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-3 rounded-xl">
          <Shield className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enhanced Login Logs</h2>
          <p className="text-sm text-gray-600">Advanced security monitoring and session tracking</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Logins</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Successful</p>
              <p className="text-2xl font-bold text-green-600">{stats.success}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Failed Attempts</p>
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unique Users</p>
              <p className="text-2xl font-bold text-purple-600">{stats.uniqueUsers}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, IP, location..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success Only</option>
              <option value="failed">Failed Only</option>
            </select>
          </div>

          {/* Device Filter */}
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-gray-400" />
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value as any)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Devices</option>
              <option value="desktop">Desktop Only</option>
              <option value="mobile">Mobile Only</option>
              <option value="tablet">Tablet Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">User</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Time</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Location</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Device</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">Browser/OS</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No login logs found matching your filters
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      {getStatusIcon(log.status)}
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{log.user?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{log.user?.enrollment_id || 'N/A'}</div>
                        <div className="text-xs">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            {log.user?.role || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">
                        {new Date(log.login_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.login_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        <span>{log.city || 'Unknown'}</span>
                      </div>
                      <div className="text-xs text-gray-500">{log.country || 'Unknown'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(log.device_type)}
                        <span className="text-sm capitalize">{log.device_type || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-gray-900">{log.browser || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{log.os || 'Unknown'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {log.ip_address || 'N/A'}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800">
          Showing {filteredLogs.length} of {logs.length} login records
          {searchTerm && ` matching "${searchTerm}"`}
          {statusFilter !== 'all' && ` (${statusFilter} only)`}
          {deviceFilter !== 'all' && ` (${deviceFilter} devices)`}
        </p>
      </div>
    </div>
  );
}
