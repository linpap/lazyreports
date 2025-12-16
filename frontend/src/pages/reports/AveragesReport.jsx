import { useEffect, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, RefreshCw, Printer, TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import OfferSelector from '../../components/common/OfferSelector';

// Format number with commas
const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 });
};

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Calculate percentage change
const getPercentChange = (current, previous) => {
  if (!previous || previous === 0) return null;
  return ((current - previous) / previous) * 100;
};

// Change indicator component
function ChangeIndicator({ current, previous, format = 'number' }) {
  const change = getPercentChange(current, previous);

  if (change === null) {
    return null;
  }

  const isPositive = change > 0;
  const isNegative = change < 0;
  const absChange = Math.abs(change);

  return (
    <span className={`inline-flex items-center ml-2 ${
      isPositive ? 'text-red-600' : isNegative ? 'text-red-600' : 'text-secondary-500'
    }`}>
      ({isNegative ? '-' : ''}{absChange.toFixed(2)}%)
      {isNegative ? (
        <TrendingDown className="w-4 h-4 ml-1" />
      ) : isPositive ? (
        <TrendingUp className="w-4 h-4 ml-1 text-green-600" />
      ) : null}
    </span>
  );
}

// Simple Bar Chart Component
function BarChart({ data, title, valueKey, avgKey, maxValue }) {
  const [expanded, setExpanded] = useState(true);

  // Day order for display (Saturday to Friday as shown in PHP)
  const dayOrder = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  // Merge current and average data by day
  const chartData = useMemo(() => {
    return dayOrder.map(day => {
      const currentDay = data.current.find(d => d.day_of_week === day);
      const avgDay = data.averages.find(d => d.day_of_week === day);
      return {
        day,
        current: currentDay ? Number(currentDay[valueKey]) : 0,
        average: avgDay ? Number(avgDay[avgKey]) : 0,
      };
    });
  }, [data, valueKey, avgKey]);

  const max = maxValue || Math.max(
    ...chartData.map(d => Math.max(d.current, d.average)),
    1
  );

  return (
    <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-green-700 text-white hover:bg-green-800 transition-colors"
      >
        <span className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {title}
        </span>
      </button>

      {expanded && (
        <div className="p-6">
          {/* Legend */}
          <div className="flex justify-end gap-6 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-400 rounded"></div>
              <span className="text-sm text-secondary-600">Average {title.replace(' Bar Chart', '')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span className="text-sm text-secondary-600">Today's {title.replace(' Bar Chart', '')}</span>
            </div>
          </div>

          {/* Chart */}
          <div className="relative h-64">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-secondary-500">
              <span>{Math.round(max)}</span>
              <span>{Math.round(max * 0.8)}</span>
              <span>{Math.round(max * 0.6)}</span>
              <span>{Math.round(max * 0.4)}</span>
              <span>{Math.round(max * 0.2)}</span>
              <span>0</span>
            </div>

            {/* Bars */}
            <div className="ml-14 h-full flex items-end justify-around gap-2 pb-8 border-l border-b border-secondary-200">
              {chartData.map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div className="flex items-end gap-1 h-48">
                    {/* Average bar */}
                    <div
                      className="w-6 bg-blue-400 rounded-t"
                      style={{ height: `${(item.average / max) * 100}%` }}
                      title={`Avg: ${item.average}`}
                    ></div>
                    {/* Current bar */}
                    <div
                      className="w-6 bg-orange-500 rounded-t"
                      style={{ height: `${(item.current / max) * 100}%` }}
                      title={`Current: ${item.current}`}
                    ></div>
                  </div>
                  <span className="text-xs text-secondary-600 mt-2">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AveragesReport() {
  const { selectedDkey, selectedDomainName, setSelectedDomain } = useFilterStore();

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

  // Fetch weekly averages
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['weekly-averages', selectedDkey],
    queryFn: () => analyticsApi.getWeeklyAverages({ dkey: selectedDkey }),
    enabled: !!selectedDkey,
  });

  const weeklyData = data?.data?.data || { current: [], averages: [] };

  const handleDomainChange = (dkey, name) => {
    setSelectedDomain(dkey, name);
  };

  // Day order for table (Sunday to Saturday as shown in PHP)
  const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Merge data for table
  const tableData = useMemo(() => {
    return dayOrder.map(day => {
      const currentDay = weeklyData.current.find(d => d.day_of_week === day);
      const avgDay = weeklyData.averages.find(d => d.day_of_week === day);
      return {
        day,
        visitors: currentDay ? Number(currentDay.visitors) : 0,
        avgVisitors: avgDay ? Number(avgDay.avg_visitors) : 0,
        revenue: currentDay ? Number(currentDay.revenue) : 0,
        avgRevenue: avgDay ? Number(avgDay.avg_revenue) : 0,
        epc: currentDay ? Number(currentDay.epc) : 0,
        avgEpc: avgDay ? Number(avgDay.avg_epc) : 0,
      };
    });
  }, [weeklyData]);

  // Calculate max values for charts
  const maxVisitors = Math.max(
    ...weeklyData.current.map(d => Number(d.visitors) || 0),
    ...weeklyData.averages.map(d => Number(d.avg_visitors) || 0),
    1
  );
  const maxRevenue = Math.max(
    ...weeklyData.current.map(d => Number(d.revenue) || 0),
    ...weeklyData.averages.map(d => Number(d.avg_revenue) || 0),
    1
  );
  const maxEpc = Math.max(
    ...weeklyData.current.map(d => Number(d.epc) || 0),
    ...weeklyData.averages.map(d => Number(d.avg_epc) || 0),
    1
  );

  const currentTime = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Averages</h1>
          <p className="text-secondary-600 mt-1 italic">
            Compare the last 7 days to the previous 3 weeks.
          </p>
        </div>
      </div>

      {/* Offer Selector */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-secondary-700">Offers:</label>
            {domains.length > 0 && (
              <OfferSelector
                domains={domains}
                selectedDkey={selectedDkey}
                onChange={handleDomainChange}
                disabled={domainsLoading}
              />
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Report
          </button>
        </div>
      </div>

      {/* Print Button and Title */}
      <div className="flex items-center justify-between">
        <button className="p-2 text-secondary-500 hover:text-secondary-700 hover:bg-secondary-100 rounded border border-secondary-300">
          <Printer className="w-5 h-5" />
        </button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="bg-white rounded-lg border border-secondary-200 p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
            <span className="ml-3 text-secondary-600">Loading averages...</span>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg border border-secondary-200 p-8 text-center">
          <p className="text-red-600">Error loading averages data</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-secondary-900">
              Averages for {selectedDomainName || 'Selected Offer'}
            </h2>
            <span className="text-sm text-secondary-500">as of {currentTime}</span>
          </div>

          {/* Bar Charts */}
          <BarChart
            data={weeklyData}
            title="Visitors Bar Chart"
            valueKey="visitors"
            avgKey="avg_visitors"
            maxValue={maxVisitors}
          />

          <BarChart
            data={weeklyData}
            title="Revenue Bar Chart"
            valueKey="revenue"
            avgKey="avg_revenue"
            maxValue={maxRevenue}
          />

          <BarChart
            data={weeklyData}
            title="EPC Bar Chart"
            valueKey="epc"
            avgKey="avg_epc"
            maxValue={maxEpc}
          />

          {/* Data Table */}
          <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary-700 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Day Of Week</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Visitors</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Avg Visitors</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Revenue</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Avg Revenue</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">EPV</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold">Avg EPV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {tableData.map((row, idx) => {
                    const visitorsChange = getPercentChange(row.visitors, row.avgVisitors);
                    const revenueChange = getPercentChange(row.revenue, row.avgRevenue);
                    const epcChange = getPercentChange(row.epc, row.avgEpc);
                    const isNegativeVisitors = visitorsChange !== null && visitorsChange < 0;
                    const isNegativeRevenue = revenueChange !== null && revenueChange < 0;
                    const isNegativeEpc = epcChange !== null && epcChange < 0;

                    return (
                      <tr key={idx} className={`hover:bg-secondary-50 ${idx % 2 === 1 ? 'bg-secondary-50' : ''}`}>
                        <td className="px-4 py-3 text-sm font-medium text-secondary-900">
                          {row.day}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center ${isNegativeVisitors ? 'text-red-600' : ''}`}>
                          {formatNumber(row.visitors)}
                          {visitorsChange !== null && (
                            <span className="ml-1">
                              ({visitorsChange.toFixed(2)}%)
                              {isNegativeVisitors ? (
                                <TrendingDown className="w-3 h-3 inline ml-1" />
                              ) : (
                                <TrendingUp className="w-3 h-3 inline ml-1 text-green-600" />
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-700">
                          {formatNumber(row.avgVisitors)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center ${isNegativeRevenue ? 'text-red-600' : ''}`}>
                          {formatCurrency(row.revenue)}
                          {revenueChange !== null && (
                            <span className="ml-1">
                              ({revenueChange > 0 ? '+' : ''}{revenueChange.toFixed(2)}%)
                              {isNegativeRevenue ? (
                                <TrendingDown className="w-3 h-3 inline ml-1" />
                              ) : (
                                <TrendingUp className="w-3 h-3 inline ml-1 text-green-600" />
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-700">
                          {formatCurrency(row.avgRevenue)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-center ${isNegativeEpc ? 'text-red-600' : ''}`}>
                          {formatCurrency(row.epc)}
                          {epcChange !== null && (
                            <span className="ml-1">
                              ({epcChange > 0 ? '+' : ''}{epcChange.toFixed(2)}%)
                              {isNegativeEpc ? (
                                <TrendingDown className="w-3 h-3 inline ml-1" />
                              ) : (
                                <TrendingUp className="w-3 h-3 inline ml-1 text-green-600" />
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-secondary-700">
                          {formatCurrency(row.avgEpc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
