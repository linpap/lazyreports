import { useEffect, useState, Fragment } from 'react';
import { X, Download, ArrowLeft, Plus, Minus, Search } from 'lucide-react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';

const DETAIL_COLUMNS = {
  visitors: [
    { key: 'since_visit', label: 'Since Visit' },
    { key: 'visitor_id', label: 'Visitor ID' },
    { key: 'total_actions', label: 'Total Actions' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'channel', label: 'Channel' },
    { key: 'subchannel', label: 'Subchannel' },
    { key: 'keyword', label: 'Keyword' },
  ],
  engaged: [
    { key: 'since_visit', label: 'Since Visit' },
    { key: 'page', label: 'Page' },
    { key: 'visitor_id', label: 'Visitor ID' },
    { key: 'action_id', label: 'Action ID' },
    { key: 'total_actions', label: 'Total Actions' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'channel', label: 'Channel' },
    { key: 'subchannel', label: 'Subchannel' },
    { key: 'keyword', label: 'Keyword' },
  ],
  sales: [
    { key: 'since_visit', label: 'Since Visit' },
    { key: 'page', label: 'Page' },
    { key: 'visitor_id', label: 'Visitor ID' },
    { key: 'action_id', label: 'Action ID' },
    { key: 'total_actions', label: 'Total Actions' },
    { key: 'revenue', label: 'Revenue' },
    { key: 'channel', label: 'Channel' },
    { key: 'subchannel', label: 'Subchannel' },
    { key: 'keyword', label: 'Keyword' },
  ],
};

const TITLES = {
  visitors: 'Visitor Details',
  engaged: 'Engagement Details',
  sales: 'Sales Details',
};

