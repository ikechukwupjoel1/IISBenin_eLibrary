import { useEffect, useState } from 'react';
import { UserPlus, Trash2, Users, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LoadingSkeleton } from './ui/LoadingSkeleton';

type Reviewer = {
  id: string;
  staff_id: string;
  review_scope: 'all' | 'subject_specific';
  subject_areas: string[] | null;
  can_review: boolean;
  notes: string | null;
  created_at: string;
  staff_profiles: {
    full_name: string;
    role: string;
  };
};

type StaffMember = {
  id: string;
  full_name: string;
  staff_id: string;
  role: string;
};

const AVAILABLE_SUBJECTS = [
  'Science', 'Mathematics', 'English', 'History', 'Geography',
  'Physics', 'Chemistry', 'Biology', 'Literature', 'Arts',
  'Music', 'Physical Education', 'Computer Science', 'Economics', 'Sociology'
];

export function ReportReviewers() {
  const { profile } = useAuth();
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    review_scope: 'all' as 'all' | 'subject_specific',
    subject_areas: [] as string[],
    notes: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadReviewers(), loadStaff()]);
    setLoading(false);
  };

  const loadReviewers = async () => {
    const { data, error } = await supabase
      .from('report_reviewers')
      .select(`
        *,
        staff_profiles:user_profiles!report_reviewers_staff_id_fkey (
          full_name,
          role
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading reviewers:', error);
      toast.error('Failed to load reviewers');
      return;
    }

    setReviewers(data as unknown as Reviewer[]);
  };

  const loadStaff = async () => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, staff_id, role')
      .eq('role', 'staff')
      .not('staff_id', 'is', null);

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    setStaffList(data || []);
  };

  const handleAddReviewer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.staff_id) {
      toast.error('Please select a staff member');
      return;
    }

    if (formData.review_scope === 'subject_specific' && formData.subject_areas.length === 0) {
      toast.error('Please select at least one subject area');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('report_reviewers').insert({
        staff_id: formData.staff_id,
        review_scope: formData.review_scope,
        subject_areas: formData.review_scope === 'subject_specific' ? formData.subject_areas : null,
        notes: formData.notes || null,
        assigned_by: profile?.id,
        can_review: true
      });

      if (error) throw error;

      toast.success('Reviewer added successfully');
      setShowAddForm(false);
      setFormData({
        staff_id: '',
        review_scope: 'all',
        subject_areas: [],
        notes: ''
      });
      loadReviewers();
    } catch (error) {
      console.error('Error adding reviewer:', error);
      toast.error('Failed to add reviewer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveReviewer = async (reviewerId: string) => {
    if (!confirm('Are you sure you want to remove this reviewer?')) return;

    try {
      const { error } = await supabase
        .from('report_reviewers')
        .delete()
        .eq('id', reviewerId);

      if (error) throw error;

      toast.success('Reviewer removed');
      loadReviewers();
    } catch (error) {
      console.error('Error removing reviewer:', error);
      toast.error('Failed to remove reviewer');
    }
  };

  const toggleSubjectArea = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subject_areas: prev.subject_areas.includes(subject)
        ? prev.subject_areas.filter(s => s !== subject)
        : [...prev.subject_areas, subject]
    }));
  };

  // Get available staff (not already reviewers)
  const availableStaff = staffList.filter(
    staff => !reviewers.some(r => r.staff_id === staff.id)
  );

  if (loading) {
    return <LoadingSkeleton type="list" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Book Report Reviewers
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage staff who can review and approve book reports
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <UserPlus className="w-4 h-4" />
          Add Reviewer
        </button>
      </div>

      {/* Current Reviewers */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Current Reviewers ({reviewers.length})
          </h3>

          {reviewers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No reviewers assigned yet</p>
              <p className="text-sm text-gray-500 mt-1">
                Add staff members to help review book reports
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {reviewer.staff_profiles.full_name}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          reviewer.review_scope === 'all'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        }`}>
                          {reviewer.review_scope === 'all' ? 'All Reports' : 'Subject Specific'}
                        </span>
                      </div>

                      {reviewer.review_scope === 'subject_specific' && reviewer.subject_areas && (
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {reviewer.subject_areas.map((subject) => (
                              <span
                                key={subject}
                                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-xs rounded"
                              >
                                {subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {reviewer.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                          {reviewer.notes}
                        </p>
                      )}

                      <p className="text-xs text-gray-500 mt-2">
                        Added: {new Date(reviewer.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => handleRemoveReviewer(reviewer.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Reviewer Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Add Book Report Reviewer
              </h3>
            </div>

            <form onSubmit={handleAddReviewer} className="p-6 space-y-6">
              {/* Staff Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Staff Member <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.staff_id}
                  onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Select a staff member</option>
                  {availableStaff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.full_name}
                    </option>
                  ))}
                </select>
                {availableStaff.length === 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    All staff members are already assigned as reviewers
                  </p>
                )}
              </div>

              {/* Review Scope */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Scope <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.review_scope === 'all'}
                      onChange={() => setFormData({ ...formData, review_scope: 'all', subject_areas: [] })}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>All Reports</strong> - Can review any book report
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.review_scope === 'subject_specific'}
                      onChange={() => setFormData({ ...formData, review_scope: 'subject_specific' })}
                      className="w-4 h-4 text-indigo-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Subject Specific</strong> - Only reports for specific subjects
                    </span>
                  </label>
                </div>
              </div>

              {/* Subject Areas */}
              {formData.review_scope === 'subject_specific' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject Areas <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {AVAILABLE_SUBJECTS.map((subject) => (
                      <label
                        key={subject}
                        className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                          formData.subject_areas.includes(subject)
                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                            : 'border-gray-300 hover:border-gray-400 dark:border-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.subject_areas.includes(subject)}
                          onChange={() => toggleSubjectArea(subject)}
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {subject}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this reviewer's responsibilities..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setFormData({
                      staff_id: '',
                      review_scope: 'all',
                      subject_areas: [],
                      notes: ''
                    });
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || availableStaff.length === 0}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Reviewer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
