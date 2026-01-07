import { useState, useMemo } from 'react';
import { Upload, FileDown, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format percentage
const formatPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
};

// Format number with commas
const formatNumber = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return Number(value).toLocaleString();
};

export default function DomainPlacementReport() {
  const [data, setData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [sortConfig, setSortConfig] = useState({ key: 'cost', direction: 'desc' });
  const [searchFilter, setSearchFilter] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Invalid file type. Please upload a CSV file.');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processData(results.data);
      },
      error: (error) => {
        toast.error('Error parsing CSV file');
        console.error('CSV Parse Error:', error);
      }
    });
  };

  const processData = (rawData) => {
    // Group by domain and aggregate
    const grouped = {};

    rawData.forEach(row => {
      // Handle different column name variations for domain/placement
      const domain = row['Domain'] || row['Placement'] || row['placement'] || row['domain'] || '';

      // Handle different column name variations for metrics
      const clicks = parseInt(row['Clicks'] || row['clicks'] || 0) || 0;
      const impressions = parseInt(row['Impr.'] || row['Impressions'] || row['impressions'] || 0) || 0;
      const cost = parseFloat(row['Cost'] || row['cost'] || 0) || 0;
      const conv = parseFloat(row['Total conv. value'] || row['Conv. value'] || row['Conversion Value'] || row['conv'] || 0) || 0;
      const conversions = parseFloat(row['Conversions'] || row['conversions'] || row['Conv.'] || 0) || 0;

      if (!domain || domain === 'Domain' || domain === 'Placement') return;

      if (grouped[domain]) {
        grouped[domain].clicks += clicks;
        grouped[domain].impressions += impressions;
        grouped[domain].cost += cost;
        grouped[domain].conv += conv;
        grouped[domain].conversions += conversions;
      } else {
        grouped[domain] = {
          domain,
          clicks,
          impressions,
          cost,
          conv,
          conversions
        };
      }
    });

    // Calculate profit, ROI, CTR, CPC
    const processed = Object.values(grouped).map(item => {
      const profit = item.conv - item.cost;
      const roi = item.cost > 0 ? ((item.conv - item.cost) / item.cost) * 100 : 0;
      const ctr = item.impressions > 0 ? (item.clicks / item.impressions) * 100 : 0;
      const cpc = item.clicks > 0 ? item.cost / item.clicks : 0;
      return {
        ...item,
        profit,
        roi,
        ctr,
        cpc
      };
    });

    // Sort by cost descending by default
    processed.sort((a, b) => b.cost - a.cost);

    setData(processed);
    toast.success(`Loaded ${processed.length} domains`);
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filtered and sorted data
  const displayData = useMemo(() => {
    let filtered = data;

    if (searchFilter) {
      filtered = data.filter(row =>
        row.domain.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    return [...filtered].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig, searchFilter]);

  // Export to CSV
  const handleExport = () => {
    if (displayData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Domain', 'Clicks', 'Impressions', 'CTR (%)', 'CPC', 'Cost', 'Total Conv', 'Profit', 'ROI (%)'];
    const rows = displayData.map(row => [
      `"${row.domain}"`,
      row.clicks,
      row.impressions,
      row.ctr.toFixed(2),
      row.cpc.toFixed(2),
      row.cost.toFixed(2),
      row.conv.toFixed(2),
      row.profit.toFixed(2),
      row.roi.toFixed(2)
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'DomainPlacementReport.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals
  const totals = useMemo(() => {
    return displayData.reduce((acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      cost: acc.cost + row.cost,
      conv: acc.conv + row.conv,
      profit: acc.profit + row.profit,
    }), { clicks: 0, impressions: 0, cost: 0, conv: 0, profit: 0 });
  }, [displayData]);

  const totalRoi = totals.cost > 0 ? ((totals.conv - totals.cost) / totals.cost) * 100 : 0;
  const totalCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const totalCpc = totals.clicks > 0 ? totals.cost / totals.clicks : 0;

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown className="w-4 h-4 text-secondary-400" />;
    }
    return sortConfig.direction === 'asc'
      ? <ChevronUp className="w-4 h-4 text-primary-500" />
      : <ChevronDown className="w-4 h-4 text-primary-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Domain Placement Report</h1>
        <div className="w-32 h-1 bg-primary-500 mt-2"></div>
      </div>

      {/* File Upload */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <form className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex items-center gap-2 px-4 py-2 bg-white border border-secondary-300 rounded-lg hover:bg-secondary-50 transition-colors">
                <Upload className="w-4 h-4 text-secondary-500" />
                <span className="text-sm text-secondary-700">Choose CSV File</span>
              </div>
            </label>
            <button
              type="button"
              onClick={() => document.querySelector('input[type="file"]').form?.dispatchEvent(new Event('submit'))}
              className="btn btn-secondary"
              disabled={!fileName}
            >
              Run Report
            </button>
          </div>

          {fileName && (
            <span className="text-sm text-secondary-600">
              File Name: {fileName} | {fileSize.toLocaleString()} Bytes
            </span>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={data.length === 0}
            className={`ml-auto flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              data.length === 0
                ? 'bg-secondary-100 text-secondary-400 cursor-not-allowed'
                : 'bg-white border border-secondary-300 text-secondary-700 hover:bg-secondary-50'
            }`}
          >
            <FileDown className="w-4 h-4" />
            Download to Excel
          </button>
        </form>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
        {data.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-secondary-600">Please select a report to import above</p>
            <p className="text-secondary-500">and click "Run Report"</p>
          </div>
        ) : (
          <>
            {/* Search filter */}
            <div className="p-4 border-b border-secondary-200">
              <input
                type="text"
                placeholder="Filter domains..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input max-w-sm"
              />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-100">
                  <tr>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('domain')}
                    >
                      <div className="flex items-center gap-2">
                        Domain
                        <SortIcon column="domain" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('clicks')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Clicks
                        <SortIcon column="clicks" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('impressions')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Impr.
                        <SortIcon column="impressions" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('ctr')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        CTR
                        <SortIcon column="ctr" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('cpc')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        CPC
                        <SortIcon column="cpc" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('cost')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Cost
                        <SortIcon column="cost" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('conv')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Total Conv
                        <SortIcon column="conv" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('profit')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        Profit
                        <SortIcon column="profit" />
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider cursor-pointer hover:bg-secondary-200"
                      onClick={() => handleSort('roi')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        ROI (%)
                        <SortIcon column="roi" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {displayData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-secondary-50">
                      <td className="px-4 py-3 text-sm text-secondary-900">{row.domain}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatNumber(row.clicks)}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatNumber(row.impressions)}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatPercent(row.ctr)}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.cpc)}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.cost)}</td>
                      <td className="px-4 py-3 text-sm text-right text-secondary-700">{formatCurrency(row.conv)}</td>
                      <td className={`px-4 py-3 text-sm text-right ${row.profit < 0 ? 'text-red-600' : 'text-secondary-700'}`}>
                        {formatCurrency(row.profit)}
                      </td>
                      <td className={`px-4 py-3 text-sm text-right ${row.roi < 0 ? 'text-red-600' : 'text-secondary-700'}`}>
                        {formatPercent(row.roi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-secondary-100 font-semibold">
                  <tr>
                    <td className="px-4 py-3 text-sm font-bold text-secondary-900">TOTALS ({displayData.length} domains)</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNumber(totals.clicks)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNumber(totals.impressions)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatPercent(totalCtr)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(totalCpc)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.cost)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatCurrency(totals.conv)}</td>
                    <td className={`px-4 py-3 text-sm text-right ${totals.profit < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(totals.profit)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right ${totalRoi < 0 ? 'text-red-600' : ''}`}>
                      {formatPercent(totalRoi)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="text-sm text-secondary-500">
        File must be a .csv which includes columns like: "Domain" or "Placement", "Clicks", "Impr.", "Total conv. value" and "Cost".
      </div>
    </div>
  );
}
