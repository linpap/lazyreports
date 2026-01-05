import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, X, Download } from 'lucide-react';
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
  { key: 'channel', label: 'Channel' },
  { key: 'subchannel', label: 'Subchannel' },
  { key: 'total_actions', label: 'Actions' },
  {
    key: 'revenue',
    label: 'Revenue',
    render: (v) => `$${parseFloat(v || 0).toFixed(2)}`,
    sortable: true
  },
  { key: 'country', label: 'Country' },
];

export default function SiteConversionReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [channelFilter, setChannelFilter] = useState('');
  const [subchannelFilter, setSubchannelFilter] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [selectedSubchannel, setSelectedSubchannel] = useState('');
  const [showChannelDropdown, setShowChannelDropdown] = useState(false);
  const [showSubchannelDropdown, setShowSubchannelDropdown] = useState(false);
  const [uniqueFilter, setUniqueFilter] = useState('0');
  const [showFilters, setShowFilters] = useState(false);

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
    ? channels.filter(c => c.channel?.toLowerCase().includes(channelFilter.toLowerCase()))
    : channels;
  const filteredSubchannels = subchannelFilter
    ? channels.filter(c => c.subchannel?.toLowerCase().includes(subchannelFilter.toLowerCase()))
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
    params.type = 'sales';
    if (selectedChannel) params.channel = selectedChannel;
    if (selectedSubchannel) params.subchannel = selectedSubchannel;
    return params;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['site-conversion-report', selectedDkey, startDate, endDate, selectedChannel, selectedSubchannel, uniqueFilter],
    queryFn: () => analyticsApi.getAnalyticsDetail(getReportParams()),
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
  };

  // Generate timestamp
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
        <h1 className="text-xl font-bold text-secondary-900 mb-2">Site Conversion Report</h1>
        <p className="text-secondary-600 mb-6">Run the custom site conversion report for SearchROI Offers</p>

        {/* Filters */}
        <div className="space-y-4">
          {/* Offers Selector */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-700">Choose Offer:</label>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {showFilters ? 'Hide Filters' : 'Add Filters'}
              </button>
            </div>
            {domainsLoading ? (
              <div className="h-10 bg-secondary-100 rounded animate-pulse" />
            ) : (
              <OfferSelector
                domains={domains}
                selectedDkey={selectedDkey}
                onChange={handleDomainChange}
                placeholder="Start typing..."
              />
            )}
          </div>

          {/* Additional Filters */}
          {showFilters && (
            <div className="border border-secondary-200 rounded-lg p-4 space-y-4">
              {/* Channel Filter */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Channel</label>
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
                          onClick={() => {
                            setSelectedChannel(c.channel);
                            setChannelFilter('');
                            setShowChannelDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                        >
                          {c.channel}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedChannel && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded text-sm text-primary-700">
                    {selectedChannel}
                    <button onClick={() => setSelectedChannel('')} className="text-primary-400 hover:text-primary-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              {/* Subchannel Filter */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Subchannel</label>
                <div className="relative">
                  <input
                    type="text"
                    value={subchannelFilter}
                    onChange={(e) => {
                      setSubchannelFilter(e.target.value);
                      setShowSubchannelDropdown(true);
                    }}
                    onFocus={() => setShowSubchannelDropdown(true)}
                    placeholder="Start typing..."
                    className="w-full max-w-md px-3 py-2 border border-secondary-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {showSubchannelDropdown && filteredSubchannels.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-secondary-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {[...new Set(filteredSubchannels.map(c => c.subchannel).filter(Boolean))].slice(0, 20).map((sc, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSelectedSubchannel(sc);
                            setSubchannelFilter('');
                            setShowSubchannelDropdown(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-primary-50"
                        >
                          {sc}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSubchannel && (
                  <span className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-primary-50 border border-primary-200 rounded text-sm text-primary-700">
                    {selectedSubchannel}
                    <button onClick={() => setSelectedSubchannel('')} className="text-primary-400 hover:text-primary-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Date and Options */}
          <div className="border border-secondary-200 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Set Report Filters:</label>
              <DateRangePicker />
            </div>

            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Report Options:</label>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-xs text-secondary-500 mb-1">Unique:</label>
                  <select
                    value={uniqueFilter}
                    onChange={(e) => setUniqueFilter(e.target.value)}
                    className="px-3 py-2 border border-secondary-300 rounded-lg text-sm"
                  >
                    <option value="0">All Visitors</option>
                    <option value="1">Unique</option>
                    <option value="2">Non-Unique</option>
                  </select>
                </div>
              </div>
            </div>
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
          <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-secondary-800">Site Conversion Report</h2>
              <p className="text-sm text-secondary-500">as of {timestamp}</p>
            </div>
            {reportData.length > 0 && (
              <button className="btn btn-secondary flex items-center gap-2">
                <Download className="w-4 h-4" />
                Excel
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="p-8"><LoadingSpinner /></div>
          ) : error ? (
            <div className="p-8 text-center"><p className="text-red-600">Error loading report data</p></div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center"><p className="text-secondary-500">No data found for the selected filters</p></div>
          ) : (
            <DataTable data={reportData} columns={columns} pageSize={25} showTitle={false} />
          )}
        </div>
      )}
    </div>
  );
}
