import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit, Star, Play,
  Radio, Globe, Smartphone, Search, FileText,
  BarChart3, MapPin, Monitor, Tag
} from 'lucide-react';
import { reportsApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Predefined custom report templates matching PHP app
const PREDEFINED_REPORTS = [
  {
    id: 'channel-analytics',
    name: 'Channel Analytics',
    description: 'Analyze performance by traffic channel',
    icon: Radio,
    groupBy: 'channel',
    color: 'bg-blue-500',
  },
  {
    id: 'country-analytics',
    name: 'Country Analytics',
    description: 'Analyze performance by visitor country',
    icon: Globe,
    groupBy: 'country',
    color: 'bg-green-500',
  },
  {
    id: 'device-analytics',
    name: 'Device Analytics',
    description: 'Analyze performance by device type',
    icon: Smartphone,
    groupBy: 'device_type',
    color: 'bg-purple-500',
  },
  {
    id: 'keyword-analytics',
    name: 'Keyword Analytics',
    description: 'Analyze performance by keyword/target',
    icon: Search,
    groupBy: 'keyword',
    color: 'bg-orange-500',
  },
  {
    id: 'rawword-analytics',
    name: 'Rawword Analytics',
    description: 'Analyze performance by raw search terms',
    icon: Tag,
    groupBy: 'rawword',
    color: 'bg-pink-500',
  },
  {
    id: 'subchannel-analytics',
    name: 'Subchannel Analytics',
    description: 'Analyze performance by subchannel',
    icon: BarChart3,
    groupBy: 'subchannel',
    color: 'bg-indigo-500',
  },
  {
    id: 'state-analytics',
    name: 'State/Region Analytics',
    description: 'Analyze performance by state or region',
    icon: MapPin,
    groupBy: 'state',
    color: 'bg-teal-500',
  },
  {
    id: 'browser-analytics',
    name: 'Browser Analytics',
    description: 'Analyze performance by browser',
    icon: Monitor,
    groupBy: 'browser',
    color: 'bg-cyan-500',
  },
  {
    id: 'os-analytics',
    name: 'OS Analytics',
    description: 'Analyze performance by operating system',
    icon: Monitor,
    groupBy: 'os',
    color: 'bg-amber-500',
  },
  {
    id: 'landing-page-analytics',
    name: 'Landing Page Analytics',
    description: 'Analyze performance by landing page',
    icon: FileText,
    groupBy: 'landing_page',
    color: 'bg-rose-500',
  },
];

export default function CustomReports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const runPredefinedReport = (report) => {
    // Navigate to analytics report with preset groupBy
    navigate(`/reports/analytics?groupBy=${report.groupBy}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Custom Reports</h1>
          <p className="text-secondary-600 mt-1">
            Quick access to predefined reports and your saved custom reports
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

      {/* Predefined Reports Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-secondary-800">Quick Reports</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PREDEFINED_REPORTS.map((report) => (
            <button
              key={report.id}
              onClick={() => runPredefinedReport(report)}
              className="card p-4 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] text-left group"
            >
              <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <report.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-secondary-900 text-sm mb-1">
                {report.name}
              </h3>
              <p className="text-xs text-secondary-500 line-clamp-2">
                {report.description}
              </p>
              <div className="mt-3 flex items-center text-xs text-primary-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-3 h-3 mr-1" />
                Run Report
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Saved Reports Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-secondary-800">Saved Reports</h2>
        {isLoading ? (
          <LoadingSpinner />
        ) : reports.length === 0 ? (
          <div className="card p-8 text-center">
            <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
            <p className="text-secondary-500 mb-4">No saved reports yet</p>
            <p className="text-sm text-secondary-400">
              Save your frequently used report configurations from the Analytics Report page
            </p>
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
                  <button
                    onClick={() => {
                      // Load saved report config and navigate
                      const config = typeof report.config === 'string'
                        ? JSON.parse(report.config)
                        : report.config;
                      const params = new URLSearchParams();
                      if (config.groupBy) params.set('groupBy', config.groupBy);
                      if (config.startDate) params.set('startDate', config.startDate);
                      if (config.endDate) params.set('endDate', config.endDate);
                      if (config.dkey) params.set('dkey', config.dkey);
                      navigate(`/reports/analytics?${params.toString()}`);
                    }}
                    className="btn btn-primary flex-1"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Run
                  </button>
                  <button className="btn btn-secondary p-2">
                    <Edit className="w-4 h-4" />
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
    </div>
  );
}
