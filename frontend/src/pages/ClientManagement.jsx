import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Plus, Building2 } from 'lucide-react';
import { dataApi } from '../services/api';
import DataTable from '../components/common/DataTable';
import LoadingSpinner from '../components/common/LoadingSpinner';

const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'email', label: 'Email' },
  {
    key: 'active',
    label: 'Status',
    render: (v) => (
      <span className={`badge ${v ? 'badge-success' : 'badge-danger'}`}>
        {v ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  { key: 'created_at', label: 'Created', render: (v) => v ? new Date(v).toLocaleDateString() : '-' },
];

export default function ClientManagement() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['clients', search, activeFilter],
    queryFn: () =>
      dataApi.getClients({
        search: search || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'active',
      }),
  });

  const clients = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Client Management</h1>
          <p className="text-secondary-600 mt-1">
            Manage client accounts and settings
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9"
            />
          </div>
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="input w-full sm:w-40"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading clients</p>
        </div>
      ) : clients.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
          <p className="text-secondary-500">No clients found</p>
        </div>
      ) : (
        <DataTable
          data={clients}
          columns={columns}
          title={`Clients (${clients.length})`}
          pageSize={15}
          searchable={false}
        />
      )}
    </div>
  );
}
