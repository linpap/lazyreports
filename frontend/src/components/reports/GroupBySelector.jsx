import { useState, useRef, useEffect } from 'react';
import { X, GripVertical, Plus, ChevronDown, Search } from 'lucide-react';
import { GROUP_BY_OPTIONS } from '../../constants/reportOptions';

const MAX_GROUPINGS = 5;

export default function GroupBySelector({ selectedGroups, onChange }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const availableOptions = GROUP_BY_OPTIONS.filter(
    opt => !selectedGroups.find(g => g.id === opt.id)
  );

  const filteredOptions = availableOptions.filter(opt =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showDropdown && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showDropdown]);

  // Clear search when dropdown closes
  useEffect(() => {
    if (!showDropdown) {
      setSearchQuery('');
    }
  }, [showDropdown]);

  const handleAddGroup = (option) => {
    if (selectedGroups.length < MAX_GROUPINGS) {
      onChange([...selectedGroups, option]);
    }
    setShowDropdown(false);
  };

  const handleRemoveGroup = (id) => {
    onChange(selectedGroups.filter(g => g.id !== id));
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.setData('dragIndex', index.toString());
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));
    if (dragIndex === dropIndex) return;

    const newGroups = [...selectedGroups];
    const [removed] = newGroups.splice(dragIndex, 1);
    newGroups.splice(dropIndex, 0, removed);
    onChange(newGroups);
  };

  return (
    <div className="bg-white border border-secondary-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-secondary-700">Group By</h3>
        <span className="text-xs text-secondary-500">
          {selectedGroups.length}/{MAX_GROUPINGS} levels
        </span>
      </div>

      {/* Selected Groupings */}
      <div className="space-y-2 mb-3">
        {selectedGroups.length === 0 ? (
          <div className="text-sm text-secondary-500 italic py-2">
            No grouping selected. Data will be grouped by date.
          </div>
        ) : (
          selectedGroups.map((group, index) => (
            <div
              key={group.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className="flex items-center gap-2 bg-secondary-50 border border-secondary-200 rounded px-3 py-2 cursor-move group"
            >
              <GripVertical className="w-4 h-4 text-secondary-400" />
              <span className="text-xs font-medium text-secondary-500 w-5">
                {index + 1}.
              </span>
              <span className="flex-1 text-sm text-secondary-700">{group.label}</span>
              <button
                onClick={() => handleRemoveGroup(group.id)}
                className="opacity-0 group-hover:opacity-100 text-secondary-400 hover:text-red-500 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add Group Dropdown */}
      {selectedGroups.length < MAX_GROUPINGS && availableOptions.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Grouping Field
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute z-20 mt-1 w-72 bg-white border border-secondary-200 rounded-lg shadow-lg">
              {/* Search Input */}
              <div className="p-2 border-b border-secondary-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type to search..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Options List */}
              <div className="max-h-52 overflow-y-auto">
                {filteredOptions.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-secondary-500 italic">
                    No matching options
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleAddGroup(option)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-primary-50 text-secondary-700"
                    >
                      {option.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedGroups.length >= MAX_GROUPINGS && (
        <p className="text-xs text-amber-600 mt-2">
          Maximum {MAX_GROUPINGS} grouping levels reached
        </p>
      )}
    </div>
  );
}
