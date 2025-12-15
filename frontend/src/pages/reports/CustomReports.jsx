import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, Edit, Star } from 'lucide-react';
import { reportsApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function CustomReports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['saved-reports'],
    queryFn: () => reportsApi.getSavedReports(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => reportsApi.deleteReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-reports']);
      toast.success('Report deleted');
    },
    onError: () => {
      toast.error('Failed to delete report');
    },
  });

  const reports = data?.data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Custom Reports</h1>
          <p className="text-secondary-600 mt-1">
            Manage your saved custom reports
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Report
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : reports.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-secondary-500 mb-4">No saved reports yet</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="card p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-secondary-900 flex items-center gap-2">
                    {report.name}
                    {report.is_default && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </h3>
                  <p className="text-sm text-secondary-500 mt-1">
                    {report.description || 'No description'}
                  </p>
                </div>
              </div>
              <div className="text-xs text-secondary-400 mb-4">
                Created: {new Date(report.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2">
                <button className="btn btn-secondary flex-1">
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => deleteMutation.mutate(report.id)}
                  className="btn btn-danger p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
