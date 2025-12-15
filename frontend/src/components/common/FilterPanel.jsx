import { useState, useEffect, useRef } from 'react';
import { X, Plus, Filter, ChevronDown } from 'lucide-react';
import { dataApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';

const FILTER_TYPES = [
  { key: 'channel', label: 'Channel', placeholder: 'Search channels...' },
  { key: 'subchannel', label: 'Subchannel', placeholder: 'Search subchannels...' },
  { key: 'country', label: 'Country', placeholder: 'Search countries...' },
  { key: 'keyword', label: 'Keyword', placeholder: 'Search keywords...' },
  { key: 'iporg', label: 'IP Organization', placeholder: 'Search organizations...' },
  { key: 'page_action', label: 'Page/Action', placeholder: 'Search actions...' },
];

function FilterInput({ type, onAdd, onRemove, selectedValues = [], dkey }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const filterConfig = FILTER_TYPES.find(f => f.key === type);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < 1) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      try {
        const response = await dataApi.getApproximate(query, type, dkey);
        setSuggestions(response.data?.data || []);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
      setIsLoading(false);
    };

    const debounce = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounce);
  }, [query, type, dkey]);

  const handleSelect = (item) => {
    const value = item.id || item.label;
    if (!selectedValues.includes(value)) {
      onAdd(type, value);
    }
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      if (!selectedValues.includes(query.trim())) {
        onAdd(type, query.trim());
      }
      setQuery('');
      setSuggestions([]);
    }
  };

  return (
    <div className="flex items-start gap-2 mb-3">
      <div className="w-32 flex-shrink-0">
        <span className="inline-block bg-secondary-100 text-secondary-700 text-xs font-semibold px-3 py-2 rounded">
          {filterConfig?.label || type}
        </span>
      </div>
      <div className="flex-1 relative" ref={dropdownRef}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={filterConfig?.placeholder || 'Start typing...'}
          className="w-full px-3 py-2 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />

        {/* Suggestions Dropdown */}
        {showDropdown && (suggestions.length > 0 || isLoading) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-secondary-500">Loading...</div>
            ) : (
              suggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-primary-50"
                  onClick={() => handleSelect(item)}
                >
                  {item.label}
                </div>
              ))
            )}
          </div>
        )}

        {/* Selected Values */}
        {selectedValues.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedValues.map((value, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded"
              >
                {value}
                <button
                  onClick={() => onRemove(type, value)}
                  className="hover:text-primary-900"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => onRemove(type)}
        className="text-secondary-400 hover:text-red-500 p-1"
        title="Remove filter"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function FilterPanel({ onFiltersChange, className = '' }) {
  const { selectedDkey } = useFilterStore();
  const [activeFilters, setActiveFilters] = useState(['channel']); // Default to channel filter
  const [filterValues, setFilterValues] = useState({});
  const [showAddFilter, setShowAddFilter] = useState(false);
  const [matchType, setMatchType] = useState('any'); // 'any' or 'all'
  const addFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addFilterRef.current && !addFilterRef.current.contains(event.target)) {
        setShowAddFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange({ filters: filterValues, matchType });
    }
  }, [filterValues, matchType, onFiltersChange]);

  const addFilter = (filterKey) => {
    if (!activeFilters.includes(filterKey)) {
      setActiveFilters([...activeFilters, filterKey]);
    }
    setShowAddFilter(false);
  };

  const removeFilter = (filterKey) => {
    setActiveFilters(activeFilters.filter(f => f !== filterKey));
    const newValues = { ...filterValues };
    delete newValues[filterKey];
    setFilterValues(newValues);
  };

  const addFilterValue = (type, value) => {
    setFilterValues(prev => ({
      ...prev,
      [type]: [...(prev[type] || []), value]
    }));
  };

  const removeFilterValue = (type, value) => {
    if (value === undefined) {
      // Remove entire filter
      removeFilter(type);
    } else {
      setFilterValues(prev => ({
        ...prev,
        [type]: (prev[type] || []).filter(v => v !== value)
      }));
    }
  };

  const availableFilters = FILTER_TYPES.filter(f => !activeFilters.includes(f.key));

  return (
    <div className={`bg-white border border-secondary-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-secondary-500" />
          <span className="font-medium text-secondary-700">Filters</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Match Type Toggle */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-secondary-600">Match:</span>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              className="text-sm border border-secondary-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="any">At least ONE</option>
              <option value="all">ALL</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters */}
      <div className="space-y-2">
        {activeFilters.map(filterKey => (
          <FilterInput
            key={filterKey}
            type={filterKey}
            selectedValues={filterValues[filterKey] || []}
            onAdd={addFilterValue}
            onRemove={removeFilterValue}
            dkey={selectedDkey}
          />
        ))}
      </div>

      {/* Add New Filter Button */}
      {availableFilters.length > 0 && (
        <div className="relative mt-3" ref={addFilterRef}>
          <button
            onClick={() => setShowAddFilter(!showAddFilter)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Filter
          </button>

          {showAddFilter && (
            <div className="absolute z-10 mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg py-1 min-w-[180px]">
              {availableFilters.map(filter => (
                <button
                  key={filter.key}
                  onClick={() => addFilter(filter.key)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-primary-50"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
