import React, { useEffect, useState } from 'react';
import { Plus, Search, CreditCard as Edit2, Trash2, X, Filter, Upload, Link } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase, type Book } from '../lib/supabase';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function BookManagement() {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
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

  // Predefined category options
  const categoryOptions = [
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
    'Science eBook',
    'Mathematics eBook',
    'History eBook',
    'Literature eBook',
    'Science Electronic Material',
    'Mathematics Electronic Material',
    'History Electronic Material',
    'Other',
  ];

  useEffect(() => {
    loadBooks();
    loadSettings();
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
      setUploading(true);

      try {
        const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('ebooks')
          .upload(fileName, selectedFile);

        if (uploadError) {
          toast.error('Error uploading file: ' + uploadError.message);
          setUploading(false);
          return;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('ebooks')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      } catch (error) {
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
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
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
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Book Management</h2>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Book
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title, author/publisher, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
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
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(book.id)}
                          className="text-red-600 hover:text-red-800"
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

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                {editingBook ? 'Edit Book' : 'Add New Book'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author/Publisher</label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                <input
                  type="text"
                  value={formData.isbn}
                  onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const newCategory = e.target.value;
                    const lowerCategory = newCategory.toLowerCase();
                    
                    // Auto-detect material type based on category
                    let materialType = 'book'; // default
                    if (lowerCategory.includes('ebook') || lowerCategory.includes('e-book')) {
                      materialType = 'ebook';
                    } else if (lowerCategory.includes('electronic')) {
                      materialType = 'electronic_material';
                    } else if (lowerCategory.includes('digital') || lowerCategory.includes('online')) {
                      materialType = 'ebook';
                    }
                    
                    setFormData({ ...formData, category: newCategory, material_type: materialType });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a category</option>
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Material Type
                  {formData.category && (formData.category.toLowerCase().includes('ebook') || 
                   formData.category.toLowerCase().includes('electronic')) && (
                    <span className="ml-2 text-xs text-green-600">✓ Auto-detected from category</span>
                  )}
                </label>
                <select
                  value={formData.material_type}
                  onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="book">📚 Physical Book</option>
                  <option value="ebook">📱 eBook</option>
                  <option value="electronic_material">💻 Electronic Material</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.material_type === 'book' 
                    ? 'Physical books need shelf location and ISBN'
                    : 'Digital materials need a URL in the ISBN field'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reading Level</label>
                <select
                  value={formData.reading_level}
                  onChange={(e) => setFormData({ ...formData, reading_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Reading Level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  This helps students find books appropriate for their reading skill level
                </p>
              </div>

              {(formData.material_type === 'ebook' || formData.material_type === 'electronic_material') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Class Specific (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.class_specific}
                      onChange={(e) => setFormData({ ...formData, class_specific: e.target.value })}
                      placeholder="e.g., JSS1, JSS2, SS3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave blank for all students, or specify a class (e.g., JSS1, SS2)
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Method
                    </label>
                    <div className="flex gap-4 mb-3">
                      <button
                        type="button"
                        onClick={() => setUploadMethod('url')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                          uploadMethod === 'url'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Link className="h-4 w-4" />
                        URL/Link
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMethod('file')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                          uploadMethod === 'file'
                            ? 'bg-blue-50 border-blue-500 text-blue-700'
                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <Upload className="h-4 w-4" />
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Enter the URL to the digital material
                        </p>
                      </>
                    ) : (
                      <>
                        <input
                          type="file"
                          accept=".pdf,.epub,.doc,.docx,.txt"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        {selectedFile && (
                          <p className="mt-1 text-xs text-green-600">
                            Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Upload PDF, EPUB, DOC, DOCX or TXT files (max 50MB)
                        </p>
                      </>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Page Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.page_number}
                      onChange={(e) => setFormData({ ...formData, page_number: e.target.value })}
                      placeholder="e.g., 245 pages"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Number of pages in the digital material
                    </p>
                  </div>
                </>
              )}

              {formData.material_type === 'book' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Copies</label>
                      <input
                        type="number"
                        min="1"
                        value={formData.total_copies}
                        onChange={(e) => setFormData({ ...formData, total_copies: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Available</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.available_copies}
                        onChange={(e) => setFormData({ ...formData, available_copies: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="new">New</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                      <option value="damaged">Damaged</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location (Shelf) *</label>
                    <select
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : (editingBook ? 'Update' : 'Add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
