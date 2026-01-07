import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, Download } from 'lucide-react';
import { analyticsApi, domainsApi, dataApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import OfferSelector from '../../components/common/OfferSelector';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'label', label: 'Channel / Subchannel' },
  { key: 'visitors', label: 'Visitors', render: (v) => Number(v || 0).toLocaleString(), sortable: true },
  { key: 'engaged', label: 'Engaged', render: (v) => Number(v || 0).toLocaleString(), sortable: true },
  { key: 'engage_rate', label: 'Engage %', render: (v) => `${parseFloat(v || 0).toFixed(2)}%`, sortable: true },
  { key: 'sales', label: 'Sales', render: (v) => Number(v || 0).toLocaleString(), sortable: true },
  { key: 'sales_rate', label: 'Conv %', render: (v) => `${parseFloat(v || 0).toFixed(2)}%`, sortable: true },
  { key: 'revenue', label: 'Revenue', render: (v) => `$${parseFloat(v || 0).toFixed(2)}`, sortable: true },
  { key: 'epc', label: 'EPC', render: (v) => `$${parseFloat(v || 0).toFixed(4)}`, sortable: true },
];

export default function ChannelSubchannelReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [uniqueFilter, setUniqueFilter] = useState('0');
  const [minVisitors, setMinVisitors] = useState('100');
  const [pageFilter, setPageFilter] = useState('1');
  const [variantFilter, setVariantFilter] = useState('');

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Fetch variants for selected offer
  const { data: variantsData } = useQuery({
    queryKey: ['variants', selectedDkey],
    queryFn: () => dataApi.getVariants({ dkey: selectedDkey }),
    enabled: !!selectedDkey,
    staleTime: 5 * 60 * 1000,
  });

  const variants = variantsData?.data?.data || [];

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
    params.groupBy = 'subchannel';
    if (variantFilter) params.variant = variantFilter;
    if (pageFilter) params.page = pageFilter;
    return params;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['channel-subchannel-report', selectedDkey, startDate, endDate, uniqueFilter, minVisitors, variantFilter, pageFilter],
    queryFn: () => analyticsApi.getAnalyticsReport(getReportParams()),
    enabled: shouldFetch && !!selectedDkey,
  });

  // Filter data by minimum visitors
  const minVisitorsNum = parseInt(minVisitors) || 0;
  const reportData = (data?.data?.data || []).filter(row => (row.visitors || 0) >= minVisitorsNum);

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
        <h1 className="text-xl font-bold text-secondary-900 mb-2">Channel-SubChannel Report</h1>
        <p className="text-secondary-600 mb-6">Run the custom Channel SubChannel report for SearchROI Offers</p>

        {/* Filters */}
        <div className="space-y-4">
          {/* Offers Selector */}
          <div className="border border-secondary-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-secondary-700 mb-2">Choose Offer:</label>
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

          {/* Date and Options */}
          <div className="border border-secondary-200 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-secondary-700 mb-2">Date:</label>
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
                <div>
                  <label className="block text-xs text-secondary-500 mb-1">Min subchannel visitors:</label>
                  <input
                    type="text"
                    value={minVisitors}
                    onChange={(e) => setMinVisitors(e.target.value)}
                    placeholder="Default is 100"
                    className="px-3 py-2 border border-secondary-300 rounded-lg text-sm w-32"
                  />
                </div>
                <div>
                  <label className="block text-xs text-secondary-500 mb-1">Variants:</label>
                  <select
                    value={variantFilter}
                    onChange={(e) => setVariantFilter(e.target.value)}
                    className="px-3 py-2 border border-secondary-300 rounded-lg text-sm"
                  >
                    <option value="">All Variants</option>
                    {variants.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-secondary-500 mb-1">Page:</label>
                  <select
                    value={pageFilter}
                    onChange={(e) => setPageFilter(e.target.value)}
                    className="px-3 py-2 border border-secondary-300 rounded-lg text-sm"
                  >
                    <option value="1">1st Page</option>
                    <option value="2">2nd Page</option>
                    <option value="3">3rd Page</option>
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
              <h2 className="text-xl font-semibold text-secondary-800">Channel-SubChannel Report</h2>
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
