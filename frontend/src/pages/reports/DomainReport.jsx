import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { analyticsApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function DomainReport() {
  const queryClient = useQueryClient();
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);

  const { data, isLoading, error } = useQuery({
    queryKey: ['domain-report', pageSize, currentPage],
    queryFn: () => analyticsApi.getDomainReport({
      limit: pageSize,
      offset: currentPage * pageSize
    }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ dkey, aid }) => analyticsApi.updateDomainAdvertiser(dkey, aid),
    onSuccess: () => {
      queryClient.invalidateQueries(['domain-report']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (dkey) => analyticsApi.deleteDomain(dkey),
    onSuccess: () => {
      queryClient.invalidateQueries(['domain-report']);
    },
  });

  const handleAdvertiserChange = (dkey, aid) => {
    updateMutation.mutate({ dkey, aid: aid || null });
  };

  const handleDelete = (dkey, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(dkey);
    }
  };

  const reportData = data?.data?.data || [];
  const pagination = data?.data?.pagination || { total: 0, pages: 1 };
  const advertisers = data?.data?.advertisers || [];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const totalPages = pagination.pages || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Domain Report</h1>
          <p className="text-secondary-600 mt-1 text-sm">
            as of {new Date().toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-secondary-600">Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(0);
            }}
            className="border border-secondary-300 rounded px-3 py-1.5 text-sm"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading domain data</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary-800 text-white text-left text-sm">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Advertiser</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium">IP</th>
                  <th className="px-4 py-3 font-medium">Last Update</th>
                  <th className="px-4 py-3 font-medium">Count</th>
                  <th className="px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-200">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-secondary-500">
                      No domains found
                    </td>
                  </tr>
                ) : (
                  reportData.map((row) => (
                    <tr key={row.dkey} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {row.name}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={row.aid || ''}
                          onChange={(e) => handleAdvertiserChange(row.dkey, e.target.value)}
                          className="border border-secondary-300 rounded px-2 py-1 text-sm w-full max-w-[150px]"
                          disabled={updateMutation.isLoading}
                        >
                          <option value="">Unlicensed</option>
                          {advertisers.map((adv) => (
                            <option key={adv.aid} value={adv.aid}>
                              {adv.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600">
                        {formatDate(row.created)}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600 font-mono">
                        {row.ip || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600">
                        {formatDate(row.last_update)}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        {row.count?.toLocaleString() || '0'}
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-600">
                        {row.notes || ''}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDelete(row.dkey, row.name)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-3 border-t border-secondary-200 flex items-center justify-between">
            <div className="text-sm text-secondary-600">
              {pagination.total > 0 ? (
                <>
                  {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, pagination.total)} out of {pagination.total}
                </>
              ) : (
                'No results'
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(0)}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                « First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ›
              </button>
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-3 py-1 text-sm border border-secondary-300 rounded hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last »
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
