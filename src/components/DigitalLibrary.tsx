import { useEffect, useState } from 'react';
import { Monitor, BookOpen, ExternalLink, Eye } from 'lucide-react';
import { supabase, type Book } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MaterialViewer } from './MaterialViewer';
import { AdvancedBookSearch } from './AdvancedBookSearch';
import { LoadingSkeleton } from './ui/LoadingSkeleton';
import toast from 'react-hot-toast';

type DigitalMaterial = {
  id: string;
  title: string;
  author: string;
  category: string;
  material_type?: string;
  class_specific?: string;
  isbn?: string;
  file_url?: string;
  created_at: string;
};

export function DigitalLibrary() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<DigitalMaterial[]>([]);
  const [filteredMaterials, setFilteredMaterials] = useState<DigitalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');

  useEffect(() => {
    loadMaterials();
  }, [profile]);

  const loadMaterials = async () => {
    setLoading(true);

    // Query ALL books first, then filter in JavaScript for better reliability
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Filter to only include digital materials (ebook, electronic, digital in category)
      const digitalMaterials = data.filter(book => {
        const category = book.category?.toLowerCase() || '';
        return category.includes('ebook') || 
               category.includes('electronic') || 
               category.includes('digital') ||
               category.includes('e-book') ||
               category.includes('online');
      });
      
      console.log('Total books:', data.length);
      console.log('Digital materials found:', digitalMaterials.length);
      console.log('Digital categories:', digitalMaterials.map(m => m.category));
      
      setMaterials(digitalMaterials);
      setFilteredMaterials(digitalMaterials);
    } else {
      console.error('Error loading materials:', error);
    }
    setLoading(false);
  };

  const handleSearchResults = (results: Book[]) => {
    // Filter results to only include digital materials
    const digitalResults = results.filter(book => 
      book.category?.toLowerCase().includes('ebook') ||
      book.category?.toLowerCase().includes('electronic') ||
      book.category?.toLowerCase().includes('digital')
    ) as DigitalMaterial[];
    setFilteredMaterials(digitalResults);
  };

  const getMaterialIcon = (category: string) => {
    return category?.toLowerCase().includes('ebook') ? BookOpen : Monitor;
  };

  const getMaterialTypeLabel = (category: string) => {
    if (category?.toLowerCase().includes('ebook')) return 'eBook';
    if (category?.toLowerCase().includes('electronic')) return 'Electronic Material';
    return 'Digital Material';
  };

  const handleAccessMaterial = async (book: DigitalMaterial) => {
    if (!book) return;

    // If book has an isbn field with a URL, use it directly
    if (book.isbn && (book.isbn.startsWith('http://') || book.isbn.startsWith('https://'))) {
      if (profile?.role === 'student') {
        setViewerUrl(book.isbn);
        setViewerTitle(book.title);
      } else {
        window.open(book.isbn, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    // Otherwise, try to get the file from storage bucket using book ID
    const { data: storageData } = await supabase
      .storage
      .from('ebooks')
      .getPublicUrl(`${book.id}.pdf`);

    if (!storageData?.publicUrl) {
      toast.error('File not found. Please contact the librarian.');
      return;
    }

    const url = storageData.publicUrl;

    if (profile?.role === 'student') {
      setViewerUrl(url);
      setViewerTitle(book.title);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return <LoadingSkeleton type="cards" title="Digital Library" subtitle="Access eBooks and electronic materials" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-teal-100 p-3 rounded-xl">
          <Monitor className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Digital Library</h2>
          <p className="text-sm text-gray-600">Access eBooks and electronic materials</p>
        </div>
      </div>

      <AdvancedBookSearch onResults={handleSearchResults} />

      {/* Info box about digital materials */}
      <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <BookOpen className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-teal-900 mb-1">📚 About Digital Library</h4>
            <p className="text-sm text-teal-800">
              <strong>Digital materials are NOT borrowed.</strong> They are instantly accessible - just click "View" to read.
              No due dates, no returns needed. Available 24/7 for all students!
            </p>
            {profile?.role === 'librarian' && (
              <p className="text-sm text-teal-700 mt-2">
                💡 <strong>Tip:</strong> To add ebooks, use categories like "Science eBook", "Mathematics Electronic Material", etc., 
                and paste the PDF URL in the ISBN field.
              </p>
            )}
          </div>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Monitor className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Digital Materials Found</h3>
          <p className="text-gray-500 mb-4">
            {materials.length === 0 
              ? 'No eBooks or electronic materials have been uploaded yet.'
              : 'Try adjusting your search or filters'
            }
          </p>
          {profile?.role === 'librarian' && materials.length === 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4 text-left">
              <h4 className="font-semibold text-blue-900 mb-2">💡 How to add digital materials:</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Go to "Book Management" tab</li>
                <li>Click "Add New Book"</li>
                <li>Select a category containing "eBook", "Electronic", or "Digital" (e.g., "Science eBook", "Mathematics Electronic Material")</li>
                <li>In the ISBN field, paste the URL of the PDF/document</li>
                <li>Fill in other details and save</li>
              </ol>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const Icon = getMaterialIcon(material.category || '');

            return (
              <div
                key={material.id}
                className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-shadow overflow-hidden"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="bg-teal-100 p-3 rounded-lg flex-shrink-0">
                      <Icon className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 line-clamp-2">{material.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{material.author}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {material.category && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {material.category}
                      </span>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                        {getMaterialTypeLabel(material.category || '')}
                      </span>

                      {/* Don't show ISBN for digital materials since it contains the URL */}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAccessMaterial(material)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {profile?.role === 'student' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    <span>
                      {profile?.role === 'student'
                        ? (material.category?.toLowerCase().includes('ebook') ? 'View eBook' : 'View Material')
                        : (material.category?.toLowerCase().includes('ebook') ? 'Read eBook' : 'Access Material')
                      }
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {profile?.role === 'student' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Class-Specific Materials</h4>
              <p className="text-sm text-blue-700 mt-1">
                You're seeing materials available to all students and those specific to your class.
                Materials marked with a class badge are specifically curated for that grade level.
              </p>
            </div>
          </div>
        </div>
      )}

      {viewerUrl && (
        <MaterialViewer
          url={viewerUrl}
          title={viewerTitle}
          onClose={() => {
            setViewerUrl(null);
            setViewerTitle('');
          }}
        />
      )}
    </div>
  );
}
