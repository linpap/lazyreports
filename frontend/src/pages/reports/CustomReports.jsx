import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit, Star, Play, ChevronRight,
  Radio, Globe, Smartphone, Search, FileText,
  BarChart3, MapPin, Monitor, Tag, Users, Building2, Eye,
  AlertTriangle, ShieldAlert, ListDetails
} from 'lucide-react';
import { reportsApi, dataApi } from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Quick access report templates
const QUICK_REPORTS = [
  { id: 'channel', name: 'Channel Analytics', groupBy: 'channel', icon: Radio, color: 'bg-blue-500' },
  { id: 'country', name: 'Country Analytics', groupBy: 'country', icon: Globe, color: 'bg-green-500' },
  { id: 'device', name: 'Device Analytics', groupBy: 'device_type', icon: Smartphone, color: 'bg-purple-500' },
  { id: 'keyword', name: 'Keyword Analytics', groupBy: 'keyword', icon: Search, color: 'bg-orange-500' },
  { id: 'rawword', name: 'Rawword Analytics', groupBy: 'rawword', icon: Tag, color: 'bg-pink-500' },
  { id: 'affiliate', name: 'Affiliate Report', link: '/reports/affiliate', icon: Users, color: 'bg-teal-500' },
  { id: 'details', name: 'Details Report', link: '/reports/details', icon: ListDetails, color: 'bg-indigo-500' },
  { id: 'offenders', name: 'Offenders Report', link: '/reports/offenders', icon: AlertTriangle, color: 'bg-red-500' },
  { id: 'victims', name: 'Victims Report', link: '/reports/victims', icon: ShieldAlert, color: 'bg-orange-500' },
];

// Report category component matching PHP layout
function ReportCategory({ title, reports, onReportClick }) {
  if (!reports || reports.length === 0) return null;

  return (
    <div className="card">
      <div className="px-4 py-3 border-b border-secondary-100 bg-secondary-50">
        <h3 className="font-semibold text-secondary-800">{title}</h3>
      </div>
      <div className="divide-y divide-secondary-100">
        {reports.map((report, idx) => (
          <button
            key={`${report.id}-${idx}`}
            onClick={() => onReportClick(report)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-primary-50 transition-colors text-left group"
          >
            <span className="text-secondary-700 group-hover:text-primary-600">
              {report.name}
            </span>
            <ChevronRight className="w-4 h-4 text-secondary-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CustomReports() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Fetch user's custom reports from database
  const { data: customReportsData, isLoading: customReportsLoading } = useQuery({
    queryKey: ['custom-reports-db'],
    queryFn: () => dataApi.getCustomReportsFromDB(),
  });

  // Fetch saved report configurations
  const { data: savedReportsData, isLoading: savedReportsLoading } = useQuery({
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

  const customReports = customReportsData?.data?.data || { searchlight: [], dejavu: [], client: [] };
  const savedReports = savedReportsData?.data?.data || [];
  const isLoading = customReportsLoading || savedReportsLoading;

  const hasCustomReports =
    customReports.searchlight.length > 0 ||
    customReports.dejavu.length > 0 ||
    customReports.client.length > 0;

  const handleQuickReport = (report) => {
    if (report.link) {
      navigate(report.link);
    } else {
      navigate(`/reports/analytics?groupBy=${report.groupBy}`);
    }
  };

  const handleCustomReport = (report) => {
    // Navigate to the report link (external links open in new tab)
    if (report.link.startsWith('http')) {
      window.open(report.link, '_blank');
    } else {
      // Internal links - try to map to React routes
      // Normalize the link (remove trailing slash for consistent matching)
      const normalizedLink = report.link.endsWith('/') ? report.link : report.link + '/';
      const linkMap = {
        '/client-management/': '/clients',
        '/advertiser-report/': '/advertisers',
        '/domain-report/': '/reports/domain',
        '/affiliate-report/': '/reports/affiliate',
        '/details-report/': '/reports/details',
        '/offenders-report/': '/reports/offenders',
        '/victims-report/': '/reports/victims',
        '/site-conversion-report/': '/reports/conversions',
        '/channel-subchannel-report/': '/reports/analytics?groupBy=subchannel',
        '/payday-conversion-report/': '/reports/conversions',
        '/madrivo-report/': '/reports/analytics',
      };
      const mappedLink = linkMap[normalizedLink] || report.link;
      navigate(mappedLink);
    }
  };

  const handleSavedReport = (report) => {
    const config = typeof report.config === 'string'
      ? JSON.parse(report.config)
      : report.config;
    const params = new URLSearchParams();
    if (config.groupBy) params.set('groupBy', config.groupBy);
    if (config.startDate) params.set('startDate', config.startDate);
    if (config.endDate) params.set('endDate', config.endDate);
    if (config.dkey) params.set('dkey', config.dkey);
    navigate(`/reports/analytics?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Custom Reports</h1>
          <p className="text-secondary-600 mt-1">
            Access your custom reports and quick analytics views
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Quick Reports Section */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-secondary-500 uppercase tracking-wider">
              Quick Reports
            </h2>
            <div className="flex flex-wrap gap-2">
              {QUICK_REPORTS.map((report) => (
                <button
                  key={report.id}
                  onClick={() => handleQuickReport(report)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-secondary-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-all group"
                >
                  <div className={`w-6 h-6 ${report.color} rounded flex items-center justify-center`}>
                    <report.icon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-secondary-700 group-hover:text-primary-600">
                    {report.name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-secondary-400 group-hover:text-primary-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Reports from Database - 3 column layout matching screenshot */}
          {hasCustomReports && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-secondary-500 uppercase tracking-wider">
                Your Custom Reports
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <ReportCategory
                  title="Searchlight Custom Reports"
                  reports={customReports.searchlight}
                  onReportClick={handleCustomReport}
                />
                <ReportCategory
                  title="Dejavu Custom Reports"
                  reports={customReports.dejavu}
                  onReportClick={handleCustomReport}
                />
                <ReportCategory
                  title="Client Custom Reports"
                  reports={customReports.client}
                  onReportClick={handleCustomReport}
                />
              </div>
            </div>
          )}

          {/* Saved Report Configurations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-secondary-500 uppercase tracking-wider">
                Saved Report Configurations
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn btn-sm btn-secondary"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </button>
            </div>

            {savedReports.length === 0 ? (
              <div className="card p-8 text-center">
                <FileText className="w-10 h-10 text-secondary-300 mx-auto mb-3" />
                <p className="text-secondary-500 text-sm">No saved reports yet</p>
                <p className="text-secondary-400 text-xs mt-1">
                  Save report configurations from the Analytics page
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReports.map((report) => (
                  <div key={report.id} className="card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-secondary-900 flex items-center gap-2">
                        {report.name}
                        {report.is_default && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                      </h3>
                    </div>
                    <p className="text-xs text-secondary-500 mb-3">
                      {report.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSavedReport(report)}
                        className="btn btn-sm btn-primary flex-1"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(report.id)}
                        className="btn btn-sm btn-danger p-2"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
