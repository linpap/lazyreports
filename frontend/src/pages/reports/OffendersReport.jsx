import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, X, AlertTriangle } from 'lucide-react';
import { analyticsApi, domainsApi, dataApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import OfferSelector from '../../components/common/OfferSelector';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'visitor_id', label: 'Visitor ID' },
  {
    key: 'date_created',
    label: 'Visit Date',
    render: (v) => v ? new Date(v).toLocaleString() : '',
    sortable: true
  },
  { key: 'ip_address', label: 'IP Address' },
  {
    key: 'offender_type',
    label: 'Type',
    render: (v) => (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
        <AlertTriangle className="w-3 h-3" />
        {v}
      </span>
    )
  },
  { key: 'channel', label: 'Channel' },
  { key: 'subchannel', label: 'Subchannel' },
  { key: 'organization', label: 'Organization' },
  { key: 'country', label: 'Country' },
];

export default function OffendersReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Fetch channels for autocomplete
  const { data: channelsData } = useQuery({
    queryKey: ['channels', selectedDkey],
    queryFn: () => dataApi.getChannels({ dkey: selectedDkey }),
    enabled: !!selectedDkey,
    staleTime: 5 * 60 * 1000,
  });

  const channels = channelsData?.data?.data || [];
  const filteredChannels = channelFilter
    ? channels.filter(c =>
        c.channel?.toLowerCase().includes(channelFilter.toLowerCase())
      )
    : channels;

  // Auto-select default offer
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      if (defaultOffer) {
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  // Build query params
  const getReportParams = () => {
    const params = getQueryParams();
    if (selectedChannel) {
      params.channel = selectedChannel;
    }
    return params;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['offenders-report', selectedDkey, startDate, endDate, selectedChannel],
    queryFn: () => analyticsApi.getOffendersReport(getReportParams()),
    enabled: shouldFetch && !!selectedDkey,
  });

  const reportData = data?.data?.data || [];

  const handleRunReport = () => {
    setShouldFetch(true);
    if (shouldFetch) {
      refetch();
    }
  };

  const handleDomainChange = (dkey, name) => {
    setSelectedDomain(dkey, name);
    setShouldFetch(false);
    setSelectedChannel('');
  };

  const handleSelectChannel = (channel) => {
    setSelectedChannel(channel);
    setChannelFilter('');
    setShowChannelDropdown(false);
  };

  // Generate timestamp for report
  const timestamp = new Date().toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6">
        <h1 className="text-xl font-bold text-secondary-900 mb-6">Offenders Report Input</h1>

        {/* Filters */}
        <div className="space-y-4">
          {/* Offers Selector */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Offers:
            </label>
            {domainsLoading ? (
              <div className="h-10 bg-secondary-100 rounded animate-pulse" />
            ) : (
              <div className="space-y-2">
                <OfferSelector
                  domains={domains}
                  selectedDkey={selectedDkey}
                  onChange={handleDomainChange}
                  placeholder="Start typing..."
                />
                {selectedDkey && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {domains.filter(d => d.dkey === selectedDkey).map(d => (
                      <span
                        key={d.dkey}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-secondary-300 rounded text-sm"
                      >
                        {d.name}
                        <button
                          onClick={() => setSelectedDomain(null, null)}
                          className="text-secondary-400 hover:text-secondary-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Channel Filter */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Channel:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={channelFilter}
                  onChange={(e) => {
                    setChannelFilter(e.target.value);
                    setShowChannelDropdown(true);
                  }}
                  onFocus={() => setShowChannelDropdown(true)}
                  placeholder="Start typing..."
                  className="w-full max-w-md px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {showChannelDropdown && filteredChannels.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {filteredChannels.slice(0, 20).map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectChannel(c.channel)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50 transition-colors"
                      >
                        {c.channel}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedChannel && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-50 border border-primary-200 rounded text-sm text-primary-700">
                    {selectedChannel}
                    <button
                      onClick={() => setSelectedChannel('')}
                      className="text-primary-400 hover:text-primary-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Date Filter */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">
              Set Filter Date
            </label>
            <DateRangePicker />
          </div>

          {/* Run Report Button */}
          <div className="border border-secondary-200 rounded-lg p-4 flex justify-center">
            <button
              onClick={handleRunReport}
              disabled={!selectedDkey || isLoading}
              className="btn btn-primary px-8 py-3 text-lg font-semibold disabled:opacity-50"
            >
              Run Report
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {shouldFetch && (
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-100 bg-red-50">
            <h2 className="text-xl font-semibold text-secondary-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Offenders Report
            </h2>
            <p className="text-sm text-secondary-500 text-right mt-1">
              as of {timestamp}
            </p>
          </div>

          {isLoading ? (
            <div className="p-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-red-600">Error loading report data</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary-500">No offenders found for the selected filters</p>
            </div>
          ) : (
            <DataTable
              data={reportData}
              columns={columns}
              pageSize={25}
              showTitle={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
