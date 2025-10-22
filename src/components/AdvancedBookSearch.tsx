import { useEffect, useState } from 'react';
import { Search, Filter, X, SortAsc, SortDesc } from 'lucide-react';
import { supabase, type Book } from '../lib/supabase';

type FilterOptions = {
  searchTerm: string;
  category: string;
  materialType: string;
  availability: string;
  sortBy: 'title' | 'author' | 'newest' | 'popular' | 'rating';
  sortOrder: 'asc' | 'desc';
};

type AdvancedSearchProps = {
  onResults: (books: Book[]) => void;
  onFilterChange?: (filters: FilterOptions) => void;
};

export function AdvancedBookSearch({ onResults, onFilterChange }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    category: 'all',
    materialType: 'all',
    availability: 'all',
    sortBy: 'title',
    sortOrder: 'asc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    performSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('library_settings')
      .select('value')
      .eq('key', 'category')
      .order('value');

    if (data) {
      setCategories(data.map(item => item.value));
    }
  };

  const performSearch = async () => {
    setLoading(true);

    try {
      let query = supabase.from('books').select('*');

      // Search term filter
      if (filters.searchTerm) {
        query = query.or(
          `title.ilike.%${filters.searchTerm}%,` +
          `author.ilike.%${filters.searchTerm}%,` +
          `isbn.ilike.%${filters.searchTerm}%,` +
          `category.ilike.%${filters.searchTerm}%`
        );
      }

      // Category filter
      if (filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Material type filter (based on category naming convention)
      if (filters.materialType === 'ebook') {
        query = query.ilike('category', '%ebook%');
      } else if (filters.materialType === 'electronic') {
        query = query.ilike('category', '%electronic%');
      } else if (filters.materialType === 'physical') {
        query = query.not('category', 'ilike', '%ebook%').not('category', 'ilike', '%electronic%');
      }

      // Availability filter
      if (filters.availability !== 'all') {
        query = query.eq('status', filters.availability);
      }

      // Sorting
      if (filters.sortBy === 'title') {
        query = query.order('title', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'author') {
        query = query.order('author', { ascending: filters.sortOrder === 'asc' });
      } else if (filters.sortBy === 'newest') {
        query = query.order('created_at', { ascending: filters.sortOrder === 'asc' });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Search error:', error);
        onResults([]);
      } else {
        // If sorting by popularity or rating, we need to do it client-side
        let results = data || [];

        if (filters.sortBy === 'popular') {
          // Get borrow counts
          const { data: borrowData } = await supabase
            .from('borrow_records')
            .select('book_id');

          const borrowCounts: { [key: string]: number } = {};
          borrowData?.forEach(record => {
            borrowCounts[record.book_id] = (borrowCounts[record.book_id] || 0) + 1;
          });

          results = results.sort((a, b) => {
            const countA = borrowCounts[a.id] || 0;
            const countB = borrowCounts[b.id] || 0;
            return filters.sortOrder === 'asc' ? countA - countB : countB - countA;
          });
        } else if (filters.sortBy === 'rating') {
          // Get average ratings
          const { data: reviewData } = await supabase
            .from('reviews')
            .select('book_id, rating');

          const ratings: { [key: string]: { sum: number; count: number } } = {};
          reviewData?.forEach(review => {
            if (!ratings[review.book_id]) {
              ratings[review.book_id] = { sum: 0, count: 0 };
            }
            ratings[review.book_id].sum += review.rating;
            ratings[review.book_id].count += 1;
          });

          results = results.sort((a, b) => {
            const avgA = ratings[a.id] ? ratings[a.id].sum / ratings[a.id].count : 0;
            const avgB = ratings[b.id] ? ratings[b.id].sum / ratings[b.id].count : 0;
            return filters.sortOrder === 'asc' ? avgA - avgB : avgB - avgA;
          });
        }

        onResults(results);
      }
    } catch (error) {
      console.error('Search error:', error);
      onResults([]);
    } finally {
      setLoading(false);
    }

    if (onFilterChange) {
      onFilterChange(filters);
    }
  };

  const updateFilter = (key: keyof FilterOptions, value: string | FilterOptions[keyof FilterOptions]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      category: 'all',
      materialType: 'all',
      availability: 'all',
      sortBy: 'title',
      sortOrder: 'asc',
    });
  };

  const hasActiveFilters = filters.category !== 'all' || 
    filters.materialType !== 'all' || 
    filters.availability !== 'all' ||
    filters.searchTerm !== '';

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={filters.searchTerm}
            onChange={(e) => updateFilter('searchTerm', e.target.value)}
            placeholder="Search by title, author, ISBN, or category..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Filter className="h-5 w-5" />
          Filters
          {hasActiveFilters && (
            <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-semibold">
              {[filters.category !== 'all', filters.materialType !== 'all', filters.availability !== 'all', filters.searchTerm !== ''].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Advanced Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Material Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
              <select
                value={filters.materialType}
                onChange={(e) => updateFilter('materialType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="physical">Physical Books</option>
                <option value="ebook">eBooks</option>
                <option value="electronic">Electronic Materials</option>
              </select>
            </div>

            {/* Availability Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <select
                value={filters.availability}
                onChange={(e) => updateFilter('availability', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="available">Available</option>
                <option value="borrowed">Borrowed</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <div className="flex gap-2">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value as FilterOptions['sortBy'])}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="title">Title</option>
                  <option value="author">Author</option>
                  <option value="newest">Newest</option>
                  <option value="popular">Popularity</option>
                  <option value="rating">Rating</option>
                </select>
                <button
                  onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
                  title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  {filters.sortOrder === 'asc' ? (
                    <SortAsc className="h-5 w-5" />
                  ) : (
                    <SortDesc className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-2">
          <span className="text-sm text-gray-600">Searching...</span>
        </div>
      )}
    </div>
  );
}
