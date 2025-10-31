import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Building, Plus, X, Edit, Trash2, Eye, EyeOff, LogIn, Users, Book, Library, CheckCircle, Clock, BookUp, FileText, LogOut } from 'lucide-react';

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
  const { signOut } = useAuth();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInstitutionFeatureFlags, setNewInstitutionFeatureFlags] = useState<Record<string, boolean>>({});
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [selectedInstitutionStats, setSelectedInstitutionStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
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
  const [globalStats, setGlobalStats] = useState<{
    institutions: number;
    active_institutions: number;
    suspended_institutions: number;
    setup_complete_institutions: number;
    setup_pending_institutions: number;
    students: number;
    staff: number;
    books: number;
    total_borrows: number;
    total_book_reports: number;
  } | null>(null);

  const fetchGlobalStats = async () => {
    const { data, error } = await supabase.rpc('get_global_stats');
    if (error) toast.error('Failed to load global stats: ' + error.message);
    else setGlobalStats(data);
  };

  const fetchInstitutions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('institutions').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load institutions: ' + error.message);
    else setInstitutions(data || []);
    setLoading(false);
  };

  useEffect(() => { 
    fetchInstitutions(); 
    fetchGlobalStats();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Institution name cannot be empty.');
    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('create_institution', { 
      new_name: newName,
      feature_flags: newInstitutionFeatureFlags
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
      setSelectedInstitutionStats(data);
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

      const { data, error: rpcError } = await supabase.rpc('super_admin_update_institution', {
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

  const handleImpersonate = async () => {
    if (!selectedInstitution) return;
    if (!window.confirm(`Are you sure you want to impersonate an admin of "${selectedInstitution.name}"? Your current session will be replaced.`)) return;

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('impersonate_institution_admin', { target_institution_id: selectedInstitution.id });
      if (error) throw error;

      const { access_token, refresh_token } = data;
      await supabase.auth.setSession({ access_token, refresh_token });

      toast.success(`Now impersonating ${selectedInstitution.name}. Redirecting...`);
      window.location.href = '/';

    } catch (error) {
      toast.error(`Impersonation failed: ${(error as Error).message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (loading) return <div>Loading institutions...</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">ArkosLIB</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5" /> New Institution</button>
            <button onClick={signOut} className="flex items-center gap-2 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">
              <LogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
        
        {globalStats && (
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900">Platform Overview</h3>
            <div className="mt-2 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Institutions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><Library className="h-6 w-6 text-gray-400" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Institutions</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.institutions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Active Institutions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><CheckCircle className="h-6 w-6 text-green-500" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Active Institutions</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.active_institutions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Suspended Institutions */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><EyeOff className="h-6 w-6 text-red-500" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Suspended Institutions</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.suspended_institutions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Setup Complete */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><CheckCircle className="h-6 w-6 text-blue-500" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Setup Complete</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.setup_complete_institutions}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total Users */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><Users className="h-6 w-6 text-gray-400" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Users (S+S)</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.students + globalStats.staff}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Total Books */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><Book className="h-6 w-6 text-gray-400" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Books</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.books}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Total Borrows */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><BookUp className="h-6 w-6 text-gray-400" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Books Borrowed</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.total_borrows}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
              {/* Total Reports */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0"><FileText className="h-6 w-6 text-gray-400" /></div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">Total Book Reports</dt>
                        <dd className="text-3xl font-bold text-gray-900">{globalStats.total_book_reports}</dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setup Complete?</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {institutions.map((inst) => (
                <tr key={inst.id} onClick={() => openDetailModal(inst)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-900">{inst.name}</td>
                  <td className="px-6 py-4"><span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.is_setup_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{inst.is_setup_complete ? 'Yes' : 'No'}</span></td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(inst.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">Create New Institution</h3><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div><form onSubmit={handleCreateInstitution} className="space-y-4"><div><label htmlFor="inst-name" className="block text-sm font-medium text-gray-700">Institution Name</label><input id="inst-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required /></div><div><h4 class="text-md font-semibold text-gray-800 mb-2">Feature Toggles</h4><div class="grid grid-cols-2 gap-2">{TOGGLEABLE_FEATURES.map(feature => (<div key={feature.id} className="flex items-center"><input type="checkbox" id={`create-feature-${feature.id}`} checked={!!newInstitutionFeatureFlags[feature.id]} onChange={(e) => setNewInstitutionFeatureFlags(prev => ({ ...prev, [feature.id]: e.target.checked }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor={`create-feature-${feature.id}`} className="ml-2 text-sm text-gray-700">{feature.label}</label></div>))}</div></div><div class="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button></div></form></div></div>)}

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

            <div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={handleImpersonate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"><LogIn className="h-4 w-4"/>Impersonate</button><button type="button" onClick={() => setIsSuspendModalOpen(true)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg ${selectedInstitution.is_active ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}`}>{selectedInstitution.is_active ? <><EyeOff className="h-4 w-4"/>Suspend</> : <><Eye className="h-4 w-4"/>Reactivate</>}</button><button type="button" onClick={() => setIsDeleteModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"><Trash2 className="h-4 w-4"/>Delete</button><button type="button" onClick={() => setModalMode('edit')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Edit className="h-4 w-4"/>Edit</button></div></div>)}

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

</>
  );
}

