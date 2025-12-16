import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export default function OfferSelector({
  domains = [],
  selectedDkey,
  onChange,
  disabled = false,
  placeholder = 'Type or select offer...',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Get the selected domain name
  const selectedDomain = domains.find(d => d.dkey === selectedDkey);

  // Filter domains based on search query
  const filteredDomains = searchQuery
    ? domains.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : domains;

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (domain) => {
    onChange(domain.dkey, domain.name);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (!isOpen) setIsOpen(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchQuery('');
    } else if (e.key === 'Enter' && filteredDomains.length === 1) {
      handleSelect(filteredDomains[0]);
    }
  };

  return (
    <div className="relative min-w-[200px]">
      {/* Input field */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery || (isOpen ? '' : selectedDomain?.name || '')}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={selectedDomain?.name || placeholder}
          disabled={disabled}
          className="w-full appearance-none bg-white border border-secondary-300 rounded-lg pl-9 pr-10 py-2 text-sm font-medium text-secondary-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          {searchQuery && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-secondary-100 rounded"
              type="button"
            >
              <X className="w-3 h-3 text-secondary-400" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-secondary-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border border-secondary-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredDomains.length === 0 ? (
            <div className="px-4 py-3 text-sm text-secondary-500">
              No offers found
            </div>
          ) : (
            filteredDomains.map((domain) => (
              <button
                key={domain.dkey}
                onClick={() => handleSelect(domain)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-primary-50 transition-colors ${
                  domain.dkey === selectedDkey
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-secondary-700'
                }`}
                type="button"
              >
                {domain.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
