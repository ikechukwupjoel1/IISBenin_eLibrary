import React, { useEffect, useState } from 'react';
// Types for impersonation
type AdminUser = { id: string; full_name?: string; email: string; role: string; institution_id: string };
type InstitutionStats = { students: number; staff: number; books: number; borrows: number; reports: number };
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Plus, X, Edit, Trash2, Eye, EyeOff, LogIn, Search } from 'lucide-react';
import { DashboardHome } from './SuperAdmin/Dashboard/DashboardHome';
import { SystemHealth } from './SuperAdmin/Dashboard/SystemHealth';
import { PerformanceMonitor } from './SuperAdmin/Dashboard/PerformanceMonitor';
import { UserManagement } from './SuperAdmin/Users/UserManagement';

type Institution = {
  id: string;
  name: string;
  is_setup_complete: boolean;
  is_active: boolean;
  created_at: string;
  theme_settings?: { 
    tagline?: string;
    logo_url?: string;
    favicon_url?: string;
  };
  feature_flags: Record<string, boolean>;
};

const TOGGLEABLE_FEATURES = [
  { id: 'messages', label: 'Chat / Messaging' },
  { id: 'bookclubs', label: 'Book Clubs' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'challenges', label: 'Reading Challenges' },
  { id: 'reviews', label: 'Book Reviews' },
  { id: 'reservations', label: 'Book Reservations' },
];

