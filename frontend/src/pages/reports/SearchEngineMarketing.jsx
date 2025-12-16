import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Search, FileDown } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';
import OfferSelector from '../../components/common/OfferSelector';

// Format number with commas
const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString();
};

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format percentage
const formatPercent = (value) => {
  if (value === null || value === undefined) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
};

export default function SearchEngineMarketing() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch user's available domains
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Auto-select default offer
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      if (defaultOffer) {
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  // Fetch SEM data - grouping by keyword/rawword
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sem-report', startDate, endDate, selectedDkey],
    queryFn: () => analyticsApi.getAnalyticsReport({
      ...getQueryParams(),
      groupBy: 'rawword',
    }),
    enabled: !!selectedDkey,
  });

  const rawData = data?.data?.data || [];

  // Filter data based on search
  const reportData = searchQuery
    ? rawData.filter(row => {
        const keyword = String(row.label || row.rawword || '').toLowerCase();
        return keyword.includes(searchQuery.toLowerCase());
      })
    : rawData;

  const handleDomainChange = (dkey, name) => {
    setSelectedDomain(dkey, name);
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Keyword', 'Visitors', 'Engaged', 'Engage %', 'Sales', 'Sales %', 'Revenue', 'AOV', 'EPC'].join(',');
    const rows = reportData.map(row => [
      `"${row.label || row.rawword || ''}"`,
      row.visitors || 0,
      row.engaged || 0,
      `${Number(row.engage_rate || 0).toFixed(2)}%`,
      row.sales || 0,
      `${Number(row.sales_rate || 0).toFixed(2)}%`,
      formatCurrency(row.revenue),
      formatCurrency(row.aov),
      formatCurrency(row.epc),
    ].join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sem-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totals = reportData.reduce((acc, row) => ({
    visitors: acc.visitors + (Number(row.visitors) || 0),
    engaged: acc.engaged + (Number(row.engaged) || 0),
    sales: acc.sales + (Number(row.sales) || 0),
    revenue: acc.revenue + (Number(row.revenue) || 0),
  }), { visitors: 0, engaged: 0, sales: 0, revenue: 0 });

  totals.engage_rate = totals.visitors > 0 ? (totals.engaged / totals.visitors) * 100 : 0;
  totals.sales_rate = totals.visitors > 0 ? (totals.sales / totals.visitors) * 100 : 0;
  totals.aov = totals.sales > 0 ? totals.revenue / totals.sales : 0;
  totals.epc = totals.visitors > 0 ? totals.revenue / totals.visitors : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Search Engine Marketing</h1>
          <p className="text-secondary-600 mt-1">
            Analyze keyword performance and search traffic metrics
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

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-secondary-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords..."
            className="pl-9 pr-4 py-2 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 w-64"
          />
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-secondary-600 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50"
        >
          <FileDown className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-secondary-200">
          <h3 className="font-semibold text-secondary-900">Keyword Performance</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Keyword</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Visitors</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Engaged</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Engage %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Sales</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Sales %</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">AOV</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">EPC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                      <span className="ml-3 text-secondary-600">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-secondary-500">
                    No keyword data available
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 text-sm font-medium text-secondary-900">{row.label || row.rawword || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatNumber(row.visitors)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatNumber(row.engaged)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatPercent(row.engage_rate)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatNumber(row.sales)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatPercent(row.sales_rate)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.aov)}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.epc)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {reportData.length > 0 && (
              <tfoot className="bg-secondary-100 font-semibold">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-secondary-900">TOTALS</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(totals.visitors)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(totals.engaged)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPercent(totals.engage_rate)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatNumber(totals.sales)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatPercent(totals.sales_rate)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.revenue)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.aov)}</td>
                  <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.epc)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="px-4 py-3 border-t border-secondary-200 text-sm text-secondary-500">
          {reportData.length} keywords
        </div>
      </div>
    </div>
  );
}
