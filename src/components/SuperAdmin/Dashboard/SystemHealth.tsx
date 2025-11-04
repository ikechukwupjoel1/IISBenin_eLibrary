import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Activity, Database, HardDrive, AlertTriangle, CheckCircle, XCircle, Zap } from 'lucide-react';

interface SystemHealthData {
  status: 'healthy' | 'warning' | 'critical';
  database: {
    size_bytes: number;
    size_mb: number;
    status: string;
  };
  connections: {
    active: number;
    status: string;
  };
  performance: {
    avg_response_time_ms: number;
    status: string;
  };
  errors: {
    last_hour: number;
    status: string;
  };
  storage: {
    total_bytes: number;
    used_bytes: number;
    used_percentage: number;
    status: string;
  };
  last_checked: string;
}

export function SystemHealth() {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    loadSystemHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadSystemHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadSystemHealth = async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_health');
      
      if (error) throw error;
      
      setHealth(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to load system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-gray-400 animate-pulse" />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
          <div className="h-20 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Activity className="w-6 h-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
        </div>
        <p className="text-gray-500">Failed to load system health data</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </span>
            <button
              onClick={loadSystemHealth}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Refresh"
            >
              <Activity className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className={`px-6 py-4 border-b border-gray-200 ${getStatusColor(health.status)}`}>
        <div className="flex items-center space-x-3">
          {getStatusIcon(health.status)}
          <div>
            <p className="font-semibold capitalize">{health.status}</p>
            <p className="text-sm opacity-75">
              {health.status === 'healthy' && 'All systems operational'}
              {health.status === 'warning' && 'Some issues detected'}
              {health.status === 'critical' && 'Critical issues require attention'}
            </p>
          </div>
        </div>
      </div>

      {/* Health Metrics */}
      <div className="p-6 space-y-4">
        {/* Database Health */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.database.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Database className="w-5 h-5" />
              <span className="font-medium">Database</span>
            </div>
            {getStatusIcon(health.database.status)}
          </div>
          <div className="text-sm space-y-1">
            <p>Size: {health.database.size_mb.toFixed(2)} MB</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full ${
                  health.database.status === 'healthy' ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${Math.min((health.database.size_mb / 10240) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Connections */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.connections.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Active Connections</span>
            </div>
            {getStatusIcon(health.connections.status)}
          </div>
          <div className="text-sm">
            <p className="text-2xl font-bold">{health.connections.active}</p>
            <p className="text-xs opacity-75 mt-1">
              {health.connections.active < 50 && 'Low load'}
              {health.connections.active >= 50 && health.connections.active < 100 && 'Moderate load'}
              {health.connections.active >= 100 && 'High load'}
            </p>
          </div>
        </div>

        {/* Performance */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.performance.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span className="font-medium">Performance</span>
            </div>
            {getStatusIcon(health.performance.status)}
          </div>
          <div className="text-sm">
            <p className="text-2xl font-bold">
              {health.performance.avg_response_time_ms.toFixed(0)} ms
            </p>
            <p className="text-xs opacity-75 mt-1">Average response time</p>
          </div>
        </div>

        {/* Errors */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.errors.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Errors (Last Hour)</span>
            </div>
            {getStatusIcon(health.errors.status)}
          </div>
          <div className="text-sm">
            <p className="text-2xl font-bold">{health.errors.last_hour}</p>
            <p className="text-xs opacity-75 mt-1">
              {health.errors.last_hour === 0 && 'No errors detected'}
              {health.errors.last_hour > 0 && health.errors.last_hour <= 5 && 'Minimal errors'}
              {health.errors.last_hour > 5 && 'Review error logs'}
            </p>
          </div>
        </div>

        {/* Storage */}
        <div className={`p-4 rounded-lg border-2 ${getStatusColor(health.storage.status)}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-5 h-5" />
              <span className="font-medium">Storage Usage</span>
            </div>
            {getStatusIcon(health.storage.status)}
          </div>
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>{formatBytes(health.storage.used_bytes)}</span>
              <span className="font-semibold">{health.storage.used_percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  health.storage.status === 'critical' ? 'bg-red-500' :
                  health.storage.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(health.storage.used_percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs opacity-75">
              of {formatBytes(health.storage.total_bytes)} total
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