export function SuperAdminDashboard() {
  // Analytics state
  const [analytics, setAnalytics] = useState({
    totalInstitutions: 0,
    activeInstitutions: 0,
    suspendedInstitutions: 0,
    totalUsers: 0,
    totalStaff: 0,
    totalStudents: 0,
    totalBooks: 0,
  });
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setAnalyticsLoading(true);
      try {
        // Fetch analytics data directly from tables
        const [institutionsResult, usersResult, staffResult, studentsResult, booksResult] = await Promise.all([
          supabase.from('institutions').select('id, is_active', { count: 'exact', head: true }),
          supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
          supabase.from('staff').select('id', { count: 'exact', head: true }),
          supabase.from('students').select('id', { count: 'exact', head: true }),
          supabase.from('books').select('id', { count: 'exact', head: true }),
        ]);

        // Count active and suspended institutions
        const { data: institutions } = await supabase.from('institutions').select('is_active');
        const activeCount = institutions?.filter(i => i.is_active).length || 0;
        const suspendedCount = institutions?.filter(i => !i.is_active).length || 0;

        setAnalytics({
          totalInstitutions: institutionsResult.count || 0,
          activeInstitutions: activeCount,
          suspendedInstitutions: suspendedCount,
          totalUsers: usersResult.count || 0,
          totalStaff: staffResult.count || 0,
          totalStudents: studentsResult.count || 0,
          totalBooks: booksResult.count || 0,
        });
      } catch (err) {
        console.error('Failed to load analytics:', err);
        // Don't show error toast, just keep default values
      } finally {
        setAnalyticsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Impersonation state
  const [impersonateInstitutionId, setImpersonateInstitutionId] = useState<string | null>(null);
  const [impersonateAdminId, setImpersonateAdminId] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(false);
  const [adminsByInstitution, setAdminsByInstitution] = useState<Record<string, AdminUser[]>>({});
  const [impersonationHistory, setImpersonationHistory] = useState<Array<{timestamp: string, adminName: string, adminEmail: string, institutionName: string}>>([]);


  const [activeSection, setActiveSection] = useState('dashboard');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInstitutionIds, setSelectedInstitutionIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInstitutionFeatureFlags, setNewInstitutionFeatureFlags] = useState<Record<string, boolean>>({});
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedInstitutionStats, setSelectedInstitutionStats] = useState<InstitutionStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    tagline: '',
    logo_url: '',
    favicon_url: '',
    feature_flags: {} as Record<string, boolean>,
  });
  const [newLogoFile, setNewLogoFile] = useState<File | null>(null);
  const [newFaviconFile, setNewFaviconFile] = useState<File | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInstitutions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('institutions').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load institutions: ' + error.message);
    else setInstitutions(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    fetchInstitutions();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Institution name cannot be empty.');
    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('create_institution', { 
      new_name: newName,
      new_feature_flags: newInstitutionFeatureFlags
    });
    if (error) toast.error(`Failed to create institution: ${error.message}`);
    else if (data) {
      toast.success('Institution created successfully!');
      setInstitutions(prev => [data[0], ...prev]);
      setIsCreateModalOpen(false);
      setNewName('');
      setNewInstitutionFeatureFlags({});
    }
    setIsSubmitting(false);
  };

  const fetchInstitutionStats = async (institutionId: string) => {
    setStatsLoading(true);
    setSelectedInstitutionStats(null);
    try {
      const { data, error } = await supabase.rpc('get_institution_stats', { target_institution_id: institutionId });
      if (error) throw error;
      setSelectedInstitutionStats(data as InstitutionStats);
    } catch (error) {
      toast.error('Failed to load institution stats.');
      console.error('Error fetching institution stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const openDetailModal = (inst: Institution) => {
    setSelectedInstitution(inst);
    fetchInstitutionStats(inst.id); // Fetch stats when modal opens
    setEditFormData({
      name: inst.name,
      tagline: inst.theme_settings?.tagline || '',
      logo_url: inst.theme_settings?.logo_url || '',
      favicon_url: inst.theme_settings?.favicon_url || '',
      feature_flags: inst.feature_flags || {},
    });
    setModalMode('view');
    setIsDetailModalOpen(true);
  };

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    setIsSubmitting(true);

    try {
      let logoUrl = editFormData.logo_url;
      let faviconUrl = editFormData.favicon_url;

      if (newLogoFile) {
        const fileExt = newLogoFile.name.split('.').pop();
        const filePath = `${selectedInstitution.id}/logo.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('institution_logos').upload(filePath, newLogoFile, { upsert: true });
        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);
        logoUrl = supabase.storage.from('institution_logos').getPublicUrl(filePath).data.publicUrl;
      }

      if (newFaviconFile) {
        const fileExt = newFaviconFile.name.split('.').pop();
        const filePath = `${selectedInstitution.id}/favicon.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('institution_logos').upload(filePath, newFaviconFile, { upsert: true });
        if (uploadError) throw new Error(`Favicon upload failed: ${uploadError.message}`);
        faviconUrl = supabase.storage.from('institution_logos').getPublicUrl(filePath).data.publicUrl;
      }

  const { error: rpcError } = await supabase.rpc('super_admin_update_institution', {
        target_institution_id: selectedInstitution.id,
        new_name: editFormData.name,
        new_tagline: editFormData.tagline,
        new_logo_url: logoUrl,
        new_favicon_url: faviconUrl,
        new_feature_flags: editFormData.feature_flags,
      });

      if (rpcError) throw rpcError;

      toast.success('Institution updated successfully!');
      fetchInstitutions();
      setIsDetailModalOpen(false);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSubmitting(false);
      setNewLogoFile(null);
      setNewFaviconFile(null);
    }
  };

  const handleInviteLibrarian = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution || !inviteEmail.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('create_librarian_invitation', {
        target_institution_id: selectedInstitution.id,
        invitee_email: inviteEmail.trim(),
      });

      if (error) throw error;

      const inviteToken = data;
      const inviteLink = `${window.location.origin}/accept-invitation/${inviteToken}`;
      setGeneratedInviteLink(inviteLink);

      toast.success('Invitation created successfully!');
    } catch (error) {
      toast.error(`Failed to create invitation: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!impersonateInstitutionId || !impersonateAdminId) return;
    const institution = institutions.find(i => i.id === impersonateInstitutionId);
    const admin = adminsByInstitution[impersonateInstitutionId]?.find(a => a.id === impersonateAdminId);
    if (!institution || !admin) return;
    if (!window.confirm(`Are you sure you want to impersonate ${admin.full_name || admin.email} at "${institution.name}"? Your current session will be replaced.`)) return;
    setImpersonating(true);
    try {
      const { data, error } = await supabase.rpc('impersonate_institution_admin', { target_institution_id: institution.id, target_admin_id: admin.id });
      if (error) throw error;
      const { access_token, refresh_token } = data;
      await supabase.auth.setSession({ access_token, refresh_token });
      setImpersonationHistory(prev => [
        { timestamp: new Date().toLocaleString(), adminName: admin.full_name || '', adminEmail: admin.email, institutionName: institution.name },
        ...prev
      ]);
      toast.success(`Now impersonating ${admin.full_name || admin.email} at ${institution.name}. Redirecting...`);
      window.location.href = '/';
    } catch (error) {
      toast.error(`Impersonation failed: ${(error as Error).message}`);
    } finally {
      setImpersonating(false);
    }
  };
  // Fetch institution admins when institution changes
  useEffect(() => {
    if (!impersonateInstitutionId) return;
    const fetchAdmins = async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, full_name, email, role, institution_id')
        .eq('institution_id', impersonateInstitutionId)
        .eq('role', 'admin');
      if (!error && data) {
        setAdminsByInstitution(prev => ({ ...prev, [impersonateInstitutionId]: data }));
      }
    };
    fetchAdmins();
  }, [impersonateInstitutionId]);

  const handleDeleteInstitution = async () => {
    if (!selectedInstitution) return;
    setIsSubmitting(true);
    const { error } = await supabase.rpc('delete_institution', { target_institution_id: selectedInstitution.id });
    setIsSubmitting(false);

    if (error) {
      toast.error(`Failed to delete institution: ${error.message}`);
    } else {
      toast.success('Institution deleted successfully!');
      setIsDeleteModalOpen(false);
      setIsDetailModalOpen(false);
      fetchInstitutions();
    }
  };

  const handleToggleStatus = async () => {
    if (!selectedInstitution) return;
    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('toggle_institution_status', { target_institution_id: selectedInstitution.id });
    setIsSubmitting(false);

    if (error) {
      toast.error(`Failed to update status: ${error.message}`);
    } else {
      toast.success(`Institution status updated successfully!`);
      setIsSuspendModalOpen(false);
      // Update the institution in the list locally to reflect the change immediately
      setInstitutions(prev => prev.map(inst => inst.id === data.id ? data : inst));
      setSelectedInstitution(data);
    }
  };

  const ITEMS_PER_PAGE = 10;

  if (loading) return <div>Loading institutions...</div>;

  const filteredInstitutions = institutions.filter(inst => {
    const nameMatch = inst.name.toLowerCase().includes(searchTerm.toLowerCase());

    let statusMatch = false;
    if (statusFilter === 'all') {
      statusMatch = true;
    } else if (statusFilter === 'active') {
      statusMatch = inst.is_active === true;
    } else if (statusFilter === 'suspended') {
      statusMatch = inst.is_active === false;
    } else if (statusFilter === 'pending_setup') {
      statusMatch = inst.is_setup_complete === false;
    }

    return nameMatch && statusMatch;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredInstitutions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedInstitutions = filteredInstitutions.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedInstitutionIds(paginatedInstitutions.map(inst => inst.id));
    } else {
      setSelectedInstitutionIds([]);
    }
  };

  const handleSelectInstitution = (id: string) => {
    setSelectedInstitutionIds(prev => 
      prev.includes(id) ? prev.filter(prevId => prevId !== id) : [...prev, id]
    );
  };

  const handleBulkAction = async (action: 'suspend' | 'reactivate' | 'delete') => {
    if (selectedInstitutionIds.length === 0) {
      toast.error('No institutions selected for bulk action.');
      return;
    }

    if (!window.confirm(`Are you sure you want to ${action} ${selectedInstitutionIds.length} selected institutions?`)) {
      return;
    }

    setBulkActionLoading(true);
    try {
      let error;
      if (action === 'delete') {
        ({ error } = await supabase.rpc('bulk_delete_institutions', { target_institution_ids: selectedInstitutionIds }));
      } else {
        const newStatus = action === 'reactivate';
        ({ error } = await supabase.rpc('bulk_toggle_institution_status', { target_institution_ids: selectedInstitutionIds, new_status: newStatus }));
      }

      if (error) throw error;

      toast.success(`Bulk ${action} successful for ${selectedInstitutionIds.length} institutions!`);
      setSelectedInstitutionIds([]);
      fetchInstitutions(); // Refresh the list
    } catch (err) {
      if (err instanceof Error) {
        toast.error(`Bulk action failed: ${err.message}`);
        console.error('Bulk action error:', err);
      } else {
        toast.error('Bulk action failed.');
      }
    } finally {
      setBulkActionLoading(false);
    }
  };



  // const [sidebarOpen, setSidebarOpen] = useState(false); // Duplicate, removed
  return (
    <div className="flex min-h-[80vh] relative">
      {/* Hamburger for mobile */}
      <button
        className="sm:hidden fixed top-4 left-4 z-40 bg-white border border-gray-300 rounded-full p-2 shadow-lg"
        aria-label="Open sidebar"
        onClick={() => setSidebarOpen(true)}
      >
        <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
      {/* Sidebar Navigation */}
      <nav className={`fixed inset-0 z-50 sm:static sm:z-auto sm:w-56 bg-white border-r border-gray-200 py-8 px-4 space-y-2 h-full sm:h-fit transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0`} style={{maxWidth:'16rem'}}>
        {/* Overlay for mobile */}
        <div className="sm:hidden fixed inset-0 bg-black bg-opacity-30 z-40" onClick={() => setSidebarOpen(false)} style={{display: sidebarOpen ? 'block' : 'none'}} />
        <div className="relative z-50">
          <button className="sm:hidden absolute top-2 right-2 p-2" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)}>
            <svg className="h-6 w-6 text-gray-700" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <h2 className="text-base sm:text-lg font-bold mb-6 text-blue-700">Super Admin Panel</h2>
          <ul className="space-y-2">
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('dashboard'); setSidebarOpen(false);}}>Dashboard</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'institutions' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('institutions'); setSidebarOpen(false);}}>Institution Management</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'users' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('users'); setSidebarOpen(false);}}>User Management</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'analytics' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('analytics'); setSidebarOpen(false);}}>Analytics</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'system-health' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('system-health'); setSidebarOpen(false);}}>System Health</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'performance' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('performance'); setSidebarOpen(false);}}>Performance</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'features' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('features'); setSidebarOpen(false);}}>Feature Flags</button>
            </li>
            <li>
              <button className={`w-full text-left px-3 py-2 rounded-lg font-medium transition-colors ${activeSection === 'impersonation' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`} onClick={() => {setActiveSection('impersonation'); setSidebarOpen(false);}}>Impersonation</button>
            </li>
          </ul>
        </div>
      </nav>
      {/* Main Content */}
      <div className="flex-1 px-2 sm:px-6 py-8">
        {/* Dashboard Tab */}
        {activeSection === 'dashboard' && (
          <DashboardHome 
            onCreateInstitution={() => {
              setActiveSection('institutions');
              setIsCreateModalOpen(true);
            }}
            onInviteLibrarian={() => {
              setActiveSection('institutions');
            }}
            onViewAnalytics={() => {
              setActiveSection('analytics');
            }}
            onOpenSettings={() => {
              setActiveSection('features');
            }}
          />
        )}

        {/* Institution Management Tab */}
        {activeSection === 'institutions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900">Institution Management</h2>
              <div className="flex items-center gap-4">
                <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5" /> New Institution</button>
              </div>
            </div>
            {/* ...existing filter/search/bulk actions/table code... */}
            {/* Filter, Search, and Bulk Actions Controls */}
            <div className="bg-white p-4 rounded-lg shadow flex flex-col sm:flex-row items-center gap-4">
              <div className="relative flex-grow w-full sm:w-auto">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 pl-10 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div className="w-full sm:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_setup">Pending Setup</option>
                </select>
              </div>
              {selectedInstitutionIds.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <select
                    onChange={(e) => handleBulkAction(e.target.value as 'suspend' | 'reactivate' | 'delete')}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    defaultValue=""
                    disabled={bulkActionLoading}
                  >
                    <option value="" disabled>Bulk Actions ({selectedInstitutionIds.length})</option>
                    <option value="reactivate">Reactivate Selected</option>
                    <option value="suspend">Suspend Selected</option>
                    <option value="delete">Delete Selected</option>
                  </select>
                  {bulkActionLoading && <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>}
                </div>
              )}
            </div>
            {/* ...existing table and pagination code... */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
              {/* Responsive Table: flex on mobile, table on sm+ */}
              <div className="hidden sm:block">
                <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12"><input type="checkbox" onChange={handleSelectAll} checked={selectedInstitutionIds.length === paginatedInstitutions.length && paginatedInstitutions.length > 0} className="rounded text-blue-600" /></th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setup Complete?</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th></tr></thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedInstitutions.length > 0 ? (
                      paginatedInstitutions.map((inst) => (
                        <tr key={inst.id} className="hover:bg-gray-50 cursor-pointer">
                          <td className="px-6 py-4"><input type="checkbox" checked={selectedInstitutionIds.includes(inst.id)} onChange={() => handleSelectInstitution(inst.id)} onClick={(e) => e.stopPropagation()} className="rounded text-blue-600" /></td>
                          <td className="px-6 py-4 font-medium text-gray-900" onClick={() => openDetailModal(inst)}>{inst.name}</td>
                          <td className="px-6 py-4" onClick={() => openDetailModal(inst)}><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{inst.is_active ? 'Active' : 'Suspended'}</span></td>
                          <td className="px-6 py-4" onClick={() => openDetailModal(inst)}><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.is_setup_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inst.is_setup_complete ? 'Yes' : 'No'}</span></td>
                          <td className="px-6 py-4 text-sm text-gray-500" onClick={() => openDetailModal(inst)}>{new Date(inst.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-12 text-gray-500">
                          No institutions match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* Mobile stacked layout */}
              <div className="sm:hidden divide-y divide-gray-200">
                {paginatedInstitutions.length > 0 ? (
                  paginatedInstitutions.map((inst) => (
                    <div key={inst.id} className="flex flex-col gap-2 px-4 py-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{inst.name}</span>
                        <input type="checkbox" checked={selectedInstitutionIds.includes(inst.id)} onChange={() => handleSelectInstitution(inst.id)} onClick={e => e.stopPropagation()} className="rounded text-blue-600 w-6 h-6" />
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className={`px-2 inline-flex font-semibold rounded-full ${inst.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{inst.is_active ? 'Active' : 'Suspended'}</span>
                        <span className={`px-2 inline-flex font-semibold rounded-full ${inst.is_setup_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inst.is_setup_complete ? 'Yes' : 'No'}</span>
                        <span className="text-gray-500">{new Date(inst.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-gray-500">No institutions match the current filters.</div>
                )}
              </div>
              {/* Pagination Controls */}
              <div className="p-4 border-t flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{Math.min(startIndex + 1, filteredInstitutions.length)}</span> to <span className="font-medium">{Math.min(startIndex + ITEMS_PER_PAGE, filteredInstitutions.length)}</span> of {' '}
                    <span className="font-medium">{filteredInstitutions.length}</span> results
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => goToPage(currentPage - 1)} 
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">Page {currentPage} of {totalPages > 0 ? totalPages : 1}</span>
                  <button 
                    onClick={() => goToPage(currentPage + 1)} 
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeSection === 'users' && (
          <UserManagement />
        )}

        {/* Analytics Tab */}
        {activeSection === 'analytics' && (
          <div>
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 mb-4">Analytics</h2>
          <div className="bg-white rounded-lg shadow p-6 text-gray-700">
            {analyticsLoading ? (
              <div>Loading analytics...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">{analytics.totalInstitutions}</div>
                  <div className="text-gray-700">Total Institutions</div>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{analytics.activeInstitutions}</div>
                  <div className="text-gray-700">Active Institutions</div>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-700">{analytics.suspendedInstitutions}</div>
                  <div className="text-gray-700">Suspended Institutions</div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-700">{analytics.totalUsers}</div>
                  <div className="text-gray-700">Total Users</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-700">{analytics.totalStaff}</div>
                  <div className="text-gray-700">Total Staff</div>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="text-2xl font-bold text-pink-700">{analytics.totalStudents}</div>
                  <div className="text-gray-700">Total Students</div>
                </div>
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <div className="text-2xl font-bold text-indigo-700">{analytics.totalBooks}</div>
                  <div className="text-gray-700">Total Books</div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* System Health Tab */}
        {activeSection === 'system-health' && (
          <div>
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 mb-6">System Health</h2>
            <SystemHealth />
          </div>
        )}

        {/* Performance Tab */}
        {activeSection === 'performance' && (
          <div>
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 mb-6">Performance Monitoring</h2>
            <PerformanceMonitor />
          </div>
        )}

        {/* Feature Flags Tab */}
        {activeSection === 'features' && (
          <div>
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 mb-4">Feature Flags</h2>
          <div className="bg-white rounded-lg shadow p-6 text-gray-700 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                  {TOGGLEABLE_FEATURES.map(f => (
                    <th key={f.id} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {institutions.map(inst => (
                  <tr key={inst.id}>
                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">{inst.name}</td>
                    {TOGGLEABLE_FEATURES.map(f => (
                      <td key={f.id} className="px-4 py-2">
                        <input
                          type="checkbox"
                          checked={!!inst.feature_flags?.[f.id]}
                          onChange={async (e) => {
                            const newFlags = { ...inst.feature_flags, [f.id]: e.target.checked };
                            const { error } = await supabase
                              .from('institutions')
                              .update({ feature_flags: newFlags })
                              .eq('id', inst.id);
                            if (error) {
                              toast.error('Failed to update feature flag');
                            } else {
                              setInstitutions(prev => prev.map(i => i.id === inst.id ? { ...i, feature_flags: newFlags } : i));
                              toast.success('Feature flag updated');
                            }
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Impersonation Tab */}
        {activeSection === 'impersonation' && (
          <div>
            <h2 className="text-base sm:text-lg md:text-2xl font-bold text-gray-900 mb-4">Impersonation</h2>
          <div className="bg-white rounded-lg shadow p-6 text-gray-700">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Institution</label>
              <select
                className="border rounded px-2 py-1 w-full"
                value={impersonateInstitutionId || ''}
                onChange={e => setImpersonateInstitutionId(e.target.value)}
              >
                <option value="">-- Select Institution --</option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            {impersonateInstitutionId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Admin</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={impersonateAdminId || ''}
                  onChange={e => setImpersonateAdminId(e.target.value)}
                >
                  <option value="">-- Select Admin --</option>
                  {adminsByInstitution[impersonateInstitutionId]?.map(admin => (
                    <option key={admin.id} value={admin.id}>{admin.full_name || admin.email}</option>
                  ))}
                </select>
              </div>
            )}
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              disabled={!impersonateInstitutionId || !impersonateAdminId || impersonating}
              onClick={handleImpersonate}
            >
              {impersonating ? 'Impersonating...' : 'Impersonate'}
            </button>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Impersonation History</h3>
              <ul className="list-disc pl-5 text-sm">
                {impersonationHistory.length === 0 && <li>No impersonation actions yet.</li>}
                {impersonationHistory.map((entry, idx) => (
                  <li key={idx}>
                    {entry.timestamp}: Impersonated {entry.adminName} ({entry.adminEmail}) at {entry.institutionName}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ...existing modals remain unchanged... */}

      {/* Modals - must be inside main div for valid JSX */}
      {isCreateModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">Create New Institution</h3><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div><form onSubmit={handleCreateInstitution} className="space-y-4"><div><label htmlFor="inst-name" className="block text-sm font-medium text-gray-700">Institution Name</label><input id="inst-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required /></div><div><h4 className="text-md font-semibold text-gray-800 mb-2">Feature Toggles</h4><div className="grid grid-cols-2 gap-2">{TOGGLEABLE_FEATURES.map(feature => (<div key={feature.id} className="flex items-center"><input type="checkbox" id={`create-feature-${feature.id}`} checked={!!newInstitutionFeatureFlags[feature.id]} onChange={(e) => setNewInstitutionFeatureFlags(prev => ({ ...prev, [feature.id]: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor={`create-feature-${feature.id}`} className="ml-2 text-sm text-gray-700">{feature.label}</label></div>))}</div></div><div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button></div></form></div></div>)}

      {isDetailModalOpen && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl max-w-lg w-full p-6"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">{modalMode === 'view' ? 'Institution Details' : 'Edit Institution'}</h3><button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div>
            
            {modalMode === 'view' && (<div className="space-y-4"><div><p className="text-sm font-medium text-gray-500">Name</p><p>{selectedInstitution.name}</p></div><div><p className="text-sm font-medium text-gray-500">Status</p><p><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedInstitution.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{selectedInstitution.is_active ? 'Active' : 'Suspended'}</span></p></div><div><p className="text-sm font-medium text-gray-500">Tagline</p><p>{selectedInstitution.theme_settings?.tagline || '-'}</p></div><div><p className="text-sm font-medium text-gray-500">Logo</p><img src={selectedInstitution.theme_settings?.logo_url} alt="Logo" className="mt-1 max-h-24 rounded border p-2" /></div><div><p className="text-sm font-medium text-gray-500">Favicon</p><img src={selectedInstitution.theme_settings?.favicon_url} alt="Favicon" className="mt-1 h-8 w-8 rounded border p-1" /></div>

            <div className="border-t pt-4">
              <h4 className="text-md font-semibold text-gray-800 mb-2">Institution Stats</h4>
              {statsLoading && <p>Loading stats...</p>}
              {selectedInstitutionStats && !statsLoading && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedInstitutionStats.students}</p>
                    <p className="text-gray-500">Students</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedInstitutionStats.staff}</p>
                    <p className="text-gray-500">Staff</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedInstitutionStats.books}</p>
                    <p className="text-gray-500">Books</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900">{selectedInstitutionStats.borrows}</p>
                    <p className="text-gray-500">Books Borrowed</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                    <p className="font-medium text-gray-900">{selectedInstitutionStats.reports}</p>
                    <p className="text-gray-500">Book Reports</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"><Plus className="h-4 w-4"/>Invite Librarian</button><button type="button" onClick={handleImpersonate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"><LogIn className="h-4 w-4"/>Impersonate</button><button type="button" onClick={() => setIsSuspendModalOpen(true)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${selectedInstitution.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{selectedInstitution.is_active ? <><EyeOff className="h-4 w-4"/>Suspend</> : <><Eye className="h-4 w-4"/>Reactivate</>}</button><button type="button" onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"><Trash2 className="h-4 w-4"/>Delete</button><button type="button" onClick={() => setModalMode('edit')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Edit className="h-4 w-4"/>Edit</button></div></div>)}

            {modalMode === 'edit' && (<form onSubmit={handleUpdateInstitution} className="space-y-4 mt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Name</label><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required /></div><div><label className="block text-sm font-medium text-gray-700">Tagline</label><input type="text" value={editFormData.tagline} onChange={(e) => setEditFormData({...editFormData, tagline: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div><label className="block text-sm font-medium text-gray-700">Logo</label><input type="file" onChange={(e) => e.target.files && setNewLogoFile(e.target.files[0])} className="w-full text-sm" accept="image/png, image/jpeg, image/webp" /></div><div><label className="block text-sm font-medium text-gray-700">Favicon</label><input type="file" onChange={(e) => e.target.files && setNewFaviconFile(e.target.files[0])} className="w-full text-sm" accept="image/x-icon, image/png, image/svg+xml" /></div><div className="border-t pt-4"><h4 className="text-md font-semibold text-gray-800 mb-2">Feature Toggles</h4><div className="grid grid-cols-2 gap-2">{TOGGLEABLE_FEATURES.map(feature => (<div key={feature.id} className="flex items-center"><input type="checkbox" id={`feature-${feature.id}`} checked={!!editFormData.feature_flags[feature.id]} onChange={(e) => setEditFormData(prev => ({ ...prev, feature_flags: { ...prev.feature_flags, [feature.id]: e.target.checked } }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor={`feature-${feature.id}`} className="ml-2 text-sm text-gray-700">{feature.label}</label></div>))}</div></div>
<div className="flex justify-end gap-2 pt-4 border-t">
    <button type="button" onClick={() => setModalMode('view')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
    <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Updating...' : 'Save Changes'}</button>
</div>
</form>)}
        </div>
      </div>
    )}

    {isDeleteModalOpen && selectedInstitution && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
          <p>Are you sure you want to delete the institution "{selectedInstitution.name}"? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleDeleteInstitution} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    )}

    {isSuspendModalOpen && selectedInstitution && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
          <h3 className="text-xl font-bold text-gray-900">Confirm Action</h3>
          <p>Are you sure you want to {selectedInstitution.is_active ? 'suspend' : 'reactivate'} the institution "{selectedInstitution.name}"?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsSuspendModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
            <button onClick={handleToggleStatus} disabled={isSubmitting} className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${selectedInstitution.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'} disabled:opacity-50`}>
              {isSubmitting ? 'Updating...' : (selectedInstitution.is_active ? 'Suspend' : 'Reactivate')}
            </button>
          </div>
        </div>
      </div>
    )}

    {isInviteModalOpen && selectedInstitution && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">Invite Librarian</h3>
            <button onClick={() => { setIsInviteModalOpen(false); setInviteEmail(''); setGeneratedInviteLink(null); }} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {!generatedInviteLink ? (
            <form onSubmit={handleInviteLibrarian} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="librarian@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  An invitation link will be generated for this email address.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsInviteModalOpen(false); setInviteEmail(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Invitation'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Invitation link created successfully!
                </p>
                <div className="bg-white border border-green-300 rounded p-2 mb-2 break-all text-xs font-mono">
                  {generatedInviteLink}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedInviteLink);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Copy Link
                </button>
              </div>
              <p className="text-xs text-gray-600">
                Share this link with the librarian. They can use it to create their account for "{selectedInstitution.name}". The link expires in 7 days.
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => { setIsInviteModalOpen(false); setInviteEmail(''); setGeneratedInviteLink(null); }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
  );
}

