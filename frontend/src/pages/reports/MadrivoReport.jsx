import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Download, Filter } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import OfferSelector from '../../components/common/OfferSelector';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const GROUP_BY_OPTIONS = [
  { value: 'channel', label: 'Channel' },
  { value: 'subchannel', label: 'Subchannel' },
  { value: 'country', label: 'Country' },
  { value: 'keyword', label: 'Keyword' },
  { value: 'landing_page_variant', label: 'Landing Page + Variant' },
];

const columns = [
  { key: 'label', label: 'Group' },
  { key: 'visitors', label: 'Visitors', render: (v) => v?.toLocaleString() || '0', sortable: true },
  { key: 'engaged', label: 'Engaged', render: (v) => v?.toLocaleString() || '0', sortable: true },
  { key: 'engage_rate', label: 'Engage %', render: (v) => `${(v || 0).toFixed(2)}%`, sortable: true },
  { key: 'sales', label: 'Sales', render: (v) => v?.toLocaleString() || '0', sortable: true },
  { key: 'sales_rate', label: 'Conv %', render: (v) => `${(v || 0).toFixed(2)}%`, sortable: true },
  { key: 'revenue', label: 'Revenue', render: (v) => `$${parseFloat(v || 0).toFixed(2)}`, sortable: true },
  { key: 'epc', label: 'EPC', render: (v) => `$${parseFloat(v || 0).toFixed(4)}`, sortable: true },
];

export default function MadrivoReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [groupBy, setGroupBy] = useState('channel');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Auto-select default offer
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      // Try to find Madrivo-related domains first
      const madrivoDomain = domains.find(d =>
        d.name?.toLowerCase().includes('vanguard') ||
        d.name?.toLowerCase().includes('zip-homes') ||
        d.name?.toLowerCase().includes('madrivo')
      );
      if (madrivoDomain) {
        setSelectedDomain(madrivoDomain.dkey, madrivoDomain.name);
      } else if (defaultOffer) {
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  // Build query params
  const getReportParams = () => {
    const params = getQueryParams();
    params.groupBy = groupBy;
    return params;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['madrivo-report', selectedDkey, startDate, endDate, groupBy],
    queryFn: () => analyticsApi.getAnalyticsReport(getReportParams()),
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
        <h1 className="text-xl font-bold text-secondary-900 mb-2">Madrivo Home Warranty Report</h1>
        <p className="text-secondary-600 mb-6">View overall stats with the ability to pick and choose custom groupings and filters.</p>

        {/* Filters */}
        <div className="space-y-4">
          {/* Offers Selector */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-secondary-700">Offers:</label>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
              >
                <Filter className="w-4 h-4" />
                Refine Query
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

          {/* Group By Options */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">Choose/Create a Report:</label>
            <div className="flex flex-wrap gap-2">
              {GROUP_BY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGroupBy(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    groupBy === opt.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <label className="block text-sm font-semibold text-secondary-700 mb-2">Set Filter Date:</label>
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
          <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-secondary-800">
                Madrivo Report - Grouped by {GROUP_BY_OPTIONS.find(o => o.value === groupBy)?.label}
              </h2>
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
