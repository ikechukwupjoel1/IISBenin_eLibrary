import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, Upload, Link, BookPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, type Book } from '../lib/supabase';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { BulkBookUpload } from './BulkBookUpload';

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddingBook, setIsAddingBook] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [shelves, setShelves] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    isbn: '',
    category: '',
    total_copies: 1,
    available_copies: 1,
    condition: 'good',
    location: '',
    barcode: '',
    material_type: 'book',
    is_ebook: false,
    class_specific: '',
    recommended_grade_levels: [] as string[],
    reading_level: '',
    page_number: '',
  });
  const [uploadMethod, setUploadMethod] = useState<'url' | 'file'>('url');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Category options based on material type
  const physicalBookCategories = [
    'Fiction',
    'Non-Fiction',
    'Science',
    'Mathematics',
    'History',
    'Geography',
    'Literature',
    'English Language',
    'Biology',
    'Chemistry',
    'Physics',
    'Computer Science',
    'Art & Design',
    'Music',
    'Physical Education',
    'Religious Studies',
    'Social Studies',
    'Economics',
    'Commerce',
    'Accounting',
    'Agricultural Science',
    'Technical Drawing',
    'Home Economics',
    'French Language',
    'Reference',
    'Dictionary',
    'Encyclopedia',
    'Other',
  ];

  const ebookCategories = [
    'Science eBook',
    'Mathematics eBook',
    'History eBook',
    'Literature eBook',
    'English Language eBook',
    'Biology eBook',
    'Chemistry eBook',
    'Physics eBook',
    'Computer Science eBook',
    'Geography eBook',
    'Fiction eBook',
    'Non-Fiction eBook',
    'Other eBook',
  ];

  const electronicMaterialCategories = [
    'Science Electronic Material',
    'Mathematics Electronic Material',
    'History Electronic Material',
    'Computer Science Electronic Material',
    'English Language Electronic Material',
    'Biology Electronic Material',
    'Chemistry Electronic Material',
    'Physics Electronic Material',
    'Educational Video',
    'Interactive Learning Module',
    'Audio Book',
    'Other Electronic Material',
  ];

  // Get categories based on current material type
  const getCategoryOptions = () => {
    switch (formData.material_type) {
      case 'ebook':
        return ebookCategories;
      case 'electronic_material':
        return electronicMaterialCategories;
      case 'book':
      default:
        return physicalBookCategories;
    }
  };

  useEffect(() => {
    loadBooks();
    loadSettings();
    
    // Set up real-time subscription for books table
    const channel = supabase
      .channel('books-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'books',
        },
        (payload) => {
          console.log('📚 Book changed:', payload);
          // Reload books when any change occurs
          loadBooks();
        }
      )
      .subscribe((status) => {
        console.log('📡 Books subscription status:', status);
      });
    
    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadSettings = async () => {
    try {
      // Load categories
      const { data: categoriesData } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'category')
        .order('value');

      if (categoriesData) {
        setCategories(categoriesData.map(item => item.value));
      }

      // Load shelves
      const { data: shelvesData } = await supabase
        .from('library_settings')
        .select('value')
        .eq('key', 'shelf')
        .order('value');

      if (shelvesData) {
        setShelves(shelvesData.map(item => item.value));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to hardcoded values if table doesn't exist
      setCategories(['Fiction', 'Non-Fiction', 'Science', 'Mathematics', 'History']);
      setShelves(['Shelf A1', 'Shelf A2', 'Shelf B1', 'Shelf B2']);
    }
  };

  const loadBooks = async () => {
    const { data, error } = await supabase
      .from('books')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBooks(data);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch =
      book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.isbn?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      book.category?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' || book.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || book.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const allCategories = ['all', ...categories];
  const statuses = ['all', 'available', 'borrowed'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let fileUrl = formData.isbn;

    // Handle file upload for digital materials
    if ((formData.material_type === 'ebook' || formData.material_type === 'electronic_material') &&
        uploadMethod === 'file' &&
        selectedFile &&
        !editingBook) {
      
      // Check file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (selectedFile.size > maxSize) {
        toast.error('File too large! Maximum size is 50MB. Please compress the file or use a URL instead.');
        return;
      }

      setUploading(true);
      const uploadToast = toast.loading(`Uploading ${selectedFile.name}... Please wait.`);

      try {
        const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        
        console.log('📤 Uploading file:', fileName, 'Size:', (selectedFile.size / 1024 / 1024).toFixed(2), 'MB');
        
        const { error: uploadError } = await supabase.storage
          .from('ebooks')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.dismiss(uploadToast);
          toast.error('Error uploading file: ' + uploadError.message);
          setUploading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('ebooks')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
        console.log('✅ File uploaded successfully:', publicUrl);
        toast.dismiss(uploadToast);
        toast.success('File uploaded successfully!');
      } catch (error) {
        console.error('Upload exception:', error);
        toast.dismiss(uploadToast);
        toast.error('Error uploading file');
        setUploading(false);
        return;
      }

      setUploading(false);
    }

    // Only submit columns that exist in the database
    const dataToSubmit = {
      title: formData.title,
      author: formData.author,
      isbn: fileUrl,
      category: formData.category || null,
      status: 'available',
      material_type: formData.material_type,
      page_number: formData.page_number || null,
    };

    // Debug logging
    console.log('📝 Form Data:', formData);
    console.log('📤 Submitting to database:', dataToSubmit);
    console.log('🏷️ Material Type:', formData.material_type);

    if (editingBook) {
      const { error } = await supabase
        .from('books')
        .update(dataToSubmit)
        .eq('id', editingBook.id);

      if (error) {
        console.error('Error updating book:', error);
        toast.error('Error updating book: ' + error.message);
      } else {
        toast.success('Book updated successfully');
        loadBooks();
        closeModal();
      }
    } else {
      const { error } = await supabase
        .from('books')
        .insert([dataToSubmit]);

      if (error) {
        console.error('Error adding book:', error);
        toast.error('Error adding book: ' + error.message);
      } else {
        toast.success('Book added successfully');
        loadBooks();
        closeModal();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this book?')) {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', id);

      if (!error) {
        loadBooks();
      }
    }
  };

  const openModal = (book?: Book) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author,
        isbn: book.isbn || '',
        category: book.category || '',
        total_copies: 1,
        available_copies: 1,
        condition: 'good',
        location: '',
        barcode: '',
        material_type: book.material_type || 'book',
        is_ebook: false,
        class_specific: '',
        recommended_grade_levels: [],
        reading_level: '',
        page_number: book.page_number || '',
      });
    }
    setIsAddingBook(true);
  };

  const closeModal = () => {
    setIsAddingBook(false);
    setEditingBook(null);
    setSelectedFile(null);
    setUploadMethod('url');
    setFormData({
      title: '',
      author: '',
      isbn: '',
      category: '',
      total_copies: 1,
      available_copies: 1,
      condition: 'good',
      location: '',
      barcode: '',
      material_type: 'book',
      is_ebook: false,
      class_specific: '',
      recommended_grade_levels: [],
      reading_level: '',
      page_number: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Show EITHER form/bulk upload OR book list */}
      {!isAddingBook && !showBulkUpload ? (
        /* BOOK LIST VIEW */
        <>
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkUpload(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
          >
            <Upload className="h-5 w-5" />
            Bulk Upload
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-md hover:shadow-lg active:scale-95 min-h-[44px]"
          >
            <Plus className="h-5 w-5" />
            Add Book
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title, author/publisher, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-4 focus:ring-blue-300 focus:outline-none transition-all duration-200 min-h-[44px]"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-300 hover:shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author/Publisher</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ISBN/Pages</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBooks.map((book) => {
                const isDigital = book.category?.toLowerCase().includes('ebook') || 
                                  book.category?.toLowerCase().includes('electronic') ||
                                  book.category?.toLowerCase().includes('digital');
                
                return (
                  <tr key={book.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{book.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{book.author}</td>
                    <td className="px-6 py-4 text-sm">
                      {isDigital ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-teal-100 text-teal-700 rounded">
                          {book.category?.toLowerCase().includes('ebook') ? '📱 eBook' : '💻 Digital'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          📚 Physical
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {isDigital ? (
                        book.page_number ? (
                          <span className="text-blue-600">{book.page_number}</span>
                        ) : '-'
                      ) : (
                        book.isbn || '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{book.category || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
                        book.status === 'available'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {book.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openModal(book)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-all duration-200 active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition-all duration-200 active:scale-90 min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
        </>
      ) : (
        /* FORM/BULK UPLOAD VIEW - Replaces the list */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              {showBulkUpload ? 'Bulk Upload Books' : editingBook ? 'Edit Book' : 'Add New Book'}
            </h2>
            <button
              onClick={() => {
                if (showBulkUpload) {
                  setShowBulkUpload(false);
                } else {
                  closeModal();
                }
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ← Back to List
            </button>
          </div>

          {showBulkUpload ? (
            <BulkBookUpload 
              onComplete={() => {
                setShowBulkUpload(false);
                loadBooks();
              }} 
            />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Information Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📖 Basic Information
              </h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Enter book title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Author/Publisher *</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Enter author or publisher name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ISBN / URL</label>
                  <input
                    type="text"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Enter ISBN or URL for digital materials"
                  />
                </div>
              </div>
            </div>

            {/* Material Type & Category Section */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                🏷️ Material Type & Category
              </h4>
              
              <div className="space-y-4">
                {/* Material Type - First */}
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  formData.material_type === 'ebook' ? 'border-blue-500 bg-blue-50' : 
                  formData.material_type === 'electronic_material' ? 'border-purple-500 bg-purple-50' : 
                  'border-gray-300 bg-white'
                }`}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Material Type * (Select First)
                  </label>
                  <select
                    value={formData.material_type}
                    onChange={(e) => {
                      // Clear category when material type changes
                      setFormData({ ...formData, material_type: e.target.value, category: '' });
                    }}
                    className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold bg-white"
                    required
                  >
                    <option value="book">📚 Physical Book</option>
                    <option value="ebook">📱 eBook</option>
                    <option value="electronic_material">💻 Electronic Material</option>
                  </select>
                  <p className="mt-3 text-sm font-semibold px-3 py-2 rounded bg-gray-100 text-gray-700">
                    Current: {
                      formData.material_type === 'book' ? '📚 Physical Book (needs ISBN)' :
                      formData.material_type === 'ebook' ? '📱 eBook (needs URL/File)' :
                      '💻 Electronic Material (needs URL/File)'
                    }
                  </p>
                </div>

                {/* Category - Second (filtered by material type) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category * (Based on Material Type)
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    required
                  >
                    <option value="">Select a category</option>
                    {getCategoryOptions().map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    {formData.material_type === 'book' && 'Categories for physical books'}
                    {formData.material_type === 'ebook' && 'Categories for eBooks'}
                    {formData.material_type === 'electronic_material' && 'Categories for electronic materials'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reading Level</label>
                  <select
                    value={formData.reading_level}
                    onChange={(e) => setFormData({ ...formData, reading_level: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    <option value="">Select Reading Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    This helps students find books appropriate for their reading skill level
                  </p>
                </div>
              </div>
            </div>

          {(formData.material_type === 'ebook' || formData.material_type === 'electronic_material') && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📱 Digital Material Details
              </h4>
              
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Specific (Optional)
                </label>
                <input
                  type="text"
                  value={formData.class_specific}
                  onChange={(e) => setFormData({ ...formData, class_specific: e.target.value })}
                  placeholder="e.g., JSS1, JSS2, SS3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Leave blank for all students, or specify a class (e.g., JSS1, SS2)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Method
                </label>
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setUploadMethod('url')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      uploadMethod === 'url'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Link className="h-5 w-5" />
                    URL/Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMethod('file')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                      uploadMethod === 'file'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="h-5 w-5" />
                    Upload File
                  </button>
                </div>

                {uploadMethod === 'url' ? (
                  <>
                    <input
                      type="url"
                      value={formData.isbn}
                      onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                      placeholder="https://example.com/ebook.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Enter the URL to the digital material
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.epub,.doc,.docx,.txt"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {selectedFile && (
                      <p className="mt-2 text-sm text-green-600 font-medium">
                        ✓ Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Upload PDF, EPUB, DOC, DOCX or TXT files (max 50MB)
                    </p>
                  </>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Page Number (Optional)
                </label>
                <input
                  type="text"
                  value={formData.page_number}
                  onChange={(e) => setFormData({ ...formData, page_number: e.target.value })}
                  placeholder="e.g., 245 pages"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Number of pages in the digital material
                </p>
              </div>
              </div>
            </div>
          )}

          {formData.material_type === 'book' && (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-md font-semibold text-gray-800 mb-4 flex items-center gap-2">
                📚 Physical Book Details
              </h4>
              
              <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Copies *</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_copies}
                    onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Available Copies *</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.available_copies}
                    onChange={(e) => setFormData({ ...formData, available_copies: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Condition *</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="new">New</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                  <option value="damaged">Damaged</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location (Shelf) *</label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select shelf location</option>
                  {shelves.map((shelf) => (
                    <option key={shelf} value={shelf}>
                      {shelf}
                    </option>
                  ))}
                </select>
              </div>
              </div>
            </div>
          )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : (editingBook ? 'Update' : 'Add')}
              </button>
            </div>
          </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
