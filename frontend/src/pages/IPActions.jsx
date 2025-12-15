import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Search, Trash2, Shield } from 'lucide-react';
import { dataApi } from '../services/api';
import { useFilterStore } from '../store/filterStore';
import DateRangePicker from '../components/common/DateRangePicker';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function IPActions() {
  const [ipSearch, setIpSearch] = useState('');
  const queryClient = useQueryClient();
  const { startDate, endDate, getQueryParams } = useFilterStore();

  const { data, isLoading, error } = useQuery({
    queryKey: ['ip-actions', startDate, endDate, ipSearch],
    queryFn: () =>
      dataApi.getIPActions({
        ...getQueryParams(),
        ip: ipSearch || undefined,
      }),
  });

  const clearMutation = useMutation({
    mutationFn: (ip) => dataApi.clearIP(ip),
    onSuccess: () => {
      queryClient.invalidateQueries(['ip-actions']);
      toast.success('IP records cleared');
    },
    onError: () => {
      toast.error('Failed to clear IP');
    },
  });

  const ipActions = data?.data?.data || [];

  const columns = [
    { key: 'ip_address', label: 'IP Address' },
    { key: 'action', label: 'Action' },
    { key: 'user_agent', label: 'User Agent' },
    { key: 'country', label: 'Country' },
    {
      key: 'created_at',
      label: 'Timestamp',
      render: (v) => v ? new Date(v).toLocaleString() : '-',
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (_, row) => (
        <button
          onClick={() => clearMutation.mutate(row.ip_address)}
          className="btn btn-ghost text-red-600 hover:bg-red-50 p-2"
          title="Clear IP records"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">IP Actions</h1>
          <p className="text-secondary-600 mt-1">
            View and manage IP activity records
          </p>
        </div>
        <DateRangePicker />
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search by IP address..."
            value={ipSearch}
            onChange={(e) => setIpSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading IP actions</p>
        </div>
      ) : ipActions.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
          <p className="text-secondary-500">No IP actions found</p>
        </div>
      ) : (
        <DataTable
          data={ipActions}
          columns={columns}
          title={`IP Actions (${ipActions.length})`}
          pageSize={20}
          searchable={false}
        />
      )}
    </div>
  );
}
