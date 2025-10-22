import { useState, useEffect } from 'react';
import { Settings, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

type Setting = {
  id: string;
  key: string;
  value: string;
  created_at: string;
};

export function LibrarySettings() {
  const [categories, setCategories] = useState<string[]>([]);
  const [shelves, setShelves] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newShelf, setNewShelf] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    
    try {
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('library_settings')
        .select('*')
        .eq('key', 'category')
        .order('value');

      if (categoriesError) {
        console.error('Error loading categories:', categoriesError);
        if (categoriesError.message && categoriesError.message.includes('Failed to fetch')) {
          toast.error('Network error: Unable to connect to server. Please check your internet connection.');
        } else if (categoriesError.code === '42P01') {
          toast.error('Settings table not found. Please run the SQL script to create it.');
        } else {
          toast.error('Error loading categories: ' + categoriesError.message);
        }
      } else if (categoriesData) {
        setCategories(categoriesData.map(item => item.value));
      }

      // Load shelves
      const { data: shelvesData, error: shelvesError } = await supabase
        .from('library_settings')
        .select('*')
        .eq('key', 'shelf')
        .order('value');

      if (shelvesError) {
        console.error('Error loading shelves:', shelvesError);
        if (!shelvesError.message.includes('Failed to fetch')) {
          toast.error('Error loading shelves: ' + shelvesError.message);
        }
      } else if (shelvesData) {
        setShelves(shelvesData.map(item => item.value));
      }
    } catch (err) {
      console.error('Unexpected error loading settings:', err);
      toast.error('Network error: Unable to connect to server. Please check your internet connection.');
    }

    setLoading(false);
  };

  const addCategory = async () => {
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    if (categories.includes(newCategory.trim())) {
      toast.error('This category already exists');
      return;
    }

    const { error } = await supabase
      .from('library_settings')
      .insert({
        key: 'category',
        value: newCategory.trim(),
      });

    if (error) {
      toast.error('Error adding category: ' + error.message);
    } else {
      toast.success('Category added successfully');
      setNewCategory('');
      loadSettings();
    }
  };

  const addShelf = async () => {
    if (!newShelf.trim()) {
      toast.error('Please enter a shelf location');
      return;
    }

    if (shelves.includes(newShelf.trim())) {
      toast.error('This shelf already exists');
      return;
    }

    const { error } = await supabase
      .from('library_settings')
      .insert({
        key: 'shelf',
        value: newShelf.trim(),
      });

    if (error) {
      toast.error('Error adding shelf: ' + error.message);
    } else {
      toast.success('Shelf added successfully');
      setNewShelf('');
      loadSettings();
    }
  };

  const deleteCategory = async (category: string) => {
    if (!confirm(`Are you sure you want to delete the category "${category}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('library_settings')
      .delete()
      .eq('key', 'category')
      .eq('value', category);

    if (error) {
      toast.error('Error deleting category: ' + error.message);
    } else {
      toast.success('Category deleted successfully');
      loadSettings();
    }
  };

  const deleteShelf = async (shelf: string) => {
    if (!confirm(`Are you sure you want to delete the shelf "${shelf}"?`)) {
      return;
    }

    const { error } = await supabase
      .from('library_settings')
      .delete()
      .eq('key', 'shelf')
      .eq('value', shelf);

    if (error) {
      toast.error('Error deleting shelf: ' + error.message);
    } else {
      toast.success('Shelf deleted successfully');
      loadSettings();
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
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-3 rounded-xl">
          <Settings className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Library Settings</h2>
          <p className="text-sm text-gray-600">Manage categories and shelf locations</p>
        </div>
      </div>

      {/* Categories Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Book Categories</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Enter new category name..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addCategory}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No categories yet. Add your first category above.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {categories.map((category) => (
                <div
                  key={category}
                  className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg border border-gray-200"
                >
                  <span className="text-gray-900">{category}</span>
                  <button
                    onClick={() => deleteCategory(category)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Tip:</strong> Categories help organize books by subject (e.g., Science, Mathematics, Fiction, etc.)
          </p>
        </div>
      </div>

      {/* Shelves Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Shelf Locations</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newShelf}
            onChange={(e) => setNewShelf(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addShelf()}
            placeholder="Enter shelf location (e.g., A1, B2, Section C)..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={addShelf}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {shelves.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No shelves yet. Add your first shelf location above.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {shelves.map((shelf) => (
                <div
                  key={shelf}
                  className="flex items-center justify-between bg-gray-50 px-4 py-2 rounded-lg border border-gray-200"
                >
                  <span className="text-gray-900">{shelf}</span>
                  <button
                    onClick={() => deleteShelf(shelf)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Tip:</strong> Shelf locations help you find physical books in the library (e.g., "Shelf A1", "Section B", "Cabinet 3")
          </p>
        </div>
      </div>
    </div>
  );
}
