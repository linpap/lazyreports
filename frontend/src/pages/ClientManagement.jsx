import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Play, Users } from 'lucide-react';
import { dataApi } from '../services/api';
import DateRangePicker from '../components/common/DateRangePicker';
import LoadingSpinner from '../components/common/LoadingSpinner';
import dayjs from 'dayjs';

export default function ClientManagement() {
  const [selectedClient, setSelectedClient] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    endDate: dayjs().format('YYYY-MM-DD'),
  });
  const [runReport, setRunReport] = useState(false);

  // Fetch clients/advertisers
  const { data: clientsData, isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => dataApi.getClients(),
  });

  // Fetch client report when runReport is triggered
  const { data: reportData, isLoading: reportLoading, isFetching } = useQuery({
    queryKey: ['client-report', selectedClient, dateRange.startDate, dateRange.endDate],
    queryFn: () => dataApi.getClientReport(selectedClient, {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    }),
    enabled: runReport && !!selectedClient,
  });

  const clients = clientsData?.data?.data || [];
  const report = reportData?.data?.data;

  const handleRunReport = () => {
    if (selectedClient) {
      setRunReport(true);
    }
  };

  const handleClientChange = (e) => {
    setSelectedClient(e.target.value);
    setRunReport(false);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('en-US').format(value || 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Client Management</h1>
        <p className="text-secondary-600 mt-1">
          Run a count of all visitors for a Client's offers
        </p>
      </div>

      {/* Controls */}
      <div className="card p-6 space-y-4 overflow-visible">
        {/* Client Selector */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Choose Client:
          </label>
          {clientsLoading ? (
            <div className="h-10 bg-secondary-100 animate-pulse rounded-lg" />
          ) : (
            <select
              value={selectedClient}
              onChange={handleClientChange}
              className="input max-w-md"
            >
              <option value="">Please Select</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date Range */}
        <div>
          <label className="block text-sm font-medium text-secondary-700 mb-2">
            Set Report Filters:
          </label>
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onChange={(start, end) => {
              setDateRange({ startDate: start, endDate: end });
              setRunReport(false);
            }}
          />
        </div>

        {/* Run Report Button */}
        <div className="pt-2">
          <button
            onClick={handleRunReport}
            disabled={!selectedClient || reportLoading}
            className="btn btn-primary"
          >
            <Play className="w-4 h-4 mr-2" />
            {reportLoading || isFetching ? 'Running...' : 'Run Report'}
          </button>
        </div>
      </div>

      {/* Report Results */}
      {!runReport && !report && (
        <div className="card p-12 text-center">
          <Building2 className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
          <p className="text-secondary-500">Please select report options above</p>
          <p className="text-secondary-400 text-sm mt-1">and click "Run Report"</p>
        </div>
      )}

      {(reportLoading || isFetching) && (
        <div className="card p-12">
          <LoadingSpinner />
        </div>
      )}

      {report && !reportLoading && !isFetching && (
        <div className="space-y-4">
          {/* Summary Card */}
          <div className="card p-4 max-w-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-secondary-500">Total Visitors</p>
                <p className="text-xl font-bold text-secondary-900">
                  {formatNumber(report.totals?.visitors)}
                </p>
              </div>
            </div>
          </div>

          {/* Offers Table */}
          <div className="card">
            <div className="px-4 py-3 border-b border-secondary-100">
              <h3 className="font-semibold text-secondary-900">
                Offers ({report.offers?.length || 0})
              </h3>
            </div>
            {report.offers?.length === 0 ? (
              <div className="p-8 text-center text-secondary-500">
                No offers found for this client
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Offer Name
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                        Visitors
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary-100">
                    {report.offers?.map((offer) => (
                      <tr key={offer.dkey} className="hover:bg-secondary-50">
                        <td className="px-4 py-3 text-sm text-secondary-900">
                          {offer.name}
                          {offer.error && (
                            <span className="text-xs text-secondary-400 ml-2">
                              ({offer.error})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-secondary-700 text-right">
                          {formatNumber(offer.visitors)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-secondary-100 font-semibold">
                    <tr>
                      <td className="px-4 py-3 text-sm text-secondary-900">
                        Total
                      </td>
                      <td className="px-4 py-3 text-sm text-secondary-900 text-right">
                        {formatNumber(report.totals?.visitors)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
