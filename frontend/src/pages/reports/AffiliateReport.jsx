import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import OfferSelector from '../../components/common/OfferSelector';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'hash', label: 'Hash' },
  {
    key: 'revenue',
    label: 'Revenue',
    render: (v) => `$${parseFloat(v || 0).toFixed(2)}`,
    sortable: true
  },
  {
    key: 'revenue_date',
    label: 'Revenue Date',
    render: (v) => v ? new Date(v).toLocaleString() : '',
    sortable: true
  },
  { key: 'logstring', label: 'Logstring', render: (v) => v || '' },
  { key: 'ip_address', label: 'IP Address' },
  { key: 'organization', label: 'Organization' },
];

export default function AffiliateReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [shouldFetch, setShouldFetch] = useState(false);

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Auto-select default offer from DB, or first domain if no default set
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      if (defaultOffer) {
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['affiliate-report', selectedDkey, startDate, endDate],
    queryFn: () => analyticsApi.getAffiliateAnalytics(getQueryParams()),
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
      <div>
        <p className="text-secondary-600 italic">
          View overall stats with the ability to pick and choose custom groupings and filters.
        </p>
      </div>

      {/* Filters Card */}
      <div className="card p-6 space-y-4 overflow-visible">
        {/* Offers Selector */}
        <div className="relative">
          <label className="block text-sm font-semibold text-secondary-700 mb-2">
            Offers:
          </label>
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

        {/* Date Filter */}
        <div className="relative">
          <label className="block text-sm font-semibold text-secondary-700 mb-2">
            Set Report Filters:
          </label>
          <DateRangePicker />
        </div>
      </div>

      {/* Run Report Button */}
      <div className="flex justify-center">
        <button
          onClick={handleRunReport}
          disabled={!selectedDkey || isLoading}
          className="btn btn-primary px-8 py-3 text-lg font-semibold disabled:opacity-50"
        >
          <Play className="w-5 h-5 mr-2" />
          Run Report
        </button>
      </div>

      {/* Report Results */}
      {shouldFetch && (
        <div className="card">
          <div className="px-6 py-4 border-b border-secondary-100 bg-secondary-50">
            <h2 className="text-xl font-semibold text-secondary-800">
              Affiliate Analytics Report
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
              <p className="text-red-600">Error loading affiliate data</p>
            </div>
          ) : reportData.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-secondary-500">No data found for the selected filters</p>
            </div>
          ) : (
            <DataTable
              data={reportData}
              columns={columns}
              pageSize={15}
              showTitle={false}
            />
          )}
        </div>
      )}
    </div>
  );
}
