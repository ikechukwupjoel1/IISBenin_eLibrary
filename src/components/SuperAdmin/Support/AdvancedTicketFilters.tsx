import { useState, useEffect } from 'react';
import { Filter, X, Save, Star, StarOff, Calendar, Users } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import toast from 'react-hot-toast';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
type TicketCategory = 'technical' | 'billing' | 'feature_request' | 'bug_report' | 'general';

export interface TicketFilters {
  status: TicketStatus | 'all';
  priority: TicketPriority | 'all';
  category: TicketCategory | 'all';
  assigned_to: string | 'all' | 'unassigned';
  dateRange: {
    from: string;
    to: string;
  } | null;
  search: string;
}

interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: TicketFilters;
  is_default: boolean;
}

interface AdvancedTicketFiltersProps {
  filters: TicketFilters;
  onFilterChange: (filters: TicketFilters) => void;
  superAdmins: Array<{ id: string; full_name: string }>;
}

export function AdvancedTicketFilters({
  filters,
  onFilterChange,
  superAdmins
}: AdvancedTicketFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('support_ticket_filter_presets')
        .select('*')
        .order('is_default', { ascending: false })
        .order('name');

      if (error) throw error;
      setPresets(data || []);
    } catch (error) {
      console.error('Error fetching filter presets:', error);
    }
  };

  const savePreset = async () => {
    if (!presetName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    try {
      const { error } = await supabase
        .from('support_ticket_filter_presets')
        .insert({
          name: presetName,
          description: presetDescription,
          filters: filters,
          is_default: false
        });

      if (error) throw error;

      toast.success('Filter preset saved');
      setShowSavePreset(false);
      setPresetName('');
      setPresetDescription('');
      fetchPresets();
    } catch (error) {
      console.error('Error saving preset:', error);
      const err = error as { code?: string };
      if (err.code === '23505') {
        toast.error('A preset with this name already exists');
      } else {
        toast.error('Failed to save preset');
      }
    }
  };

  const loadPreset = (preset: FilterPreset) => {
    onFilterChange(preset.filters);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const deletePreset = async (id: string) => {
    try {
      const { error } = await supabase
        .from('support_ticket_filter_presets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Preset deleted');
      fetchPresets();
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast.error('Failed to delete preset');
    }
  };

  const setDefaultPreset = async (id: string) => {
    try {
      // Unset all defaults first
      await supabase
        .from('support_ticket_filter_presets')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Set new default
      const { error } = await supabase
        .from('support_ticket_filter_presets')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      toast.success('Default preset updated');
      fetchPresets();
    } catch (error) {
      console.error('Error setting default:', error);
      toast.error('Failed to set default preset');
    }
  };

  const resetFilters = () => {
    onFilterChange({
      status: 'all',
      priority: 'all',
      category: 'all',
      assigned_to: 'all',
      dateRange: null,
      search: ''
    });
  };

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== '';
    if (key === 'dateRange') return value !== null;
    return value !== 'all';
  }).length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {activeFilterCount > 0 && (
            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={resetFilters}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          {/* Saved Presets */}
          {presets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Saved Filter Presets</h4>
              <div className="flex flex-wrap gap-2">
                {presets.map(preset => (
                  <div
                    key={preset.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg group"
                  >
                    <button
                      onClick={() => loadPreset(preset)}
                      className="text-sm text-gray-700 hover:text-blue-600"
                      title={preset.description || preset.name}
                    >
                      {preset.name}
                    </button>
                    
                    <button
                      onClick={() => setDefaultPreset(preset.id)}
                      className={`${
                        preset.is_default ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={preset.is_default ? 'Default preset' : 'Set as default'}
                    >
                      {preset.is_default ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
                    </button>
                    
                    <button
                      onClick={() => deletePreset(preset.id)}
                      className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete preset"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange({ ...filters, status: e.target.value as TicketStatus | 'all' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => onFilterChange({ ...filters, priority: e.target.value as TicketPriority | 'all' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange({ ...filters, category: e.target.value as TicketCategory | 'all' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="billing">Billing</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Assigned To
              </label>
              <select
                value={filters.assigned_to}
                onChange={(e) => onFilterChange({ ...filters, assigned_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Assignments</option>
                <option value="unassigned">Unassigned</option>
                {superAdmins.map(admin => (
                  <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                ))}
              </select>
            </div>

            {/* Date Range From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                From Date
              </label>
              <input
                type="date"
                value={filters.dateRange?.from || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  dateRange: {
                    from: e.target.value,
                    to: filters.dateRange?.to || ''
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Date Range To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                To Date
              </label>
              <input
                type="date"
                value={filters.dateRange?.to || ''}
                onChange={(e) => onFilterChange({
                  ...filters,
                  dateRange: {
                    from: filters.dateRange?.from || '',
                    to: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Save Preset Button */}
          <div className="flex justify-end pt-4 border-t border-gray-200">
            {!showSavePreset ? (
              <button
                onClick={() => setShowSavePreset(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save as Preset
              </button>
            ) : (
              <div className="flex items-center gap-3 w-full">
                <input
                  type="text"
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={presetDescription}
                  onChange={(e) => setPresetDescription(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={savePreset}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowSavePreset(false);
                    setPresetName('');
                    setPresetDescription('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
