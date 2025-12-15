import { useState, useRef, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, ChevronDown } from 'lucide-react';
import { useFilterStore } from '../../store/filterStore';
import dayjs from 'dayjs';
import 'react-datepicker/dist/react-datepicker.css';

const presets = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7days' },
  { label: 'Last 30 Days', value: 'last30days' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Custom', value: 'custom' },
];

export default function DateRangePicker() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const {
    startDate,
    endDate,
    datePreset,
    setDateRange,
    setDatePreset,
  } = useFilterStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePresetClick = (preset) => {
    if (preset === 'custom') {
      // Don't close dropdown for custom
      return;
    }
    setDatePreset(preset);
    setIsOpen(false);
  };

  const handleCustomDateChange = (dates) => {
    const [start, end] = dates;
    if (start && end) {
      setDateRange(
        dayjs(start).format('YYYY-MM-DD'),
        dayjs(end).format('YYYY-MM-DD'),
        'custom'
      );
    }
  };

  const displayLabel =
    presets.find((p) => p.value === datePreset)?.label || 'Custom';

  const formattedRange = `${dayjs(startDate).format('MMM D, YYYY')} - ${dayjs(
    endDate
  ).format('MMM D, YYYY')}`;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors"
      >
        <Calendar className="w-4 h-4 text-secondary-500" />
        <span className="text-sm font-medium text-secondary-700">
          {displayLabel}
        </span>
        <span className="text-sm text-secondary-500">{formattedRange}</span>
        <ChevronDown className="w-4 h-4 text-secondary-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-secondary-200 z-50 animate-fadeIn">
          {/* Presets */}
          <div className="p-2 border-b border-secondary-200">
            <div className="grid grid-cols-2 gap-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`px-3 py-2 text-sm rounded-lg text-left transition-colors ${
                    datePreset === preset.value
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-secondary-600 hover:bg-secondary-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Picker */}
          {datePreset === 'custom' && (
            <div className="p-4">
              <DatePicker
                selectsRange
                startDate={startDate ? new Date(startDate) : null}
                endDate={endDate ? new Date(endDate) : null}
                onChange={handleCustomDateChange}
                inline
                monthsShown={1}
              />
            </div>
          )}

          {/* Apply button for custom */}
          {datePreset === 'custom' && (
            <div className="p-2 border-t border-secondary-200">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full btn btn-primary"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
