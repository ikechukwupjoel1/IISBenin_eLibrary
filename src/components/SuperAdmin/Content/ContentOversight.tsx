import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  Book, AlertCircle, CheckCircle, XCircle, Search, Filter,
  Database, HardDrive, Image, FileText, TrendingUp, TrendingDown,
  Copy, Merge, Trash2, Flag, Eye, Award, BarChart3, Download
} from 'lucide-react';
import { LoadingSkeleton } from '../../ui/LoadingSkeleton';

// Types
type GlobalBook = {
  id: string;
  title: string;
  author_publisher: string;
  isbn: string | null;
  category: string | null;
  status: string;
  institution_id: string;
  institution_name: string;
  institution_active: boolean;
  total_copies: number;
  available_copies: number;
  quality_score: number;
  missing_isbn: boolean;
  missing_category: boolean;
  title_too_short: boolean;
  created_at: string;
};

type DuplicateISBN = {
  isbn: string;
  duplicate_count: number;
  institution_ids: string[];
  institution_names: string[];
  book_ids: string[];
  titles: string[];
  first_added: string;
  last_added: string;
};

type QualityMetric = {
  institution_id: string;
  institution_name: string;
  total_books: number;
  books_with_isbn: number;
  books_with_category: number;
  books_with_valid_title: number;
  books_with_author: number;
  avg_quality_score: number;
  books_with_metadata: number;
};

type StorageUsage = {
  institution_id: string;
  institution_name: string;
  total_books: number;
  total_storage_bytes: number;
  image_storage_bytes: number;
  pdf_storage_bytes: number;
  books_with_covers: number;
};

