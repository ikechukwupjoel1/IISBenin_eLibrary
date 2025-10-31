import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Building, Plus, X, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

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
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
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

  useEffect(() => { fetchInstitutions(); }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return toast.error('Institution name cannot be empty.');
    setIsSubmitting(true);
    const { data, error } = await supabase.rpc('create_institution', { new_name: newName });
    if (error) toast.error(`Failed to create institution: ${error.message}`);
    else if (data) {
      toast.success('Institution created successfully!');
      setInstitutions(prev => [data[0], ...prev]);
      setIsCreateModalOpen(false);
      setNewName('');
    }
    setIsSubmitting(false);
  };

  const openDetailModal = (inst: Institution) => {
    setSelectedInstitution(inst);
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

  if (loading) return <div>Loading institutions...</div>;

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between"><h2 className="text-2xl font-bold text-gray-900">ArkosLIB</h2><button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5" /> New Institution</button></div>
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

      {isCreateModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">Create New Institution</h3><button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div><form onSubmit={handleCreateInstitution} className="space-y-4"><div><label htmlFor="inst-name" className="block text-sm font-medium text-gray-700">Institution Name</label><input id="inst-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button></div></form></div></div>)}

      {isDetailModalOpen && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-xl max-w-lg w-full p-6"><div className="flex items-center justify-between"><h3 className="text-xl font-bold text-gray-900">{modalMode === 'view' ? 'Institution Details' : 'Edit Institution'}</h3><button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></button></div>
            
            {modalMode === 'view' && (<div className="space-y-4"><div><p className="text-sm font-medium text-gray-500">Name</p><p>{selectedInstitution.name}</p></div><div><p className="text-sm font-medium text-gray-500">Tagline</p><p>{selectedInstitution.theme_settings?.tagline || '-'}</p></div><div><p className="text-sm font-medium text-gray-500">Logo</p><img src={selectedInstitution.theme_settings?.logo_url} alt="Logo" className="mt-1 max-h-24 rounded border p-2" /></div><div><p className="text-sm font-medium text-gray-500">Favicon</p><img src={selectedInstitution.theme_settings?.favicon_url} alt="Favicon" className="mt-1 h-8 w-8 rounded border p-1" /></div><div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => alert('Suspend feature not implemented')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700"><EyeOff className="h-4 w-4"/>Suspend</button><button type="button" onClick={() => alert('Delete feature not implemented')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"><Trash2 className="h-4 w-4"/>Delete</button><button type="button" onClick={() => setModalMode('edit')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"><Edit className="h-4 w-4"/>Edit</button></div></div>)}

            {modalMode === 'edit' && (<form onSubmit={handleUpdateInstitution} className="space-y-4 mt-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700">Name</label><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required /></div><div><label className="block text-sm font-medium text-gray-700">Tagline</label><input type="text" value={editFormData.tagline} onChange={(e) => setEditFormData({...editFormData, tagline: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" /></div></div><div><label className="block text-sm font-medium text-gray-700">Logo</label><input type="file" onChange={(e) => e.target.files && setNewLogoFile(e.target.files[0])} className="w-full text-sm" accept="image/png, image/jpeg, image/webp" /></div><div><label className="block text-sm font-medium text-gray-700">Favicon</label><input type="file" onChange={(e) => e.target.files && setNewFaviconFile(e.target.files[0])} className="w-full text-sm" accept="image/x-icon, image/png, image/svg+xml" /></div><div className="border-t pt-4"><h4 className="text-md font-semibold text-gray-800 mb-2">Feature Toggles</h4><div className="grid grid-cols-2 gap-2">{TOGGLEABLE_FEATURES.map(feature => (<div key={feature.id} className="flex items-center"><input type="checkbox" id={`feature-${feature.id}`} checked={!!editFormData.feature_flags[feature.id]} onChange={(e) => setEditFormData(prev => ({ ...prev, feature_flags: { ...prev.feature_flags, [feature.id]: e.target.checked } }))} className="h-4 w-4 text-blue-600 border-gray-300 rounded" /><label htmlFor={`feature-${feature.id}`} className="ml-2 text-sm text-gray-700">{feature.label}</label></div>))}</div></div><div className="flex justify-end gap-2 pt-4 border-t"><button type="button" onClick={() => setModalMode('view')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button><button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Updating...' : 'Update'}</button></div></form>)}
