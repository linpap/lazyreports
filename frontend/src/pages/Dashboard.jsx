import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import {
  TrendingUp,
  MousePointerClick,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
} from 'lucide-react';
import { analyticsApi, domainsApi } from '../services/api';
import { useFilterStore } from '../store/filterStore';
import DateRangePicker from '../components/common/DateRangePicker';
import LoadingSpinner from '../components/common/LoadingSpinner';

function StatCard({ title, value, change, changeType, icon: Icon }) {
  const isPositive = changeType === 'positive';

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-secondary-600">{title}</p>
          <p className="text-2xl font-bold text-secondary-900 mt-1">{value}</p>
          {change && (
            <div className="flex items-center mt-2">
              {isPositive ? (
                <ArrowUpRight className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  isPositive ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {change}%
              </span>
              <span className="text-sm text-secondary-500 ml-1">vs last period</span>
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { startDate, endDate, selectedDkey, selectedDomainName, setSelectedDomain, getQueryParams } = useFilterStore();

  // Fetch user's available domains/offers
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const domains = domainsData?.data?.data || [];
  const defaultOffer = domainsData?.data?.defaultOffer;

  // Auto-select default offer from DB, or first domain if no default set
  useEffect(() => {
    if (!selectedDkey && domains.length > 0) {
      if (defaultOffer) {
        // Use user's saved default offer
        setSelectedDomain(defaultOffer.dkey, defaultOffer.name);
      } else {
        // Fall back to first domain
        setSelectedDomain(domains[0].dkey, domains[0].name);
      }
    }
  }, [domains, defaultOffer, selectedDkey, setSelectedDomain]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', startDate, endDate, selectedDkey],
    queryFn: () => analyticsApi.getAnalytics(getQueryParams()),
    enabled: !!selectedDkey || domains.length === 0, // Wait for domain selection or proceed if no domains
  });

  const { data: averagesData } = useQuery({
    queryKey: ['averages', startDate, endDate, selectedDkey],
    queryFn: () => analyticsApi.getAverages(getQueryParams()),
    enabled: !!selectedDkey || domains.length === 0,
  });

  const analyticsData = data?.data?.data || [];
  const averages = averagesData?.data?.data || {};

  const handleDomainChange = (e) => {
    const dkey = e.target.value;
    const domain = domains.find(d => d.dkey === dkey);
    setSelectedDomain(dkey, domain?.name || '');
  };

  // Calculate totals
  const totals = analyticsData.reduce(
    (acc, item) => ({
      clicks: acc.clicks + (item.clicks || 0),
      conversions: acc.conversions + (item.conversions || 0),
      revenue: acc.revenue + (item.revenue || 0),
      cost: acc.cost + (item.cost || 0),
    }),
    { clicks: 0, conversions: 0, revenue: 0, cost: 0 }
  );

  const conversionRate =
    totals.clicks > 0
      ? ((totals.conversions / totals.clicks) * 100).toFixed(2)
      : 0;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading dashboard data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
          <p className="text-secondary-600 mt-1">
            Overview of your analytics performance
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Domain/Offer Selector */}
          {domains.length > 0 && (
            <div className="relative">
              <select
                value={selectedDkey || ''}
                onChange={handleDomainChange}
                className="appearance-none bg-white border border-secondary-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-secondary-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer min-w-[200px]"
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
          <DateRangePicker />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clicks"
          value={totals.clicks.toLocaleString()}
          change={12.5}
          changeType="positive"
          icon={MousePointerClick}
        />
        <StatCard
          title="Conversions"
          value={totals.conversions.toLocaleString()}
          change={8.2}
          changeType="positive"
          icon={TrendingUp}
        />
        <StatCard
          title="Revenue"
          value={`$${totals.revenue.toLocaleString()}`}
          change={15.3}
          changeType="positive"
          icon={DollarSign}
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          change={-2.1}
          changeType="negative"
          icon={Users}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-secondary-900">
              Performance Trend
            </h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="conversions"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-secondary-900">
              Revenue & Cost
            </h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analyticsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Averages */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-secondary-900">
            Period Averages
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">Avg. Clicks</p>
              <p className="text-xl font-bold text-secondary-900">
                {Math.round(averages.avg_clicks || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">Avg. Conversions</p>
              <p className="text-xl font-bold text-secondary-900">
                {Math.round(averages.avg_conversions || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">Avg. Revenue</p>
              <p className="text-xl font-bold text-secondary-900">
                ${Math.round(averages.avg_revenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">Avg. Cost</p>
              <p className="text-xl font-bold text-secondary-900">
                ${Math.round(averages.avg_cost || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-secondary-50 rounded-lg">
              <p className="text-sm text-secondary-600">Avg. Conv. Rate</p>
              <p className="text-xl font-bold text-secondary-900">
                {parseFloat(averages.avg_conversion_rate || 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
