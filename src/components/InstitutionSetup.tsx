import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { UploadCloud, Image } from 'lucide-react';

export function InstitutionSetup() {
  const { institution } = useAuth();
  const [institutionName, setInstitutionName] = useState(institution?.name || '');
  const [tagline, setTagline] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setLogoFile(e.target.files[0]);
  };

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFaviconFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) {
      toast.error('Institution not found. Please log in again.');
      return;
    }
    setLoading(true);

    let logoPublicUrl = '';
    let faviconPublicUrl = '';

    try {
      setUploading(true);
      // Handle Logo Upload
      if (logoFile) {
        const logoFileExt = logoFile.name.split('.').pop();
        const logoFilePath = `${institution.id}/logo.${logoFileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('institution_logos')
          .upload(logoFilePath, logoFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

        logoPublicUrl = supabase.storage.from('institution_logos').getPublicUrl(logoFilePath).data.publicUrl;
      }

      // Handle Favicon Upload
      if (faviconFile) {
        const faviconFileExt = faviconFile.name.split('.').pop();
        const faviconFilePath = `${institution.id}/favicon.${faviconFileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('institution_logos')
          .upload(faviconFilePath, faviconFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw new Error(`Favicon upload failed: ${uploadError.message}`);

        faviconPublicUrl = supabase.storage.from('institution_logos').getPublicUrl(faviconFilePath).data.publicUrl;
      }
      setUploading(false);

      // Call the RPC to update the institution details
      const { error: rpcError } = await supabase.rpc('update_institution_setup', {
        new_name: institutionName,
        new_tagline: tagline,
        new_logo_url: logoPublicUrl,
        new_favicon_url: faviconPublicUrl,
      });

      if (rpcError) throw new Error(`Failed to save details: ${rpcError.message}`);

      toast.success('Institution details saved!');
      window.location.reload();

    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800">Welcome!</h1>
          <p className="text-gray-600 mt-2">Let's set up your institution's details.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Institution Name</label>
            <input type="text" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tagline</label>
            <input type="text" value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg" placeholder='e.g., Preserving Knowledge. Inspiring Discovery' required />
          </div>
          
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <Image className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="logo-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a logo</span>
                    <input id="logo-upload" type="file" className="sr-only" onChange={handleLogoFileChange} accept="image/png, image/jpeg, image/webp" />
                  </label>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 2MB</p>
                {logoFile && <p className="text-sm text-green-600 mt-2">Selected: {logoFile.name}</p>}
              </div>
            </div>
          </div>

          {/* Favicon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Favicon</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label htmlFor="favicon-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500">
                    <span>Upload a favicon</span>
                    <input id="favicon-upload" type="file" className="sr-only" onChange={handleFaviconFileChange} accept="image/x-icon, image/png, image/svg+xml" />
                  </label>
                </div>
                <p className="text-xs text-gray-500">ICO, PNG, SVG up to 200KB</p>
                {faviconFile && <p className="text-sm text-green-600 mt-2">Selected: {faviconFile.name}</p>}
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? (uploading ? 'Uploading Files...' : 'Saving...') : 'Save and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
