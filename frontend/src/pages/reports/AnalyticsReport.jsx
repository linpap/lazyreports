import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Filter, Settings, Download, RefreshCw, Search, Columns, FileDown } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import FilterPanel from '../../components/common/FilterPanel';
import OfferSelector from '../../components/common/OfferSelector';
import GroupBySelector from '../../components/reports/GroupBySelector';
import AnalyticsTable from '../../components/reports/AnalyticsTable';
import DetailModal from '../../components/reports/DetailModal';
import { REPORT_COLUMNS, GROUP_BY_OPTIONS } from '../../constants/reportOptions';

export default function AnalyticsReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();

  // UI State
  const [showFilters, setShowFilters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ filters: {}, matchType: 'any' });
  // Default to Landing Page + Variant (index 14, id: 15)
  const landingPageVariantOption = GROUP_BY_OPTIONS.find(opt => opt.field === 'landing_page_variant') || GROUP_BY_OPTIONS[0];
  const [selectedGroups, setSelectedGroups] = useState([landingPageVariantOption]);
  const [sortConfig, setSortConfig] = useState({ key: 'visitors', direction: 'desc' });

  // Report Options
  const [reportOptions, setReportOptions] = useState({
    usePostDate: false,
    includeBots: false,
  });

  // Table Toolbar State
  const [searchQuery, setSearchQuery] = useState('');
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(
    REPORT_COLUMNS.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );

  // Detail modal state
  const [detailModal, setDetailModal] = useState({
    isOpen: false,
    type: null,
    filters: {},
  });

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Auto-select default offer from DB, or first domain if no default set
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      if (defaultOffer) {
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  // Build query params including filters and grouping
  const getFullQueryParams = useCallback(() => {
    const baseParams = getQueryParams();

    // Add filter params
    Object.entries(activeFilters.filters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        baseParams[key] = values.join(',');
      }
    });
    baseParams.matchType = activeFilters.matchType;

    // Add group by params
    if (selectedGroups.length > 0) {
      baseParams.groupBy = selectedGroups.map(g => g.field).join(',');
    }

    // Add report options
    baseParams.usePostDate = reportOptions.usePostDate;
    baseParams.includeBots = reportOptions.includeBots;

    return baseParams;
  }, [getQueryParams, activeFilters, selectedGroups, reportOptions]);

  // Fetch report data
  // Serialize selectedGroups to ensure query key changes when groups change
  const groupByKey = selectedGroups.map(g => g.field).join(',');
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['analytics-report', startDate, endDate, selectedDkey, activeFilters, groupByKey, sortConfig, reportOptions],
    queryFn: () => analyticsApi.getAnalyticsReport(getFullQueryParams()),
    enabled: !!selectedDkey || domains.length === 0,
  });

  // Check if response is hierarchical (multiple groupBy)
  const isHierarchical = data?.data?.isHierarchical || false;

  // Transform data for table - hierarchical data already has grouping set by backend
  const rawData = (data?.data?.data || []).map((row, idx) => ({
    ...row,
    id: row.id || `row-${idx}`,
    // For hierarchical data, use backend's grouping; for flat data, compute from first group field
    grouping: row.grouping || row[selectedGroups[0]?.field] || row.label || row.date || '-',
  }));

  // Filter data based on search query
  const reportData = searchQuery
    ? rawData.filter(row => {
        const groupValue = String(row.grouping || '').toLowerCase();
        return groupValue.includes(searchQuery.toLowerCase());
      })
    : rawData;

  // Get visible columns
  const filteredColumns = REPORT_COLUMNS.filter(col => visibleColumns[col.key]);

  // CSV Export function
  const handleExportCSV = () => {
    const headers = filteredColumns.map(col => col.label).join(',');
    const rows = reportData.map(row =>
      filteredColumns.map(col => {
        const val = row[col.key];
        if (col.type === 'currency') return `$${Number(val || 0).toFixed(2)}`;
        if (col.type === 'percent') return `${Number(val || 0).toFixed(2)}%`;
        return val || '';
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDomainChange = (dkey, name) => {
    setSelectedDomain(dkey, name);
  };

  const handleFiltersChange = useCallback((newFilters) => {
    setActiveFilters(newFilters);
  }, []);

  const handleCellClick = (columnKey, row) => {
    // Map column key to detail type
    const typeMap = {
      visitors: 'visitors',
      engaged: 'engaged',
      sales: 'sales',
    };

    const type = typeMap[columnKey];
    if (!type) return;

    // Build filters from the row context - include ALL groupBy field values dynamically
    const rowFilters = {};

    // Include all selected groupBy field values from the row
    selectedGroups.forEach(group => {
      const field = group.field;
      if (row[field] !== undefined && row[field] !== null && row[field] !== '') {
        rowFilters[field] = row[field];
      }
    });

    // Include label for drill-down (contains landing_page_variant, page name, etc.)
    // For hierarchical data, use the first groupBy field value if available
    const firstGroupField = selectedGroups[0]?.field;
    if (firstGroupField && row[firstGroupField]) {
      rowFilters.label = row[firstGroupField];
    } else if (row.label) {
      rowFilters.label = row.label;
    } else if (row.grouping) {
      rowFilters.label = row.grouping;
    }

    setDetailModal({
      isOpen: true,
      type,
      filters: rowFilters,
    });
  };

  const handleSort = (newSortConfig) => {
    setSortConfig(newSortConfig);
  };

  // Count active filters
  const activeFilterCount = Object.values(activeFilters.filters).reduce(
    (count, values) => count + (values?.length || 0),
    0
  );

  // Get dynamic first column label
  const tableColumns = filteredColumns.map((col, idx) => {
    if (col.key === 'grouping' && selectedGroups.length > 0) {
      return { ...col, label: selectedGroups[0].label };
    }
    return col;
  });

  // Toggle column visibility
  const toggleColumn = (colKey) => {
    setVisibleColumns(prev => ({
      ...prev,
      [colKey]: !prev[colKey]
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Analytics Report</h1>
          <p className="text-secondary-600 mt-1">
            View overall stats with custom groupings and filters
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Offer Selector */}
          {domains.length > 0 && (
            <OfferSelector
              domains={domains}
              selectedDkey={selectedDkey}
              onChange={handleDomainChange}
              disabled={domainsLoading}
            />
          )}

          {/* Refine Query Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-secondary-300 text-secondary-700 hover:border-primary-500'
            }`}
          >
            <Filter className="w-4 h-4" />
            Refine Query
            {activeFilterCount > 0 && (
              <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showSettings
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-secondary-300 text-secondary-700 hover:border-primary-500'
            }`}
          >
            <Settings className="w-4 h-4" />
            Group By
          </button>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded-lg border border-secondary-300"
            title="Refresh data"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <DateRangePicker />
        </div>
      </div>

      {/* Settings Panel - Group By */}
      {showSettings && (
        <GroupBySelector
          selectedGroups={selectedGroups}
          onChange={setSelectedGroups}
        />
      )}

      {/* Filter Panel */}
      {showFilters && <FilterPanel onFiltersChange={handleFiltersChange} />}

      {/* Report Options Panel */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <div className="flex flex-wrap items-center gap-6">
          <div className="text-sm font-medium text-secondary-700">Report Options:</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reportOptions.usePostDate}
              onChange={(e) => setReportOptions(prev => ({ ...prev, usePostDate: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-600">Use Post Date instead of Event Date</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={reportOptions.includeBots}
              onChange={(e) => setReportOptions(prev => ({ ...prev, includeBots: e.target.checked }))}
              className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm text-secondary-600">Include Bots (Google bots, Bing bots, ...)</span>
          </label>
        </div>
      </div>

      {/* Table Toolbar */}
      <div className="bg-white rounded-lg border border-secondary-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in table..."
              className="pl-9 pr-4 py-2 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent w-64"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility */}
          <div className="relative">
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-600 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50"
            >
              <Columns className="w-4 h-4" />
              Columns
            </button>
            {showColumnSelector && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-secondary-200 rounded-lg shadow-lg z-20 p-2">
                {REPORT_COLUMNS.map(col => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-secondary-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[col.key]}
                      onChange={() => toggleColumn(col.key)}
                      className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-secondary-700">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Download CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-600 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50"
          >
            <FileDown className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Report Table */}
      {error ? (
        <div className="card p-8 text-center">
          <p className="text-red-600">Error loading report data</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <AnalyticsTable
          data={reportData}
          columns={tableColumns}
          groupByFields={selectedGroups}
          onCellClick={handleCellClick}
          onSort={handleSort}
          sortConfig={sortConfig}
          isLoading={isLoading}
          title={`Analytics Report${selectedGroups.length > 0 ? ` by ${selectedGroups.map(g => g.label).join(' > ')}` : ''}`}
        />
      )}

      {/* Detail Modal */}
      <DetailModal
        isOpen={detailModal.isOpen}
        onClose={() => setDetailModal({ isOpen: false, type: null, filters: {} })}
        type={detailModal.type}
        filters={detailModal.filters}
        queryParams={getFullQueryParams()}
      />
    </div>
  );
}
