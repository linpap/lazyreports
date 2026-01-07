import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Loader2, ChevronDown, ChevronRight, Printer } from 'lucide-react';
import { dataApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

export default function Decode() {
  const { selectedDkey, setSelectedDomain } = useFilterStore();
  const [pkeys, setPkeys] = useState('');
  const [hashes, setHashes] = useState('');
  const [results, setResults] = useState(null);
  const [expandedVisitors, setExpandedVisitors] = useState({});

  // Fetch user's available domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];
  const selectedDomain = domains.find(d => d.dkey === selectedDkey);

  const handleDomainChange = (e) => {
    const dkey = e.target.value;
    const domain = domains.find((d) => d.dkey === dkey);
    setSelectedDomain(dkey, domain?.name || '');
  };

  // Decode mutation
  const decodeMutation = useMutation({
    mutationFn: (data) => dataApi.decodeVisitor(data),
    onSuccess: (response) => {
      if (response.data?.data?.length > 0) {
        setResults(response.data);
        // Expand all visitors by default
        const expanded = {};
        response.data.data.forEach(v => {
          expanded[v.pkey] = true;
        });
        setExpandedVisitors(expanded);
      } else {
        setResults({ data: [], query: response.data?.query });
        toast.error('No results found for the given IDs');
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to decode');
    },
  });

  const handleSubmit = () => {
    if (!pkeys.trim() && !hashes.trim()) {
      toast.error('Please enter at least one Visitor ID or Action ID');
      return;
    }

    decodeMutation.mutate({
      pkeys: pkeys.trim(),
      hashes: hashes.trim(),
      dkey: selectedDkey,
      offersLander: selectedDomain?.name || ''
    });
  };

  const toggleVisitor = (pkey) => {
    setExpandedVisitors(prev => ({
      ...prev,
      [pkey]: !prev[pkey]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-secondary-600 italic">
          View detailed information about specific visitors.
        </p>
      </div>

      {/* Offer Selector */}
      <div className="bg-white rounded-lg border border-secondary-200 p-4">
        <label className="label mb-2">Offers:</label>
        <select
          value={selectedDkey || ''}
          onChange={handleDomainChange}
          className="input max-w-md"
        >
          <option value="">Start typing...</option>
          {domains.map((domain) => (
            <option key={domain.dkey} value={domain.dkey}>
              {domain.name}
            </option>
          ))}
        </select>
        {selectedDomain && (
          <div className="mt-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-secondary-100 text-secondary-700">
              {selectedDomain.name}
              <button
                onClick={() => setSelectedDomain('', '')}
                className="ml-2 text-secondary-500 hover:text-secondary-700"
              >
                &times;
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Input Areas */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="mb-4">
          <h2 className="font-semibold text-secondary-900">Enter Your Visitor IDs And/Or Action IDs.</h2>
          <p className="text-sm text-secondary-500">
            Note: The values must be comma-separated (ex 12345, 60002, ... ), semi-colon separated (ex 12345; 60002; ... ), or new-line separated (each value on its own line).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Visitor IDs (pkey) */}
          <div>
            <label className="label text-center block mb-2">Visitor IDs (pkey)</label>
            <textarea
              value={pkeys}
              onChange={(e) => setPkeys(e.target.value)}
              placeholder=""
              rows={8}
              className="input w-full resize-none font-mono text-sm"
            />
          </div>

          {/* Action IDs (hash) */}
          <div>
            <label className="label text-center block mb-2">Action IDs (hash)</label>
            <textarea
              value={hashes}
              onChange={(e) => setHashes(e.target.value)}
              placeholder=""
              rows={8}
              className="input w-full resize-none font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <button
            onClick={handleSubmit}
            disabled={decodeMutation.isPending}
            className="btn btn-primary px-8"
          >
            {decodeMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Submit
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handlePrint}
              className="text-secondary-500 hover:text-secondary-700"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-secondary-900">Decode</span>
              <span className="text-sm text-secondary-500 italic">
                as of {dayjs().format('M/D/YYYY, h:mm:ss A')}
              </span>
            </div>
          </div>

          {results.data.length === 0 ? (
            <div className="text-center py-8 text-secondary-500">
              No results found for the provided IDs.
            </div>
          ) : (
            <div className="space-y-4">
              {results.data.map((visitor) => (
                <div key={visitor.pkey} className="border border-secondary-200 rounded-lg overflow-hidden">
                  {/* Visitor Header */}
                  <div
                    onClick={() => toggleVisitor(visitor.pkey)}
                    className="bg-primary-500 text-white px-4 py-2 flex items-center cursor-pointer hover:bg-primary-600"
                  >
                    {expandedVisitors[visitor.pkey] ? (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-2" />
                    )}
                    <span className="font-medium">
                      {visitor.originalHash ? `Action ID: ${visitor.originalHash}` : `Visitor ID: ${visitor.pkey}`}
                    </span>
                  </div>

                  {/* Visitor Content */}
                  {expandedVisitors[visitor.pkey] && (
                    <div className="p-4">
                      {/* Two-column layout for Visitor Details and Device Details */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Visitor Details */}
                        <div>
                          <h3 className="bg-secondary-600 text-white px-3 py-2 text-sm font-medium">
                            Visitor Details
                          </h3>
                          <div className="bg-secondary-50 p-3 space-y-1 text-sm">
                            <DetailRow label="Lander" value={visitor.visitorDetails.lander} />
                            <DetailRow label="Variant" value={visitor.visitorDetails.variant} />
                            <DetailRow
                              label="Date"
                              value={`${visitor.visitorDetails.date} (UTC ${visitor.visitorDetails.localDate})`}
                            />
                            <DetailRow
                              label="Time"
                              value={`${visitor.visitorDetails.time} (UTC ${visitor.visitorDetails.localTime})`}
                            />
                            <DetailRow label="IP Address" value={visitor.visitorDetails.ip} />
                            <DetailRow label="ISP" value={visitor.visitorDetails.isp} />
                            <DetailRow label="Organization" value={visitor.visitorDetails.organization} />
                            <DetailRow label="Netspeed" value={visitor.visitorDetails.netspeed} />
                            <DetailRow label="Country" value={visitor.visitorDetails.country} />
                            <DetailRow label="State" value={visitor.visitorDetails.state} />
                            <DetailRow label="City" value={visitor.visitorDetails.city} />
                            <DetailRow label="Timezone" value={visitor.visitorDetails.timezone} />
                            <DetailRow label="Channel" value={visitor.visitorDetails.channel} />
                            <DetailRow label="Subchannel" value={visitor.visitorDetails.subchannel} />
                            <DetailRow label="Keyword" value={visitor.visitorDetails.keyword} />
                            <DetailRow label="Raw Keyword" value={visitor.visitorDetails.rawKeyword} />
                            <DetailRow label="Source Domain" value={visitor.visitorDetails.sourceDomain} />
                            <DetailRow label="Referer" value={visitor.visitorDetails.referer} />
                            <DetailRow label="Known Bot" value={visitor.visitorDetails.knownBot} />
                          </div>
                        </div>

                        {/* Device Details */}
                        <div>
                          <h3 className="bg-secondary-600 text-white px-3 py-2 text-sm font-medium">
                            Device Details
                          </h3>
                          <div className="bg-secondary-50 p-3 space-y-1 text-sm">
                            <DetailRow label="User Agent" value={visitor.deviceDetails.userAgent} className="break-all" />
                            <DetailRow label="Device Type" value={visitor.deviceDetails.deviceType} />
                            <DetailRow label="Operating System" value={visitor.deviceDetails.os} />
                            <DetailRow label="Operating System Version" value={visitor.deviceDetails.osVersion} />
                            <DetailRow label="Browser" value={visitor.deviceDetails.browser} />
                            <DetailRow label="Browser Version" value={visitor.deviceDetails.browserVersion} />
                            <DetailRow label="Brand" value={visitor.deviceDetails.brand} />
                            <DetailRow label="Name" value={visitor.deviceDetails.name} />
                            <DetailRow label="Device Model" value={visitor.deviceDetails.model} />
                            <DetailRow label="Device Size" value={visitor.deviceDetails.deviceSize} />
                            <DetailRow label="Language" value={visitor.deviceDetails.language} />
                            <DetailRow label="Device Screen" value={visitor.deviceDetails.deviceScreen} />
                          </div>
                        </div>
                      </div>

                      {/* Actions Table */}
                      {visitor.actions.length > 0 && (
                        <div className="mb-6">
                          <h3 className="text-sm font-medium text-secondary-700 mb-2">Actions</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-primary-500 text-white">
                                  <th className="px-3 py-2 text-left font-medium">ID</th>
                                  <th className="px-3 py-2 text-left font-medium">Hash</th>
                                  <th className="px-3 py-2 text-left font-medium">Page</th>
                                  <th className="px-3 py-2 text-left font-medium">Variant</th>
                                  <th className="px-3 py-2 text-left font-medium">Date</th>
                                  <th className="px-3 py-2 text-left font-medium">Time</th>
                                  <th className="px-3 py-2 text-left font-medium">Revenue</th>
                                  <th className="px-3 py-2 text-left font-medium">Pixels</th>
                                  <th className="px-3 py-2 text-left font-medium">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visitor.actions.map((action, idx) => (
                                  <tr
                                    key={idx}
                                    className={`border-b border-secondary-200 ${
                                      action.hash === visitor.originalHash ? 'bg-yellow-50' : ''
                                    }`}
                                  >
                                    <td className="px-3 py-2 text-secondary-700">{action.id}</td>
                                    <td className="px-3 py-2 text-secondary-700 font-mono text-xs">{action.hash}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.page}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.variant}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.date}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.time}</td>
                                    <td className="px-3 py-2 text-secondary-700">${Number(action.revenue || 0).toFixed(2)}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.pixels}</td>
                                    <td className="px-3 py-2 text-secondary-700">{action.details}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Added Parameters Table */}
                      {visitor.parameters.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-secondary-700 mb-2">Added Parameters</h3>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-primary-500 text-white">
                                  <th className="px-3 py-2 text-left font-medium">Defined At</th>
                                  <th className="px-3 py-2 text-left font-medium">Name</th>
                                  <th className="px-3 py-2 text-left font-medium">Value</th>
                                </tr>
                              </thead>
                              <tbody>
                                {visitor.parameters.map((param, idx) => (
                                  <tr key={idx} className="border-b border-secondary-200">
                                    <td className="px-3 py-2 text-secondary-700">{param.definedAt}</td>
                                    <td className="px-3 py-2 text-secondary-700">{param.name}</td>
                                    <td className="px-3 py-2 text-secondary-700 break-all">{param.value}</td>
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
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper component for detail rows
function DetailRow({ label, value, className = '' }) {
  return (
    <div className={`flex ${className}`}>
      <span className="text-primary-600 font-medium min-w-[140px]">{label}:</span>
      <span className="text-secondary-700 ml-2">{value || ''}</span>
    </div>
  );
}
