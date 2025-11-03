import { Database, HardDrive, Activity, CheckCircle, AlertCircle } from 'lucide-react';

interface SystemStatusProps {
  storageUsed: number;
  storageLimit: number;
}

export function SystemStatus({ storageUsed, storageLimit }: SystemStatusProps) {
  const storagePercentage = storageLimit > 0 ? (storageUsed / storageLimit) * 100 : 0;
  
  const getStorageColor = () => {
    if (storagePercentage >= 90) return 'text-red-600';
    if (storagePercentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStorageBgColor = () => {
    if (storagePercentage >= 90) return 'bg-red-600';
    if (storagePercentage >= 75) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  const statusItems = [
    {
      label: 'Database',
      status: 'operational',
      icon: Database,
      color: 'green',
    },
    {
      label: 'API Services',
      status: 'operational',
      icon: Activity,
      color: 'green',
    },
    {
      label: 'Storage',
      status: storagePercentage >= 90 ? 'warning' : 'operational',
      icon: HardDrive,
      color: storagePercentage >= 90 ? 'yellow' : 'green',
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">System Status</h3>

      {/* System Components */}
      <div className="space-y-4 mb-6">
        {statusItems.map((item) => {
          const Icon = item.icon;
          const isOperational = item.status === 'operational';
          
          return (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`${isOperational ? 'bg-green-50' : 'bg-yellow-50'} rounded-lg p-2`}>
                  <Icon className={`h-5 w-5 ${isOperational ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">{item.label}</span>
              </div>
              {isOperational ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
          );
        })}
      </div>

      {/* Storage Usage */}
      <div className="pt-6 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Storage Usage</span>
          <span className={`text-sm font-semibold ${getStorageColor()}`}>
            {storagePercentage.toFixed(1)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
          <div
            className={`${getStorageBgColor()} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(storagePercentage, 100)}%` }}
          ></div>
        </div>
        
        <p className="text-xs text-gray-500">
          {storageUsed.toFixed(1)} GB of {storageLimit} GB used
        </p>
      </div>

      {/* Status Summary */}
      <div className="mt-6 pt-6 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-gray-600">All systems operational</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Last checked: {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
