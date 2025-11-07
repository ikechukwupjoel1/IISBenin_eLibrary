import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Users, 
  BookOpen, 
  Building2, 
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  History,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

type OperationType = 
  | 'role_change' 
  | 'institution_activation' 
  | 'institution_deactivation'
  | 'book_update'
  | 'announcement_send';

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface BulkJob {
  id: string;
  operation_type: OperationType;
  status: JobStatus;
  target_count: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  progress_percentage: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  parameters: Record<string, unknown>;
}

interface SelectedItem {
  id: string;
  name: string;
  type: string;
}

export default function BulkOperations() {
  const [activeTab, setActiveTab] = useState<'users' | 'institutions' | 'books' | 'announcements' | 'history'>('users');
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<BulkJob[]>([]);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [currentOperation, setCurrentOperation] = useState<OperationType | null>(null);

  // Form states
  const [newRole, setNewRole] = useState('');
  const [bookUpdates, setBookUpdates] = useState({ category: '', publisher: '' });
  const [announcementData, setAnnouncementData] = useState({ title: '', message: '', priority: 'normal' });

  useEffect(() => {
    fetchJobHistory();
  }, []);

  const fetchJobHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('bulk_operation_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: unknown) {
      console.error('Error fetching job history:', error);
      const message = error instanceof Error ? error.message : 'Failed to load job history';
      toast.error(message);
    }
  };

  const handleBulkRoleChange = async () => {
    if (selectedItems.length === 0 || !newRole) {
      toast.error('Please select users and a role');
      return;
    }

    setCurrentOperation('role_change');
    setShowConfirmDialog(true);
  };

  const handleBulkInstitutionToggle = async (activate: boolean) => {
    if (selectedItems.length === 0) {
      toast.error('Please select institutions');
      return;
    }

    setCurrentOperation(activate ? 'institution_activation' : 'institution_deactivation');
    setShowConfirmDialog(true);
  };

  const handleBulkBookUpdate = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select books');
      return;
    }

    if (!bookUpdates.category && !bookUpdates.publisher) {
      toast.error('Please specify at least one field to update');
      return;
    }

    setCurrentOperation('book_update');
    setShowConfirmDialog(true);
  };

  const handleBulkAnnouncementSend = async () => {
    if (selectedItems.length === 0) {
      toast.error('Please select recipients');
      return;
    }

    if (!announcementData.title || !announcementData.message) {
      toast.error('Please provide announcement title and message');
      return;
    }

    setCurrentOperation('announcement_send');
    setShowConfirmDialog(true);
  };

  const executeOperation = async () => {
    if (!currentOperation) return;

    setLoading(true);
    setShowConfirmDialog(false);

    try {
      const targetIds = selectedItems.map(item => item.id);
      let parameters: Record<string, unknown> = {};

      switch (currentOperation) {
        case 'role_change':
          parameters = { new_role: newRole };
          break;
        case 'book_update':
          parameters = { updates: bookUpdates };
          break;
        case 'announcement_send':
          parameters = { announcement: announcementData };
          break;
        default:
          parameters = {};
      }

      // Create bulk operation job
      const { data: jobId, error: createError } = await supabase
        .rpc('create_bulk_operation_job', {
          p_operation_type: currentOperation,
          p_parameters: parameters,
          p_target_ids: targetIds
        });

      if (createError) throw createError;

      toast.success('Bulk operation created successfully');

      // Process the job based on operation type
      let processError = null;
      
      if (currentOperation === 'role_change') {
        const { error } = await supabase.rpc('process_bulk_role_change', { p_job_id: jobId });
        processError = error;
      } else if (currentOperation === 'institution_activation' || currentOperation === 'institution_deactivation') {
        const { error } = await supabase.rpc('process_bulk_institution_toggle', { p_job_id: jobId });
        processError = error;
      } else if (currentOperation === 'book_update') {
        const { error } = await supabase.rpc('process_bulk_book_update', { p_job_id: jobId });
        processError = error;
      } else if (currentOperation === 'announcement_send') {
        const { error } = await supabase.rpc('process_bulk_announcement_send', { p_job_id: jobId });
        processError = error;
      }

      if (processError) throw processError;

      toast.success('Bulk operation completed successfully');
      
      // Reset form
      setSelectedItems([]);
      setNewRole('');
      setBookUpdates({ category: '', publisher: '' });
      setAnnouncementData({ title: '', message: '', priority: 'normal' });
      
      // Refresh job history
      await fetchJobHistory();

    } catch (error: unknown) {
      console.error('Error executing bulk operation:', error);
      const message = error instanceof Error ? error.message : 'Failed to execute bulk operation';
      toast.error(message);
    } finally {
      setLoading(false);
      setCurrentOperation(null);
    }
  };

  const cancelOperation = () => {
    setShowConfirmDialog(false);
    setCurrentOperation(null);
  };

  const getStatusIcon = (status: JobStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-gray-400" />;
      case 'processing':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
      default:
        return null;
    }
  };

  const getOperationLabel = (type: OperationType) => {
    const labels: Record<OperationType, string> = {
      role_change: 'Role Change',
      institution_activation: 'Institution Activation',
      institution_deactivation: 'Institution Deactivation',
      book_update: 'Book Update',
      announcement_send: 'Announcement'
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bulk Operations</h2>
        <p className="text-gray-600 mt-1">Perform bulk actions on users, books, and institutions</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            {[
              { id: 'users', label: 'Users', icon: Users },
              { id: 'institutions', label: 'Institutions', icon: Building2 },
              { id: 'books', label: 'Books', icon: BookOpen },
              { id: 'announcements', label: 'Announcements', icon: Send },
              { id: 'history', label: 'History', icon: History }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Bulk Role Change</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Change roles for multiple users at once. Selected: {selectedItems.length} users
                </p>
                
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select role...</option>
                      <option value="student">Student</option>
                      <option value="librarian">Librarian</option>
                      <option value="institution_admin">Institution Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleBulkRoleChange}
                    disabled={loading || selectedItems.length === 0}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply to {selectedItems.length} Users
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <p className="text-sm">
                  💡 Tip: Use the search and filters to select specific users, then apply bulk operations.
                </p>
                <p className="text-xs mt-1">
                  You would typically integrate this with a user list component with checkboxes.
                </p>
              </div>
            </div>
          )}

          {/* Institutions Tab */}
          {activeTab === 'institutions' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-green-900 mb-2">Bulk Activation/Deactivation</h3>
                <p className="text-sm text-green-700 mb-4">
                  Activate or deactivate multiple institutions. Selected: {selectedItems.length} institutions
                </p>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleBulkInstitutionToggle(true)}
                    disabled={loading || selectedItems.length === 0}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircle className="w-5 h-5 inline mr-2" />
                    Activate {selectedItems.length} Institutions
                  </button>
                  
                  <button
                    onClick={() => handleBulkInstitutionToggle(false)}
                    disabled={loading || selectedItems.length === 0}
                    className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-5 h-5 inline mr-2" />
                    Deactivate {selectedItems.length} Institutions
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <p className="text-sm">
                  💡 Tip: Deactivating an institution will prevent its users from accessing the library.
                </p>
              </div>
            </div>
          )}

          {/* Books Tab */}
          {activeTab === 'books' && (
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-purple-900 mb-2">Bulk Book Update</h3>
                <p className="text-sm text-purple-700 mb-4">
                  Update category or publisher for multiple books. Selected: {selectedItems.length} books
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Category (Optional)</label>
                    <input
                      type="text"
                      value={bookUpdates.category}
                      onChange={(e) => setBookUpdates({ ...bookUpdates, category: e.target.value })}
                      placeholder="e.g., Science Fiction"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Publisher (Optional)</label>
                    <input
                      type="text"
                      value={bookUpdates.publisher}
                      onChange={(e) => setBookUpdates({ ...bookUpdates, publisher: e.target.value })}
                      placeholder="e.g., Penguin Books"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                
                <button
                  onClick={handleBulkBookUpdate}
                  disabled={loading || selectedItems.length === 0}
                  className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Update {selectedItems.length} Books
                </button>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500">
                <p className="text-sm">
                  💡 Tip: Only fields with values will be updated. Leave blank to keep original values.
                </p>
              </div>
            </div>
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-orange-900 mb-2">Bulk Announcement Send</h3>
                <p className="text-sm text-orange-700 mb-4">
                  Send announcements to multiple users. Recipients: {selectedItems.length} users
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                    <input
                      type="text"
                      value={announcementData.title}
                      onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                      placeholder="Announcement title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                    <textarea
                      value={announcementData.message}
                      onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                      placeholder="Your announcement message..."
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                    <select
                      value={announcementData.priority}
                      onChange={(e) => setAnnouncementData({ ...announcementData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleBulkAnnouncementSend}
                    disabled={loading || selectedItems.length === 0}
                    className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 inline mr-2" />
                    Send to {selectedItems.length} Recipients
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Operation History</h3>
                <button
                  onClick={fetchJobHistory}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              {jobs.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No bulk operations yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map(job => (
                    <div key={job.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(job.status)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {getOperationLabel(job.operation_type)}
                              </h4>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                job.status === 'completed' ? 'bg-green-100 text-green-700' :
                                job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                                job.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {job.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(job.created_at).toLocaleString()}
                            </p>
                            
                            {/* Progress bar */}
                            {job.status === 'processing' && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>{job.processed_count} / {job.target_count}</span>
                                  <span>{job.progress_percentage}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-600 h-2 rounded-full transition-all"
                                    style={{ width: `${job.progress_percentage}%` }}
                                  />
                                </div>
                              </div>
                            )}
                            
                            {/* Results */}
                            {job.status === 'completed' && (
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="text-green-600">
                                  <CheckCircle className="w-3 h-3 inline mr-1" />
                                  {job.success_count} successful
                                </span>
                                {job.error_count > 0 && (
                                  <span className="text-red-600">
                                    <XCircle className="w-3 h-3 inline mr-1" />
                                    {job.error_count} failed
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && currentOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Bulk Operation</h3>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                You are about to perform <strong>{getOperationLabel(currentOperation)}</strong> on{' '}
                <strong>{selectedItems.length} item(s)</strong>. This action cannot be undone.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={cancelOperation}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeOperation}
                  disabled={loading}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 inline mr-2" />
                      Confirm
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
