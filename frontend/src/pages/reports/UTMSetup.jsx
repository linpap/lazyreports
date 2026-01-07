import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Settings, X, GripVertical } from 'lucide-react';
import { dataApi, domainsApi } from '../../services/api';
import toast from 'react-hot-toast';

const PRIORITY_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'Channel', label: 'Channel' },
  { value: 'Subchannel', label: 'Subchannel' },
  { value: 'Keyword', label: 'Keyword' },
];

export default function UTMSetup() {
  const [selectedOffer, setSelectedOffer] = useState('');
  const [priority, setPriority] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [values, setValues] = useState([]);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Fetch user's available domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];

  // Fetch current UTM settings when offer is selected
  const { data: utmData, isLoading: isLoadingUtm } = useQuery({
    queryKey: ['utm-setup', selectedOffer],
    queryFn: () => dataApi.getUtmSetup(selectedOffer),
    enabled: !!selectedOffer,
  });

  // Update values when UTM data loads or priority changes
  useEffect(() => {
    if (utmData?.data?.data && priority) {
      const data = utmData.data.data;
      let currentValue = '';
      switch (priority) {
        case 'Channel':
          currentValue = data.channelPriority || '';
          break;
        case 'Subchannel':
          currentValue = data.subchannelPriority || '';
          break;
        case 'Keyword':
          currentValue = data.keywordPriority || '';
          break;
      }
      // Split by comma to get array of values
      if (currentValue) {
        setValues(currentValue.split(',').map(v => v.trim()).filter(Boolean));
      } else {
        setValues([]);
      }
    } else {
      setValues([]);
    }
  }, [utmData, priority]);

  // Save UTM mutation
  const saveMutation = useMutation({
    mutationFn: (data) => dataApi.saveUtmSetup(data),
    onSuccess: (response) => {
      toast.success(response.data?.message || 'UTM settings saved successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to save UTM settings');
    },
  });

  // Handle priority change
  const handlePriorityChange = (newPriority) => {
    setPriority(newPriority);
    setInputValue('');
  };

  // Add value to list
  const handleAddValue = () => {
    if (!inputValue.trim()) return;

    if (values.includes(inputValue.trim())) {
      toast.error('Value already exists');
      return;
    }

    setValues([...values, inputValue.trim()]);
    setInputValue('');
  };

  // Remove value from list
  const handleRemoveValue = (index) => {
    setValues(values.filter((_, i) => i !== index));
  };

  // Handle drag start
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  // Handle drag over
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newValues = [...values];
    const draggedItem = newValues[draggedIndex];
    newValues.splice(draggedIndex, 1);
    newValues.splice(index, 0, draggedItem);
    setValues(newValues);
    setDraggedIndex(index);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Handle key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddValue();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedOffer) {
      toast.error('Please select an offer');
      return;
    }

    if (!priority) {
      toast.error('Please select a priority type');
      return;
    }

    // Join values with comma
    const value = values.join(',');

    saveMutation.mutate({
      offer: selectedOffer,
      priority,
      value
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-secondary-600 italic">
          Configure UTM tracking priorities for your domains.
        </p>
      </div>

      {/* UTM Setup Form */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-6 h-6 text-primary-500" />
          <div>
            <h2 className="text-lg font-semibold text-primary-500">UTM Setup</h2>
            <p className="text-sm text-secondary-500">UTM Setup.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Offer Input */}
          <div>
            <label className="label">Offer</label>
            <input
              type="text"
              list="offers-list"
              value={selectedOffer}
              onChange={(e) => setSelectedOffer(e.target.value)}
              placeholder="Start typing..."
              className="input w-full"
            />
            <datalist id="offers-list">
              {domains.map((domain) => (
                <option key={domain.dkey} value={domain.name} />
              ))}
            </datalist>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="label">Channel/Subchannel/Keyword Priority</label>
            <select
              value={priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className="input w-full"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input - shown when priority is selected */}
          {priority && (
            <>
              <div>
                <label className="label">Enter priority:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder=""
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleAddValue}
                    className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                  >
                    Ok
                  </button>
                </div>
                {isLoadingUtm && (
                  <p className="text-sm text-secondary-500 mt-1">Loading current values...</p>
                )}
              </div>

              {/* Values List */}
              {values.length > 0 && (
                <div className="space-y-2">
                  {values.map((value, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 p-2 border border-secondary-200 rounded-lg bg-white cursor-move ${
                        draggedIndex === index ? 'opacity-50' : ''
                      }`}
                    >
                      <GripVertical className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                      <span className="flex-1 text-secondary-700">{value}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveValue(index)}
                        className="p-1 text-secondary-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="btn btn-secondary"
            >
              {saveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit
            </button>
          </div>
        </form>

        {/* Info Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          <strong>Note:</strong> Add multiple priority values by entering each value and clicking "Ok".
          Drag to reorder. Values are saved as a comma-separated list.
        </div>
      </div>
    </div>
  );
}
