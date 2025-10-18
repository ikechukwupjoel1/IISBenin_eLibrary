import React, { useEffect, useState } from 'react';
import { Monitor, BookOpen, Download, ExternalLink, Search, Filter, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MaterialViewer } from './MaterialViewer';

type DigitalMaterial = {
  id: string;
  title: string;
  author_publisher: string;
  category: string;
  material_type: string;
  class_specific: string;
  isbn: string;
  created_at: string;
};

export function DigitalLibrary() {
  const { profile } = useAuth();
  const [materials, setMaterials] = useState<DigitalMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ebook' | 'electronic_material'>('all');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState('');

  useEffect(() => {
    loadMaterials();
  }, [profile]);

  const loadMaterials = async () => {
    setLoading(true);

    let query = supabase
      .from('books')
      .select('*')
      .in('material_type', ['ebook', 'electronic_material'])
      .order('created_at', { ascending: false });

    if (profile?.role === 'student') {
      const studentGradeLevel = await getStudentGradeLevel();

      query = query.or(`class_specific.is.null,class_specific.eq.,class_specific.eq.${studentGradeLevel}`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setMaterials(data as any);
    }
    setLoading(false);
  };

  const getStudentGradeLevel = async () => {
    if (!profile?.student_id) return '';

    const { data } = await supabase
      .from('students')
      .select('grade_level')
      .eq('id', profile.student_id)
      .maybeSingle();

    return data?.grade_level || '';
  };

  const filteredMaterials = materials.filter((material) => {
    const matchesSearch =
      material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.author_publisher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType =
      filterType === 'all' || material.material_type === filterType;

    return matchesSearch && matchesType;
  });

  const getMaterialIcon = (type: string) => {
    return type === 'ebook' ? BookOpen : Monitor;
  };

  const getMaterialTypeLabel = (type: string) => {
    return type === 'ebook' ? 'eBook' : 'Electronic Material';
  };

  const handleAccessMaterial = (url: string, title: string) => {
    if (!url) return;

    if (profile?.role === 'student') {
      setViewerUrl(url);
      setViewerTitle(title);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
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

      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search digital materials..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="ebook">eBooks</option>
              <option value="electronic_material">Electronic Materials</option>
            </select>
          </div>
        </div>
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Monitor className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Digital Materials Found</h3>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'No digital materials available yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => {
            const Icon = getMaterialIcon(material.material_type);

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
                      <p className="text-sm text-gray-600 mt-1">{material.author_publisher}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {material.category && (
                      <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                        {material.category}
                      </span>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                        {getMaterialTypeLabel(material.material_type)}
                      </span>

                      {material.class_specific && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                          {material.class_specific}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleAccessMaterial(material.isbn, material.title)}
                    disabled={!material.isbn}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {profile?.role === 'student' ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    <span>
                      {profile?.role === 'student'
                        ? (material.material_type === 'ebook' ? 'View eBook' : 'View Material')
                        : (material.material_type === 'ebook' ? 'Read eBook' : 'Access Material')
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
