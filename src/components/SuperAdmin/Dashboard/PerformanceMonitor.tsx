import React, { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PerformanceMetric {
  metric_name: string;
  current_value: number;
  avg_value: number;
  min_value: number;
  max_value: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  data_points: Array<{
    timestamp: string;
    value: number;
  }>;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1 hour' | '24 hours' | '7 days'>('24 hours');

  useEffect(() => {
    loadPerformanceMetrics();
    
    // Refresh every minute
    const interval = setInterval(() => {
      loadPerformanceMetrics();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadPerformanceMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_performance_metrics', {
        time_range: timeRange
      });
      
      if (error) throw error;
      
      setMetrics(data || []);
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 bg-green-50';
      case 'decreasing':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatMetricName = (name: string): string => {
    return name.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatChartData = (dataPoints: Array<{ timestamp: string; value: number }>) => {
    return dataPoints.map(point => ({
      time: new Date(point.timestamp).toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      value: point.value
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <div className="animate-pulse h-8 w-32 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-6">
          <div className="animate-pulse h-64 bg-gray-100 rounded"></div>
          <div className="animate-pulse h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
          <div className="flex space-x-2">
            {(['1 hour', '24 hours', '7 days'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {metrics.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No performance metrics available for this time range.</p>
            <p className="text-sm mt-2">Metrics will appear as data is collected.</p>
          </div>
        ) : (
          metrics.map((metric) => (
            <div key={metric.metric_name} className="space-y-4">
              {/* Metric Summary */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {formatMetricName(metric.metric_name)}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>Current: <strong>{metric.current_value.toFixed(2)}</strong></span>
                    <span>Avg: {metric.avg_value.toFixed(2)}</span>
                    <span>Min: {metric.min_value.toFixed(2)}</span>
                    <span>Max: {metric.max_value.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${getTrendColor(metric.trend)}`}>
                  {getTrendIcon(metric.trend)}
                  <span className="text-sm font-medium capitalize">{metric.trend}</span>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64">
                {metric.data_points && metric.data_points.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={formatChartData(metric.data_points)}>
                      <defs>
                        <linearGradient id={`gradient-${metric.metric_name}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="time" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          fontSize: '12px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill={`url(#gradient-${metric.metric_name})`}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    No data points available
                  </div>
                )}
              </div>

              {/* Divider */}
              {metric !== metrics[metrics.length - 1] && (
                <div className="border-t border-gray-200 pt-4"></div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Quick Stats Summary */}
      {metrics.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Metrics</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Increasing</p>
              <p className="text-2xl font-bold text-green-600">
                {metrics.filter(m => m.trend === 'increasing').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Decreasing</p>
              <p className="text-2xl font-bold text-red-600">
                {metrics.filter(m => m.trend === 'decreasing').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Stable</p>
              <p className="text-2xl font-bold text-gray-600">
                {metrics.filter(m => m.trend === 'stable').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
