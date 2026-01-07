import { useNavigate } from 'react-router-dom';
import { ChevronRight, Search, Globe, Link, FileText } from 'lucide-react';

const reportTypes = [
  {
    id: 'search-query',
    name: 'Search Query',
    description: 'Analyze search queries and keyword performance',
    icon: Search,
    path: '/reports/search-query-report',
  },
  {
    id: 'search-query-words',
    name: 'Search Query Individual Words',
    description: 'Break down search queries into individual words',
    icon: FileText,
    path: null, // TODO: Implement
  },
  {
    id: 'geo-location',
    name: 'Geo Location',
    description: 'Geographic distribution of search traffic',
    icon: Globe,
    path: null, // TODO: Implement
  },
  {
    id: 'domain-placement',
    name: 'Domain Placement',
    description: 'Domain-level placement analysis',
    icon: Link,
    path: null, // TODO: Implement
  },
  {
    id: 'url-placement',
    name: 'URL Placement',
    description: 'URL-level placement analysis',
    icon: Link,
    path: null, // TODO: Implement
  },
];

export default function SearchEngineMarketing() {
  const navigate = useNavigate();

  const handleReportClick = (report) => {
    if (report.path) {
      navigate(report.path);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Search Engine Marketing Reports</h1>
        <div className="w-32 h-1 bg-primary-500 mt-2"></div>
      </div>

      {/* Report List */}
      <div className="bg-white rounded-lg border border-secondary-200">
        <div className="divide-y divide-secondary-100">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              onClick={() => handleReportClick(report)}
              className={`w-full flex items-center justify-between px-6 py-4 hover:bg-secondary-50 transition-colors text-left group ${!report.path ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!report.path}
            >
              <div className="flex items-center gap-4">
                <report.icon className="w-5 h-5 text-secondary-400 group-hover:text-primary-500" />
                <span className="text-secondary-700 group-hover:text-secondary-900 font-medium">
                  {report.name}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary-400 group-hover:text-primary-500" />
            </button>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="text-sm text-secondary-500">
        Select a report type to view detailed search engine marketing analytics.
      </div>
    </div>
  );
}
