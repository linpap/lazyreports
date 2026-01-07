import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Settings } from 'lucide-react';
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
  const [value, setValue] = useState('');

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
    onSuccess: (response) => {
      // Pre-populate the value based on priority type
      if (priority && response?.data?.data) {
        const data = response.data.data;
        switch (priority) {
          case 'Channel':
            setValue(data.channelPriority || '');
            break;
          case 'Subchannel':
            setValue(data.subchannelPriority || '');
            break;
          case 'Keyword':
            setValue(data.keywordPriority || '');
            break;
        }
      }
    }
  });

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

  // Handle priority change - populate value from existing settings
  const handlePriorityChange = (newPriority) => {
    setPriority(newPriority);

    if (utmData?.data?.data && newPriority) {
      const data = utmData.data.data;
      switch (newPriority) {
        case 'Channel':
          setValue(data.channelPriority || '');
          break;
        case 'Subchannel':
          setValue(data.subchannelPriority || '');
          break;
        case 'Keyword':
          setValue(data.keywordPriority || '');
          break;
        default:
          setValue('');
      }
    } else {
      setValue('');
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
            <div>
              <label className="label">{priority} Value</label>
              <input
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={`Enter ${priority.toLowerCase()} priority value...`}
                className="input w-full"
              />
              {isLoadingUtm && (
                <p className="text-sm text-secondary-500 mt-1">Loading current value...</p>
              )}
            </div>
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
          <strong>Note:</strong> This sets the priority for how UTM parameters are processed for the selected offer.
          Choose Channel, Subchannel, or Keyword to configure their priority value.
        </div>
      </div>
    </div>
  );
}
