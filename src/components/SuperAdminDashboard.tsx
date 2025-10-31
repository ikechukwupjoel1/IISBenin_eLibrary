import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Building, Plus, X } from 'lucide-react';

type Institution = {
  id: string;
  name: string;
  is_setup_complete: boolean;
  created_at: string;
  theme_settings?: { 
    tagline?: string;
    logo_url?: string;
    favicon_url?: string;
  };
};

export function SuperAdminDashboard() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for creating
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  
  // State for editing
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', tagline: '', logo_url: '', favicon_url: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set the document title for the admin page
  useEffect(() => {
    document.title = 'ArkosLIB Super Admin';
  }, []);

  const fetchInstitutions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load institutions: ' + error.message);
    } else {
      setInstitutions(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error('Institution name cannot be empty.');
      return;
    }
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc('create_institution', { new_name: newName });

    if (error) {
      toast.error(`Failed to create institution: ${error.message}`);
    } else if (data) {
      toast.success('Institution created successfully!');
      setInstitutions(prev => [data[0], ...prev]);
      setIsCreateModalOpen(false);
      setNewName('');
    }
    setIsSubmitting(false);
  };

  const openEditModal = (inst: Institution) => {
    setSelectedInstitution(inst);
    setEditFormData({
      name: inst.name,
      tagline: inst.theme_settings?.tagline || '',
      logo_url: inst.theme_settings?.logo_url || '',
      favicon_url: inst.theme_settings?.favicon_url || '',
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstitution) return;
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc('super_admin_update_institution', {
      target_institution_id: selectedInstitution.id,
      new_name: editFormData.name,
      new_tagline: editFormData.tagline,
      new_logo_url: editFormData.logo_url,
      new_favicon_url: editFormData.favicon_url,
    });

    if (error) {
      toast.error(`Failed to update institution: ${error.message}`);
    } else if (data) {
      toast.success('Institution updated successfully!');
      fetchInstitutions(); // Re-fetch all data to ensure consistency
      setIsEditModalOpen(false);
    }
    setIsSubmitting(false);
  };

  if (loading) {
    return <div>Loading institutions...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">ArkosLIB</h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-5 w-5" />
            New Institution
          </button>
        </div>

        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Setup Complete?</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {institutions.map((inst) => (
                <tr key={inst.id} onClick={() => openEditModal(inst)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-gray-900">{inst.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${inst.is_setup_complete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {inst.is_setup_complete ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(inst.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Create New Institution</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleCreateInstitution} className="space-y-4">
              <div>
                <label htmlFor="inst-name" className="block text-sm font-medium text-gray-700">Institution Name</label>
                <input id="inst-name" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Creating...' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedInstitution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Edit Institution</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleUpdateInstitution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({...editFormData, name: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Tagline</label>
                <input type="text" value={editFormData.tagline} onChange={(e) => setEditFormData({...editFormData, tagline: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                <input type="url" value={editFormData.logo_url} onChange={(e) => setEditFormData({...editFormData, logo_url: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Favicon URL</label>
                <input type="url" value={editFormData.favicon_url} onChange={(e) => setEditFormData({...editFormData, favicon_url: e.target.value})} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Updating...' : 'Update'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