export function ContentOversight() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'duplicates' | 'quality' | 'storage'>('catalog');
  
  // Catalog state
  const [books, setBooks] = useState<GlobalBook[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  
  // Duplicates state
  const [duplicates, setDuplicates] = useState<DuplicateISBN[]>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);
  const [selectedDuplicate, setSelectedDuplicate] = useState<DuplicateISBN | null>(null);
  
  // Quality state
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetric[]>([]);
  const [qualityLoading, setQualityLoading] = useState(false);
  
  // Storage state
  const [storageUsage, setStorageUsage] = useState<StorageUsage[]>([]);
  const [storageLoading, setStorageLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'catalog') fetchGlobalCatalog();
    else if (activeTab === 'duplicates') fetchDuplicates();
    else if (activeTab === 'quality') fetchQualityMetrics();
    else if (activeTab === 'storage') fetchStorageUsage();
  }, [activeTab]);

  const fetchGlobalCatalog = async () => {
    setCatalogLoading(true);
    try {
      const { data, error } = await supabase
        .from('global_book_catalog')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setBooks(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch global catalog: ' + error.message);
    } finally {
      setCatalogLoading(false);
    }
  };

  const fetchDuplicates = async () => {
    setDuplicatesLoading(true);
    try {
      const { data, error } = await supabase
        .from('duplicate_isbns')
        .select('*')
        .order('duplicate_count', { ascending: false });

      if (error) throw error;
      setDuplicates(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch duplicates: ' + error.message);
    } finally {
      setDuplicatesLoading(false);
    }
  };

  const fetchQualityMetrics = async () => {
    setQualityLoading(true);
    try {
      const { data, error } = await supabase
        .from('book_quality_metrics')
        .select('*')
        .order('avg_quality_score', { ascending: true });

      if (error) throw error;
      setQualityMetrics(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch quality metrics: ' + error.message);
    } finally {
      setQualityLoading(false);
    }
  };

  const fetchStorageUsage = async () => {
    setStorageLoading(true);
    try {
      const { data, error } = await supabase
        .from('institution_storage_usage')
        .select('*')
        .order('total_storage_bytes', { ascending: false });

      if (error) throw error;
      setStorageUsage(data || []);
    } catch (error: any) {
      toast.error('Failed to fetch storage usage: ' + error.message);
    } finally {
      setStorageLoading(false);
    }
  };

  const runQualityCheck = async () => {
    try {
      const { error } = await supabase.rpc('auto_flag_book_quality_issues');
      if (error) throw error;
      toast.success('Quality check completed! Found issues have been flagged.');
      fetchQualityMetrics();
    } catch (error: any) {
      toast.error('Failed to run quality check: ' + error.message);
    }
  };

  const exportCatalog = () => {
    const csv = [
      ['Title', 'Author/Publisher', 'ISBN', 'Category', 'Institution', 'Quality Score', 'Issues'].join(','),
      ...filteredBooks.map(book => [
        `"${book.title}"`,
        `"${book.author_publisher}"`,
        book.isbn || 'N/A',
        book.category || 'N/A',
        `"${book.institution_name}"`,
        book.quality_score,
        [
          book.missing_isbn ? 'No ISBN' : '',
          book.missing_category ? 'No Category' : '',
          book.title_too_short ? 'Poor Title' : ''
        ].filter(Boolean).join('; ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global-book-catalog-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Catalog exported successfully');
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50';
    if (score >= 40) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getQualityIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter books
  const filteredBooks = books.filter(book => {
    const matchesSearch = searchTerm === '' || 
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author_publisher.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesInstitution = institutionFilter === 'all' || book.institution_id === institutionFilter;
    
    const matchesQuality = qualityFilter === 'all' ||
      (qualityFilter === 'high' && book.quality_score >= 80) ||
      (qualityFilter === 'medium' && book.quality_score >= 60 && book.quality_score < 80) ||
      (qualityFilter === 'low' && book.quality_score < 60);
    
    return matchesSearch && matchesInstitution && matchesQuality;
  });

  // Get unique institutions
  const institutions = Array.from(new Set(books.map(b => ({ id: b.institution_id, name: b.institution_name }))
    .map(i => JSON.stringify(i))))
    .map(i => JSON.parse(i));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-7 w-7 text-purple-600" />
            Content Oversight
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor and manage book content quality across all institutions
          </p>
        </div>
        <button
          onClick={runQualityCheck}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
        >
          <Flag className="h-5 w-5" />
          Run Quality Check
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'catalog'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Database className="h-5 w-5" />
            Global Catalog
          </button>
          <button
            onClick={() => setActiveTab('duplicates')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'duplicates'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Copy className="h-5 w-5" />
            Duplicate ISBNs ({duplicates.length})
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'quality'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Award className="h-5 w-5" />
            Quality Metrics
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            className={`px-4 py-2 font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'storage'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </button>
        </nav>
      </div>

      {/* Global Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search books..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <select
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Institutions</option>
                  {institutions.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={qualityFilter}
                  onChange={(e) => setQualityFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Quality Levels</option>
                  <option value="high">High Quality (80+)</option>
                  <option value="medium">Medium Quality (60-79)</option>
                  <option value="low">Low Quality (&lt;60)</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {filteredBooks.length} of {books.length} books
              </p>
              <button
                onClick={exportCatalog}
                className="px-3 py-1.5 text-sm bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Books Table */}
          {catalogLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISBN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBooks.map(book => (
                      <tr key={book.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{book.title}</div>
                            <div className="text-sm text-gray-500">{book.author_publisher}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {book.isbn || <span className="text-gray-400 italic">No ISBN</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {book.category || <span className="text-gray-400 italic">No category</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{book.institution_name}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getQualityIcon(book.quality_score)}
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityColor(book.quality_score)}`}>
                              {book.quality_score}/100
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {book.missing_isbn && (
                              <span className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded">No ISBN</span>
                            )}
                            {book.missing_category && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs rounded">No Category</span>
                            )}
                            {book.title_too_short && (
                              <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">Poor Title</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate ISBNs Tab */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {duplicatesLoading ? (
            <LoadingSkeleton />
          ) : duplicates.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Duplicates Found</h3>
              <p className="text-gray-600">All ISBNs in the catalog are unique.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {duplicates.map((dup, index) => (
                <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Copy className="h-5 w-5 text-orange-600" />
                        <span className="font-mono font-semibold text-gray-900">ISBN: {dup.isbn}</span>
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">
                          {dup.duplicate_count} copies
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Found in {dup.institution_names.length} institution(s): {dup.institution_names.join(', ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Book Titles:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {dup.titles.map((title, i) => (
                        <li key={i} className="text-sm text-gray-600">{title}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      First added: {new Date(dup.first_added).toLocaleDateString()} •
                      Last added: {new Date(dup.last_added).toLocaleDateString()}
                    </div>
                    <button
                      onClick={() => setSelectedDuplicate(dup)}
                      className="px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      Review
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quality Metrics Tab */}
      {activeTab === 'quality' && (
        <div className="space-y-4">
          {qualityLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid gap-4">
              {qualityMetrics.map(metric => {
                const completeness = (
                  (metric.books_with_isbn / metric.total_books * 30) +
                  (metric.books_with_category / metric.total_books * 20) +
                  (metric.books_with_valid_title / metric.total_books * 25) +
                  (metric.books_with_author / metric.total_books * 25)
                );
                
                return (
                  <div key={metric.institution_id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{metric.institution_name}</h3>
                        <p className="text-sm text-gray-600">{metric.total_books} books</p>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${getQualityColor(metric.avg_quality_score)}`}>
                        {getQualityIcon(metric.avg_quality_score)}
                        <span className="font-semibold">{metric.avg_quality_score}/100</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">With ISBN</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {metric.books_with_isbn} <span className="text-sm text-gray-500">({Math.round(metric.books_with_isbn / metric.total_books * 100)}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">With Category</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {metric.books_with_category} <span className="text-sm text-gray-500">({Math.round(metric.books_with_category / metric.total_books * 100)}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Valid Title</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {metric.books_with_valid_title} <span className="text-sm text-gray-500">({Math.round(metric.books_with_valid_title / metric.total_books * 100)}%)</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">With Author</div>
                        <div className="text-lg font-semibold text-gray-900">
                          {metric.books_with_author} <span className="text-sm text-gray-500">({Math.round(metric.books_with_author / metric.total_books * 100)}%)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-600">Data Completeness</span>
                        <span className="font-medium">{Math.round(completeness)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            completeness >= 80 ? 'bg-green-600' :
                            completeness >= 60 ? 'bg-yellow-600' :
                            'bg-red-600'
                          }`}
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Storage Usage Tab */}
      {activeTab === 'storage' && (
        <div className="space-y-4">
          {storageLoading ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid gap-4">
              {storageUsage.map(usage => (
                <div key={usage.institution_id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">{usage.institution_name}</h3>
                      <p className="text-sm text-gray-600">{usage.total_books} books</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">{formatBytes(usage.total_storage_bytes)}</div>
                      <div className="text-sm text-gray-600">Total Storage</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="text-sm text-gray-600">Images</div>
                        <div className="font-semibold text-gray-900">{formatBytes(usage.image_storage_bytes)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600">PDFs</div>
                        <div className="font-semibold text-gray-900">{formatBytes(usage.pdf_storage_bytes)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Book className="h-5 w-5 text-orange-600" />
                      <div>
                        <div className="text-sm text-gray-600">With Covers</div>
                        <div className="font-semibold text-gray-900">{usage.books_with_covers}</div>
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
  );
}