// Helper function to safely format values for display
function formatDisplayValue(value) {
  if (value === null || value === undefined) return '-';
  // Handle Buffer objects from database (e.g., {type: "Buffer", data: [...]})
  if (typeof value === 'object' && value.type === 'Buffer' && Array.isArray(value.data)) {
    return String.fromCharCode(...value.data);
  }
  // Handle other objects
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

// Detail row component for displaying label-value pairs
function DetailRow({ label, value, className = '' }) {
  const displayValue = formatDisplayValue(value);
  return (
    <div className={`py-1 ${className}`}>
      <span className="font-semibold text-secondary-700">{label}:</span>{' '}
      <span className="text-secondary-600">{displayValue || '-'}</span>
    </div>
  );
}

// Sub-detail modal for visitor/action details - matches original LazySauce layout
function SubDetailModal({ isOpen, onClose, detailType, detailId, dkey }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sub-detail', detailType, detailId, dkey],
    queryFn: () =>
      detailType === 'visitor'
        ? analyticsApi.getVisitorDetail(detailId, { dkey })
        : analyticsApi.getActionDetail(detailId, { dkey }),
    enabled: isOpen && !!detailId,
  });

  const detail = data?.data?.data;
  const visitor = detailType === 'visitor' ? detail?.visitor : detail;
  const actions = detail?.actions || [];
  const parameters = detail?.parameters || [];

  if (!isOpen) return null;

  // Determine bot status
  const getBotStatus = () => {
    if (visitor?.is_bot === 1 || visitor?.device_is_bot === 1 || visitor?.ip_is_bot === 1) {
      return 'Known Bot';
    }
    return 'Not a bot';
  };

  // Format timezone
  const formatTimezone = () => {
    const offset = visitor?.timezone_offset;
    if (!offset && offset !== 0) return '-';
    const hours = Math.floor(Math.abs(offset) / 60);
    const sign = offset >= 0 ? '+' : '-';
    return `UTC ${sign}${hours}`;
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-1 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-semibold text-secondary-900">
                {detailType === 'visitor' ? 'Visitor' : 'Action'} ID: {detailId}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                <span className="ml-3 text-secondary-600">Loading...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">Error loading details.</div>
            ) : !detail ? (
              <div className="text-center py-8 text-secondary-500">Not found.</div>
            ) : (
              <div className="space-y-6">
                {/* Action Details + Device Details side by side */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Action/Visitor Details Panel */}
                  <div className="border border-secondary-200 rounded-lg overflow-hidden">
                    <div className="bg-rose-700 text-white px-4 py-2 font-semibold text-sm">
                      {detailType === 'visitor' ? 'Visitor' : 'Action'} Details
                    </div>
                    <div className="p-4 text-sm space-y-0.5">
                      <DetailRow label="Lander" value={visitor?.lander || visitor?.domain_name} />
                      <DetailRow label="Variant" value={visitor?.variant || visitor?.visit_variant} />
                      <DetailRow label="Date" value={visitor?.visit_date || visitor?.action_date} />
                      <DetailRow label="Time" value={visitor?.visit_time || visitor?.action_time} />
                      <DetailRow label="IP Address" value={visitor?.ip} />
                      <DetailRow label="Organization" value={visitor?.organization} />
                      <DetailRow label="Country" value={visitor?.country} />
                      <DetailRow label="State" value={visitor?.state} />
                      <DetailRow label="City" value={visitor?.city} />
                      <DetailRow label="Timezone" value={formatTimezone()} />
                      <DetailRow label="Channel" value={visitor?.channel} />
                      <DetailRow label="Subchannel" value={visitor?.subchannel} />
                      <DetailRow label="Keyword" value={visitor?.keyword} />
                      <DetailRow label="Raw Keyword" value={visitor?.rawword || visitor?.target} />
                      <DetailRow label="Referral Domain" value={visitor?.referral_domain || visitor?.srcdom} />
                      <DetailRow label="Referer URL" value={visitor?.referer_url || visitor?.referer} />
                      <DetailRow label="Revenue" value={`$${(detail?.total_revenue || parseFloat(visitor?.revenue) || 0).toFixed(2)}`} />
                      <div className="border-t border-secondary-100 my-2"></div>
                      <DetailRow label="Known Bot" value={getBotStatus()} />
                      <DetailRow label="Fraud Score" value={visitor?.fraud_score || '-'} />
                      <DetailRow label="Proxy" value={visitor?.is_proxy ? visitor?.proxy_type || 'Yes' : 'NONE'} />
                      <DetailRow label="Crawler" value={visitor?.is_crawler ? visitor?.crawler_name || 'Yes' : 'NONE'} />
                      <DetailRow label="Threat" value={visitor?.threat_level || 'NONE'} />
                    </div>
                  </div>

                  {/* Device Details Panel */}
                  <div className="border border-secondary-200 rounded-lg overflow-hidden">
                    <div className="bg-rose-700 text-white px-4 py-2 font-semibold text-sm">
                      Device Details
                    </div>
                    <div className="p-4 text-sm space-y-0.5">
                      <DetailRow label="User Agent" value={visitor?.user_agent} />
                      <DetailRow label="Device Type" value={visitor?.device_type} />
                      <DetailRow label="Operating System" value={visitor?.os} />
                      <DetailRow label="Operating System Version" value={visitor?.os_version} />
                      <DetailRow label="Browser" value={visitor?.browser} />
                      <DetailRow label="Browser Version" value={visitor?.browser_version} />
                      <DetailRow label="Brand" value={visitor?.brand} />
                      <DetailRow label="Name" value={visitor?.device_name} />
                      <DetailRow label="Device Model" value={visitor?.device_model} />
                      <DetailRow
                        label="Device Size"
                        value={visitor?.device_width && visitor?.device_height
                          ? `${visitor.device_width} X ${visitor.device_height}`
                          : null}
                      />
                      <DetailRow label="Language" value={visitor?.language || visitor?.lang} />
                      <DetailRow
                        label="Device Screen"
                        value={visitor?.screen_width && visitor?.screen_height
                          ? `${visitor.screen_width}x${visitor.screen_height}${visitor?.color_depth ? `x${visitor.color_depth}` : ''}`
                          : visitor?.lazy_screen}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions Table */}
                <div className="border border-secondary-200 rounded-lg overflow-hidden">
                  <div className="bg-secondary-100 px-4 py-2 font-semibold text-sm text-secondary-700">
                    Actions
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-rose-700 text-white">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold">Action ID</th>
                          <th className="px-4 py-2 text-left font-semibold">Page</th>
                          <th className="px-4 py-2 text-left font-semibold">Variant</th>
                          <th className="px-4 py-2 text-left font-semibold">Date</th>
                          <th className="px-4 py-2 text-left font-semibold">Time</th>
                          <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-secondary-100">
                        {actions.length > 0 ? (
                          actions.map((action, idx) => (
                            <tr key={idx} className="hover:bg-secondary-50">
                              <td className="px-4 py-2">{action.action_id}</td>
                              <td className="px-4 py-2">{action.page || '-'}</td>
                              <td className="px-4 py-2">{action.variant || '-'}</td>
                              <td className="px-4 py-2">{action.date || '-'}</td>
                              <td className="px-4 py-2">{action.time || '-'}</td>
                              <td className="px-4 py-2 text-right">${(parseFloat(action.revenue) || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-4 text-center text-secondary-500">
                              No actions recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Added Parameters Table */}
                {parameters.length > 0 && (
                  <div className="border border-secondary-200 rounded-lg overflow-hidden">
                    <div className="bg-secondary-100 px-4 py-2 font-semibold text-sm text-secondary-700">
                      Added Parameters
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-rose-700 text-white">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Defined At</th>
                            <th className="px-4 py-2 text-center font-semibold">Name</th>
                            <th className="px-4 py-2 text-center font-semibold">Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary-100">
                          {parameters.map((param, idx) => (
                            <tr key={idx} className="hover:bg-secondary-50">
                              <td className="px-4 py-2">{param.defined_at || 'Visitor'}</td>
                              <td className="px-4 py-2 text-center">{param.name}</td>
                              <td className="px-4 py-2 text-center text-primary-600 break-all">
                                {param.value || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline expanded row detail component
function ExpandedRowDetail({ visitorId, actionId, dkey }) {
  // Fetch action details by default (since we're in engaged/sales modal)
  const { data, isLoading, error } = useQuery({
    queryKey: ['expanded-detail', actionId || visitorId, dkey],
    queryFn: () =>
      actionId
        ? analyticsApi.getActionDetail(actionId, { dkey })
        : analyticsApi.getVisitorDetail(visitorId, { dkey }),
    enabled: !!(actionId || visitorId),
  });

  const detail = data?.data?.data;
  const visitor = detail?.visitor_id ? detail : detail?.visitor;

  if (isLoading) {
    return (
      <div className="flex items-center py-4">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
        <span className="ml-2 text-secondary-600 text-sm">Loading details...</span>
      </div>
    );
  }

  if (error || !detail) {
    return <div className="text-sm text-secondary-500 py-2">Unable to load details.</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Visitor/Action Details */}
      <div className="text-sm">
        <h5 className="font-semibold text-secondary-700 mb-2 border-b pb-1">Details</h5>
        <div className="space-y-1">
          <div><span className="font-medium">Visitor ID:</span> {visitor?.visitor_id || detail?.visitor_id}</div>
          <div><span className="font-medium">IP:</span> {visitor?.ip || '-'}</div>
          <div><span className="font-medium">Organization:</span> {visitor?.organization || '-'}</div>
          <div><span className="font-medium">Country:</span> {visitor?.country || '-'}</div>
          <div><span className="font-medium">Channel:</span> {visitor?.channel || '-'}</div>
          <div><span className="font-medium">Subchannel:</span> {visitor?.subchannel || '-'}</div>
          <div><span className="font-medium">Keyword:</span> {visitor?.keyword || '-'}</div>
        </div>
      </div>

      {/* Device Details */}
      <div className="text-sm">
        <h5 className="font-semibold text-secondary-700 mb-2 border-b pb-1">Device</h5>
        <div className="space-y-1">
          <div><span className="font-medium">Device Type:</span> {visitor?.device_type || '-'}</div>
          <div><span className="font-medium">OS:</span> {visitor?.os} {visitor?.os_version}</div>
          <div><span className="font-medium">Browser:</span> {visitor?.browser} {visitor?.browser_version}</div>
          <div><span className="font-medium">Brand:</span> {visitor?.brand || '-'}</div>
          <div><span className="font-medium">Model:</span> {visitor?.device_model || '-'}</div>
          <div>
            <span className="font-medium">Screen:</span>{' '}
            {visitor?.device_width && visitor?.device_height
              ? `${visitor.device_width} x ${visitor.device_height}`
              : '-'}
          </div>
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 25;

export default function DetailModal({ isOpen, onClose, type, filters, queryParams }) {
  const [subDetail, setSubDetail] = useState({ isOpen: false, type: null, id: null });
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const toggleRowExpand = (idx) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  // Reset expanded rows, page, and search when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setExpandedRows(new Set());
      setCurrentPage(1);
      setSearchQuery('');
      setDebouncedSearch('');
    }
  }, [isOpen, type, JSON.stringify(filters)]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to first page when search changes
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (subDetail.isOpen) {
          setSubDetail({ isOpen: false, type: null, id: null });
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, subDetail.isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const offset = (currentPage - 1) * PAGE_SIZE;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['detail-report', type, filters, queryParams, currentPage, debouncedSearch],
    queryFn: () => analyticsApi.getAnalyticsDetail({
      ...queryParams,
      ...filters,
      type,
      limit: PAGE_SIZE,
      offset,
      search: debouncedSearch || undefined
    }),
    enabled: isOpen,
    staleTime: 0, // Always consider data stale
    refetchOnMount: 'always', // Refetch every time modal opens
    placeholderData: keepPreviousData, // Keep showing old data while fetching new page (v5 API)
  });

  const details = data?.data?.data || [];
  const hasMore = data?.data?.hasMore ?? (details.length === PAGE_SIZE);
  // Only show full loading on initial load, not on pagination
  const showFullLoading = isLoading && details.length === 0;

  const columns = DETAIL_COLUMNS[type] || DETAIL_COLUMNS.visitors;
  const title = TITLES[type] || 'Details';

  const handleIdClick = (idType, id) => {
    setSubDetail({
      isOpen: true,
      type: idType === 'visitor_id' ? 'visitor' : 'action',
      id: id
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
            <div>
              <h2 className="text-lg font-semibold text-secondary-900">{title}</h2>
              {filters && Object.keys(filters).length > 0 && (
                <p className="text-sm text-secondary-500 mt-1">
                  Filtered by: {Object.entries(filters).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-4 py-2 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
                />
              </div>
              <button
                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded"
                title="Download CSV"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6 relative">
            {/* Loading overlay for pagination - shows over existing content */}
            {isFetching && !showFullLoading && (
              <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
              </div>
            )}
            {showFullLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
                <span className="ml-3 text-secondary-600">Loading details...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">
                Error loading details. Please try again.
              </div>
            ) : details.length === 0 ? (
              <div className="text-center py-12 text-secondary-500">
                No detail records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-2 py-3 w-10"></th>
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {details.map((row, idx) => {
                      const isExpanded = expandedRows.has(idx);
                      const visitorId = row.visitor_id;
                      const actionId = row.action_id;

                      return (
                        <Fragment key={idx}>
                          <tr className="hover:bg-secondary-50">
                            <td className="px-2 py-3">
                              <button
                                onClick={() => toggleRowExpand(idx)}
                                className="p-1 text-secondary-500 hover:text-primary-600 hover:bg-secondary-100 rounded"
                              >
                                {isExpanded ? (
                                  <Minus className="w-4 h-4" />
                                ) : (
                                  <Plus className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                            {columns.map((col) => {
                              let value = row[col.key];
                              // Handle MySQL Buffer/object values
                              if (value && typeof value === 'object') {
                                if (value.type === 'Buffer' && value.data) {
                                  value = String.fromCharCode(...value.data);
                                } else if (value.data !== undefined) {
                                  value = String(value.data);
                                } else {
                                  value = JSON.stringify(value);
                                }
                              }

                              // Make visitor_id and action_id clickable
                              const isClickable = col.key === 'visitor_id' || col.key === 'action_id';

                              return (
                                <td key={col.key} className="px-4 py-3 text-sm text-secondary-700">
                                  {col.key === 'revenue' ? (
                                    `$${Number(value || 0).toFixed(2)}`
                                  ) : isClickable && value ? (
                                    <button
                                      onClick={() => handleIdClick(col.key, value)}
                                      className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
                                    >
                                      {value}
                                    </button>
                                  ) : (
                                    value || '-'
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                          {isExpanded && (
                            <tr className="bg-secondary-50">
                              <td colSpan={columns.length + 1} className="p-4">
                                <ExpandedRowDetail
                                  visitorId={visitorId}
                                  actionId={actionId}
                                  dkey={queryParams?.dkey}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer with Pagination */}
          <div className="px-6 py-4 border-t border-secondary-200 flex items-center justify-between">
            <span className="text-sm text-secondary-500">
              Showing {details.length > 0 ? offset + 1 : 0} - {offset + details.length} records
              {hasMore && ' (more available)'}
            </span>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-2 py-1 text-sm font-medium text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm font-medium text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-3 py-1 text-sm text-secondary-700">
                Page {currentPage}
              </span>
              <button
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={!hasMore}
                className="px-3 py-1 text-sm font-medium text-secondary-600 bg-secondary-100 hover:bg-secondary-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-secondary-700 bg-secondary-100 hover:bg-secondary-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Sub-detail modal */}
      <SubDetailModal
        isOpen={subDetail.isOpen}
        onClose={() => setSubDetail({ isOpen: false, type: null, id: null })}
        detailType={subDetail.type}
        detailId={subDetail.id}
        dkey={queryParams?.dkey}
      />
    </div>
  );
}
