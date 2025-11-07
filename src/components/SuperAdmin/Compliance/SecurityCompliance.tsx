import React, { useState, useEffect } from 'react';
import { 
  Shield, Download, Trash2, FileText, CheckCircle, XCircle, 
  Clock, AlertTriangle, Settings, Lock, Key, Database,
  UserX, Eye, EyeOff, Save, RefreshCw, Search, Filter
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';

type DataExportRequest = {
  id: string;
  user_id: string;
  request_type: string;
  data_categories: string[];
  status: string;
  requested_at: string;
  completed_at?: string;
  download_url?: string;
  expires_at?: string;
  file_size_bytes?: number;
  user_name?: string;
  user_email?: string;
};

type DeletionRequest = {
  id: string;
  user_id: string;
  reason?: string;
  requested_at: string;
  scheduled_deletion_date?: string;
  status: string;
  user_name?: string;
  user_email?: string;
};

type PasswordPolicy = {
  id?: string;
  institution_id?: string;
  min_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  max_age_days?: number;
  prevent_reuse_count: number;
  lockout_attempts: number;
  lockout_duration_minutes: number;
};

type RetentionPolicy = {
  id?: string;
  institution_id?: string;
  data_type: string;
  retention_period_days: number;
  auto_delete: boolean;
  legal_hold: boolean;
  description?: string;
};

export function SecurityCompliance() {
  const [activeTab, setActiveTab] = useState<'exports' | 'deletions' | 'policies' | 'retention' | 'consents'>('exports');
  const [loading, setLoading] = useState(false);
  
  // Data Export Requests
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  
  // Deletion Requests
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(false);
  
  // Password Policy
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    min_length: 8,
    require_uppercase: true,
    require_lowercase: true,
    require_numbers: true,
    require_special_chars: true,
    max_age_days: 90,
    prevent_reuse_count: 5,
    lockout_attempts: 5,
    lockout_duration_minutes: 30
  });
  const [policyLoading, setPolicyLoading] = useState(false);
  
  // Retention Policies
  const [retentionPolicies, setRetentionPolicies] = useState<RetentionPolicy[]>([]);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [editingRetention, setEditingRetention] = useState<RetentionPolicy | null>(null);

  useEffect(() => {
    if (activeTab === 'exports') {
      fetchExportRequests();
    } else if (activeTab === 'deletions') {
      fetchDeletionRequests();
    } else if (activeTab === 'policies') {
      fetchPasswordPolicy();
    } else if (activeTab === 'retention') {
      fetchRetentionPolicies();
    }
  }, [activeTab]);

  const fetchExportRequests = async () => {
    setExportLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select(`
          *,
          user:user_id (
            email,
            user_profiles (full_name)
          )
        `)
        .order('requested_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setExportRequests(
        data?.map((req: any) => ({
          ...req,
          user_name: req.user?.user_profiles?.[0]?.full_name || 'Unknown',
          user_email: req.user?.email || 'Unknown'
        })) || []
      );
    } catch (error: any) {
      toast.error('Failed to fetch export requests: ' + error.message);
    } finally {
      setExportLoading(false);
    }
  };

  const fetchDeletionRequests = async () => {
    setDeletionLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_deletion_requests')
        .select(`
          *,
          user:user_id (
            email,
            user_profiles (full_name)
          )
        `)
        .order('requested_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setDeletionRequests(
        data?.map((req: any) => ({
          ...req,
          user_name: req.user?.user_profiles?.[0]?.full_name || 'Unknown',
          user_email: req.user?.email || 'Unknown'
        })) || []
      );
    } catch (error: any) {
      toast.error('Failed to fetch deletion requests: ' + error.message);
    } finally {
      setDeletionLoading(false);
    }
  };

  const fetchPasswordPolicy = async () => {
    setPolicyLoading(true);
    try {
      const { data, error } = await supabase
        .from('password_policies')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setPasswordPolicy(data);
      }
    } catch (error: any) {
      toast.error('Failed to fetch password policy: ' + error.message);
    } finally {
      setPolicyLoading(false);
    }
  };

  const fetchRetentionPolicies = async () => {
    setRetentionLoading(true);
    try {
      const { data, error } = await supabase
        .from('data_retention_policies')
        .select('*')
        .order('data_type');

      if (error) throw error;

      setRetentionPolicies(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch retention policies: ' + error.message);
    } finally {
      setRetentionLoading(false);
    }
  };

  const processExportRequest = async (requestId: string) => {
    const loadingToast = toast.loading('Processing export request...');
    try {
      const { error } = await supabase
        .from('data_export_requests')
        .update({ status: 'processing' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Export request queued for processing', { id: loadingToast });
      fetchExportRequests();
    } catch (error: any) {
      toast.error('Failed to process request: ' + error.message, { id: loadingToast });
    }
  };

  const approveDeletion = async (requestId: string) => {
    const loadingToast = toast.loading('Approving deletion request...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('account_deletion_requests')
        .update({ 
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Deletion request approved', { id: loadingToast });
      fetchDeletionRequests();
    } catch (error: any) {
      toast.error('Failed to approve deletion: ' + error.message, { id: loadingToast });
    }
  };

  const rejectDeletion = async (requestId: string) => {
    const loadingToast = toast.loading('Cancelling deletion request...');
    try {
      const { error } = await supabase
        .from('account_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('id', requestId);

      if (error) throw error;

      toast.success('Deletion request cancelled', { id: loadingToast });
      fetchDeletionRequests();
    } catch (error: any) {
      toast.error('Failed to cancel deletion: ' + error.message, { id: loadingToast });
    }
  };

  const savePasswordPolicy = async () => {
    const loadingToast = toast.loading('Saving password policy...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('password_policies')
        .upsert({
          ...passwordPolicy,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Password policy saved successfully', { id: loadingToast });
    } catch (error: any) {
      toast.error('Failed to save policy: ' + error.message, { id: loadingToast });
    }
  };

  const saveRetentionPolicy = async (policy: RetentionPolicy) => {
    const loadingToast = toast.loading('Saving retention policy...');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('institution_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('data_retention_policies')
        .upsert({
          ...policy,
          institution_id: profile?.institution_id,
          created_by: user.id,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Retention policy saved', { id: loadingToast });
      setEditingRetention(null);
      fetchRetentionPolicies();
    } catch (error: any) {
      toast.error('Failed to save policy: ' + error.message, { id: loadingToast });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const dataTypes = [
    'user_profiles',
    'activity_logs',
    'borrowing_history',
    'reading_progress',
    'communications',
    'support_tickets',
    'audit_logs',
    'deleted_accounts'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            Security & Compliance
          </h2>
          <p className="text-gray-600 mt-1">GDPR/CCPA compliance, data protection, and security policies</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('exports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'exports'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Download className="w-5 h-5 inline mr-2" />
            Data Exports
          </button>
          <button
            onClick={() => setActiveTab('deletions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deletions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserX className="w-5 h-5 inline mr-2" />
            Account Deletions
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="w-5 h-5 inline mr-2" />
            Password Policies
          </button>
          <button
            onClick={() => setActiveTab('retention')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'retention'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="w-5 h-5 inline mr-2" />
            Data Retention
          </button>
        </nav>
      </div>

      {/* Data Exports Tab */}
      {activeTab === 'exports' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Data Export Requests (GDPR Article 20)</h3>
            {exportLoading ? (
              <LoadingSkeleton count={5} />
            ) : exportRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No export requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {exportRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.user_name}</div>
                            <div className="text-sm text-gray-500">{request.user_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{request.request_type}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {request.data_categories.map((cat, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {cat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {request.status === 'pending' && (
                            <button
                              onClick={() => processExportRequest(request.id)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Process
                            </button>
                          )}
                          {request.status === 'completed' && request.download_url && (
                            <a
                              href={request.download_url}
                              className="text-green-600 hover:text-green-900"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Account Deletions Tab */}
      {activeTab === 'deletions' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Account Deletion Requests (GDPR Article 17)</h3>
            {deletionLoading ? (
              <LoadingSkeleton count={5} />
            ) : deletionRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No deletion requests found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {deletionRequests.map((request) => (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.user_name}</div>
                            <div className="text-sm text-gray-500">{request.user_email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <p className="text-sm text-gray-900 truncate">{request.reason || 'No reason provided'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(request.requested_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {request.scheduled_deletion_date 
                            ? new Date(request.scheduled_deletion_date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveDeletion(request.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectDeletion(request.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Password Policies Tab */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-6">Password Security Policy</h3>
          {policyLoading ? (
            <LoadingSkeleton count={10} />
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Length
                  </label>
                  <input
                    type="number"
                    min="6"
                    max="32"
                    value={passwordPolicy.min_length}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, min_length: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password Max Age (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={passwordPolicy.max_age_days || ''}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, max_age_days: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="No expiration"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prevent Reuse (last N passwords)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={passwordPolicy.prevent_reuse_count}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, prevent_reuse_count: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lockout After Failed Attempts
                  </label>
                  <input
                    type="number"
                    min="3"
                    max="10"
                    value={passwordPolicy.lockout_attempts}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, lockout_attempts: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lockout Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={passwordPolicy.lockout_duration_minutes}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, lockout_duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Password Requirements</h4>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={passwordPolicy.require_uppercase}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, require_uppercase: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Require uppercase letters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={passwordPolicy.require_lowercase}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, require_lowercase: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Require lowercase letters</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={passwordPolicy.require_numbers}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, require_numbers: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Require numbers</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={passwordPolicy.require_special_chars}
                    onChange={(e) => setPasswordPolicy({ ...passwordPolicy, require_special_chars: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Require special characters</span>
                </label>
              </div>

              <button
                onClick={savePasswordPolicy}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                Save Password Policy
              </button>
            </div>
          )}
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'retention' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Data Retention Policies</h3>
            <button
              onClick={() => setEditingRetention({ 
                data_type: 'user_profiles', 
                retention_period_days: 365, 
                auto_delete: false, 
                legal_hold: false 
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Database className="w-4 h-4" />
              Add Policy
            </button>
          </div>

          {retentionLoading ? (
            <LoadingSkeleton count={5} />
          ) : (
            <div className="space-y-4">
              {retentionPolicies.map((policy) => (
                <div key={policy.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{policy.data_type}</h4>
                      <p className="text-sm text-gray-600 mt-1">{policy.description || 'No description'}</p>
                      <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                        <span>Retention: {policy.retention_period_days} days</span>
                        <span>Auto-delete: {policy.auto_delete ? 'Yes' : 'No'}</span>
                        {policy.legal_hold && (
                          <span className="text-red-600 font-medium">⚠️ Legal Hold</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingRetention(policy)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}

              {retentionPolicies.length === 0 && (
                <p className="text-gray-500 text-center py-8">No retention policies configured</p>
              )}
            </div>
          )}

          {/* Edit Modal */}
          {editingRetention && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg max-w-md w-full p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingRetention.id ? 'Edit' : 'Add'} Retention Policy
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data Type
                    </label>
                    <select
                      value={editingRetention.data_type}
                      onChange={(e) => setEditingRetention({ ...editingRetention, data_type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      disabled={!!editingRetention.id}
                    >
                      {dataTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retention Period (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={editingRetention.retention_period_days}
                      onChange={(e) => setEditingRetention({ ...editingRetention, retention_period_days: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={editingRetention.description || ''}
                      onChange={(e) => setEditingRetention({ ...editingRetention, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows={3}
                    />
                  </div>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingRetention.auto_delete}
                      onChange={(e) => setEditingRetention({ ...editingRetention, auto_delete: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Enable automatic deletion</span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={editingRetention.legal_hold}
                      onChange={(e) => setEditingRetention({ ...editingRetention, legal_hold: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Legal hold (prevent deletion)</span>
                  </label>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => saveRetentionPolicy(editingRetention)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingRetention(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
