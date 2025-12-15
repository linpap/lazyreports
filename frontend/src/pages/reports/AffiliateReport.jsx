import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'date', label: 'Date' },
  { key: 'affiliate_id', label: 'Affiliate ID' },
  { key: 'clicks', label: 'Clicks', render: (v) => v?.toLocaleString() || '0' },
  { key: 'conversions', label: 'Conversions', render: (v) => v?.toLocaleString() || '0' },
  { key: 'revenue', label: 'Revenue', render: (v) => `$${(v || 0).toLocaleString()}` },
  { key: 'payout', label: 'Payout', render: (v) => `$${(v || 0).toLocaleString()}` },
  {
    key: 'conversion_rate',
    label: 'Conv. Rate',
    render: (_, row) => {
      const rate = row.clicks > 0 ? ((row.conversions / row.clicks) * 100).toFixed(2) : 0;
      return `${rate}%`;
    },
  },
];

export default function AffiliateReport() {
  const { startDate, endDate, getQueryParams } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['affiliate-report', startDate, endDate],
    queryFn: () => analyticsApi.getAffiliateAnalytics(getQueryParams()),
  });

  const reportData = data?.data?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Affiliate Report</h1>
          <p className="text-secondary-600 mt-1">
            Affiliate performance analytics
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading affiliate data</p>
        </div>
      ) : (
        <DataTable
          data={reportData}
          columns={columns}
          title="Affiliate Analytics"
          pageSize={15}
        />
      )}
    </div>
  );
}
