import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import DataTable from '../../components/common/DataTable';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const columns = [
  { key: 'country', label: 'Country' },
  { key: 'country_code', label: 'Code' },
  { key: 'total', label: 'Total', render: (v) => v?.toLocaleString() || '0' },
  { key: 'clicks', label: 'Clicks', render: (v) => v?.toLocaleString() || '0' },
  { key: 'conversions', label: 'Conversions', render: (v) => v?.toLocaleString() || '0' },
  {
    key: 'conversion_rate',
    label: 'Conv. Rate',
    render: (_, row) => {
      const rate = row.clicks > 0 ? ((row.conversions / row.clicks) * 100).toFixed(2) : 0;
      return `${rate}%`;
    },
  },
];

export default function LocationsReport() {
  const { startDate, endDate, getQueryParams } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['locations-report', startDate, endDate],
    queryFn: () => analyticsApi.getAnalyticsMap(getQueryParams()),
  });

  const reportData = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Locations Report</h1>
          <p className="text-secondary-600 mt-1">
            Geographic performance breakdown
          </p>
        </div>
        <DateRangePicker />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading location data</p>
        </div>
      ) : (
        <DataTable
          data={reportData}
          columns={columns}
          title="Location Analytics"
          pageSize={15}
        />
      )}
    </div>
  );
}
