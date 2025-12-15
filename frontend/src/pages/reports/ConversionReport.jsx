import { useQuery } from '@tanstack/react-query';
import { dataApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'created_at', label: 'Date', render: (v) => v ? new Date(v).toLocaleString() : '-' },
  { key: 'offer_id', label: 'Offer ID' },
  { key: 'affiliate_id', label: 'Affiliate ID' },
  { key: 'amount', label: 'Amount', render: (v) => `$${(v || 0).toLocaleString()}` },
  {
    key: 'status',
    label: 'Status',
    render: (v) => {
      const statusColors = {
        approved: 'badge-success',
        pending: 'badge-warning',
        rejected: 'badge-danger',
      };
      return (
        <span className={`badge ${statusColors[v] || 'badge-info'}`}>
          {v || 'unknown'}
        </span>
      );
    }
  },
];

export default function ConversionReport() {
  const { startDate, endDate, getQueryParams } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['conversions-report', startDate, endDate],
    queryFn: () => dataApi.getConversions(getQueryParams()),
  });

  const reportData = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Conversion Report</h1>
          <p className="text-secondary-600 mt-1">
            Detailed conversion tracking
          </p>
        </div>
        <DateRangePicker />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading conversion data</p>
        </div>
      ) : (
        <DataTable
          data={reportData}
          columns={columns}
          title="Conversions"
          pageSize={15}
        />
      )}
    </div>
  );
}
