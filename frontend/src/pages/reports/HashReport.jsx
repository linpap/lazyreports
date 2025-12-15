import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, RefreshCw, Search, FileDown, Hash } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import DateRangePicker from '../../components/common/DateRangePicker';

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export default function HashReport() {
  const { startDate, endDate, selectedDkey, setSelectedDomain, getQueryParams } = useFilterStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [hashInput, setHashInput] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

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

  // Fetch hash/action report data
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hash-report', startDate, endDate, selectedDkey],
    queryFn: () => analyticsApi.getAnalyticsDetail({
      ...getQueryParams(),
      type: 'sales',
      limit: 500,
    }),
    enabled: !!selectedDkey,
  });

  const rawData = data?.data?.data || [];

  // Filter data based on search
  const reportData = searchQuery
    ? rawData.filter(row => {
        const hash = String(row.hash || row.action_id || '').toLowerCase();
        const page = String(row.page || '').toLowerCase();
        return hash.includes(searchQuery.toLowerCase()) || page.includes(searchQuery.toLowerCase());
      })
    : rawData;

  const handleDomainChange = (e) => {
    const dkey = e.target.value;
    const domain = domains.find((d) => d.dkey === dkey);
    setSelectedDomain(dkey, domain?.name || '');
  };

  // Hash lookup function
  const handleHashLookup = () => {
    if (!hashInput.trim()) return;

    const found = rawData.find(row =>
      row.hash === hashInput.trim() ||
      String(row.action_id) === hashInput.trim() ||
      String(row.visitor_id) === hashInput.trim()
    );

    setLookupResult(found || { notFound: true, query: hashInput });
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Hash/ID', 'Page', 'Visitor ID', 'Action ID', 'Date', 'Revenue', 'Channel', 'Subchannel'].join(',');
    const rows = reportData.map(row => [
      `"${row.hash || row.action_id || ''}"`,
      `"${row.page || ''}"`,
      row.visitor_id || '',
      row.action_id || '',
      row.date || row.since_visit || '',
      formatCurrency(row.revenue),
      `"${row.channel || ''}"`,
      `"${row.subchannel || ''}"`,
    ].join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hash-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Hash Report</h1>
          <p className="text-secondary-600 mt-1">
            Look up transactions by hash ID or action identifier
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Offer Selector */}
          {domains.length > 0 && (
            <div className="relative">
              <select
                value={selectedDkey || ''}
                onChange={handleDomainChange}
                className="appearance-none bg-white border border-secondary-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-secondary-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
                disabled={domainsLoading}
              >
                <option value="" disabled>Select Offer</option>
                {domains.map((domain) => (
                  <option key={domain.dkey} value={domain.dkey}>
                    {domain.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400 pointer-events-none" />
            </div>
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

      {/* Hash Lookup */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Hash className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-secondary-900">Hash Lookup</h2>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={hashInput}
            onChange={(e) => setHashInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleHashLookup()}
            placeholder="Enter hash, action ID, or visitor ID..."
            className="flex-1 px-4 py-3 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={handleHashLookup}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Lookup
          </button>
        </div>

        {/* Lookup Result */}
        {lookupResult && (
          <div className={`mt-4 p-4 rounded-lg ${lookupResult.notFound ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'}`}>
            {lookupResult.notFound ? (
              <p className="text-yellow-800">
                No record found for: <span className="font-mono font-medium">{lookupResult.query}</span>
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-green-800 font-semibold">Record Found:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-secondary-600">Hash/ID:</span>
                    <p className="font-mono">{lookupResult.hash || lookupResult.action_id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">Page:</span>
                    <p>{lookupResult.page || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">Visitor ID:</span>
                    <p className="font-mono">{lookupResult.visitor_id}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">Revenue:</span>
                    <p>{formatCurrency(lookupResult.revenue)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">Channel:</span>
                    <p>{lookupResult.channel || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">Subchannel:</span>
                    <p>{lookupResult.subchannel || '-'}</p>
                  </div>
                  <div>
                    <span className="font-medium text-secondary-600">When:</span>
                    <p>{lookupResult.since_visit || lookupResult.date || '-'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-secondary-200 p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter results..."
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
          <h3 className="font-semibold text-secondary-900">Recent Transactions</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Hash/ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Page</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Visitor ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">When</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">Revenue</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Channel</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">Subchannel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500"></div>
                      <span className="ml-3 text-secondary-600">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-secondary-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                reportData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 text-sm font-mono text-secondary-700">
                      {row.hash || row.action_id || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-secondary-700">{row.page || '-'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-primary-600">{row.visitor_id}</td>
                    <td className="px-4 py-3 text-sm text-secondary-500">{row.since_visit || row.date || '-'}</td>
                    <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.revenue)}</td>
                    <td className="px-4 py-3 text-sm text-secondary-700">{row.channel || '-'}</td>
                    <td className="px-4 py-3 text-sm text-secondary-700">{row.subchannel || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-secondary-200 text-sm text-secondary-500">
          {reportData.length} transactions
        </div>
      </div>
    </div>
  );
}
