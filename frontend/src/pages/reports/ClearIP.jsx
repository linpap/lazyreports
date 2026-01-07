import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, UserX } from 'lucide-react';
import { dataApi, domainsApi } from '../../services/api';
import toast from 'react-hot-toast';

export default function ClearIP() {
  const [ip, setIp] = useState('');
  const [selectedOffer, setSelectedOffer] = useState('');

  // Fetch user's available domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];

  // Clear IP mutation
  const clearIPMutation = useMutation({
    mutationFn: (data) => dataApi.clearIP(data),
    onSuccess: (response) => {
      toast.success(response.data?.message || 'IP cleared successfully');
      setIp('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to clear IP');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!ip.trim()) {
      toast.error('Please enter an IP address');
      return;
    }

    if (!selectedOffer) {
      toast.error('Please select an offer');
      return;
    }

    clearIPMutation.mutate({
      ip: ip.trim(),
      offer: selectedOffer
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-secondary-600 italic">
          Clear visitor and action records for a specific IP address.
        </p>
      </div>

      {/* Clear IP Form */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6 max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <UserX className="w-6 h-6 text-primary-500" />
          <div>
            <h2 className="text-lg font-semibold text-primary-500">Clear IP</h2>
            <p className="text-sm text-secondary-500">Clear IP.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* IP Address Input */}
          <div>
            <label className="label">IP Address</label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="e.g., 192.168.1.1"
              className="input w-full"
            />
          </div>

          {/* Offer Selector */}
          <div>
            <label className="label">Offer</label>
            <select
              value={selectedOffer}
              onChange={(e) => setSelectedOffer(e.target.value)}
              className="input w-full"
            >
              <option value="">Start typing...</option>
              {domains.map((domain) => (
                <option key={domain.dkey} value={domain.name}>
                  {domain.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={clearIPMutation.isPending}
              className="btn btn-secondary"
            >
              {clearIPMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Submit
            </button>
          </div>
        </form>

        {/* Info Text */}
        <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
          <strong>Note:</strong> This will delete all visits and actions for the specified IP address from the last month.
        </div>
      </div>
    </div>
  );
}
