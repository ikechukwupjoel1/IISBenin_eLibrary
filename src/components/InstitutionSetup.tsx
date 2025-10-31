import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { UploadCloud } from 'lucide-react';

export function InstitutionSetup() {
  const { institution } = useAuth();
  const [institutionName, setInstitutionName] = useState(institution?.name || '');
  const [tagline, setTagline] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution) {
      toast.error('Institution not found. Please log in again.');
      return;
    }
    setLoading(true);

    let logoPublicUrl = '';

    if (logoFile) {
      setUploading(true);
      const fileExt = logoFile.name.split('.').pop();
      const filePath = `${institution.id}/logo.${fileExt}`;

      // Upload the file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('institution_logos')
        .upload(filePath, logoFile, {
          cacheControl: '3600',
          upsert: true, // Overwrite file if it exists
        });

      setUploading(false);

      if (uploadError) {
        toast.error(`Logo upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      // Get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from('institution_logos')
        .getPublicUrl(filePath);
      
      logoPublicUrl = urlData.publicUrl;
    }

    // Call the RPC to update the institution details
    const { error: rpcError } = await supabase.rpc('update_institution_setup', {
      new_name: institutionName,
      new_tagline: tagline,
      new_logo_url: logoPublicUrl,
    });

    if (rpcError) {
      toast.error(`Failed to save details: ${rpcError.message}`);
      setLoading(false);
    } else {
      toast.success('Institution details saved!');
      // Reload the page to exit the setup flow and load new settings
      window.location.reload(); 
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
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder='e.g., Preserving Knowledge. Inspiring Discovery'
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Logo</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept="image/png, image/jpeg, image/webp" />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 2MB</p>
                {logoFile && <p className="text-sm text-green-600 mt-2">Selected: {logoFile.name}</p>}
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (uploading ? 'Uploading Logo...' : 'Saving...') : 'Save and Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
