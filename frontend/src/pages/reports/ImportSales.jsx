import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, AlertCircle, CheckCircle, X, ChevronDown } from 'lucide-react';
import { salesApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import toast from 'react-hot-toast';

export default function ImportSales() {
  const { selectedDkey, setSelectedDomain } = useFilterStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [importResults, setImportResults] = useState(null);
  const [columnMapping, setColumnMapping] = useState({
    date: '',
    visitor_id: '',
    amount: '',
    affiliate_id: '',
    channel: '',
    subchannel: '',
  });

  // Fetch user's available domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: () => domainsApi.getDomains(),
    staleTime: 5 * 60 * 1000,
  });

  const domains = domainsData?.data?.data || [];

  const handleDomainChange = (e) => {
    const dkey = e.target.value;
    const domain = domains.find((d) => d.dkey === dkey);
    setSelectedDomain(dkey, domain?.name || '');
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (formData) => salesApi.importSales(formData),
    onSuccess: (data) => {
      setImportResults(data?.data);
      toast.success('Sales imported successfully');
      queryClient.invalidateQueries(['analytics']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Import failed');
    },
  });

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);

    // Parse CSV preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      const lines = text.split('\n').slice(0, 6); // Get first 6 lines (header + 5 rows)
      const parsed = lines.map(line => {
        // Simple CSV parsing (handles basic cases)
        const values = [];
        let current = '';
        let inQuotes = false;

        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());
        return values;
      });

      setPreview(parsed);

      // Auto-detect column mapping
      if (parsed.length > 0) {
        const headers = parsed[0].map(h => h.toLowerCase());
        const newMapping = { ...columnMapping };

        headers.forEach((header, idx) => {
          if (header.includes('date') || header.includes('time')) {
            newMapping.date = idx.toString();
          } else if (header.includes('visitor') || header.includes('pkey') || header.includes('click_id')) {
            newMapping.visitor_id = idx.toString();
          } else if (header.includes('amount') || header.includes('revenue') || header.includes('payout')) {
            newMapping.amount = idx.toString();
          } else if (header.includes('affiliate')) {
            newMapping.affiliate_id = idx.toString();
          } else if (header === 'channel' || header.includes('source')) {
            newMapping.channel = idx.toString();
          } else if (header === 'subchannel' || header.includes('sub_id')) {
            newMapping.subchannel = idx.toString();
          }
        });

        setColumnMapping(newMapping);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedDkey) {
      toast.error('Please select an offer');
      return;
    }

    if (!columnMapping.visitor_id || !columnMapping.amount) {
      toast.error('Please map at least Visitor ID and Amount columns');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('dkey', selectedDkey);
    formData.append('columnMapping', JSON.stringify(columnMapping));

    importMutation.mutate(formData);
  };

  const clearFile = () => {
    setFile(null);
    setPreview([]);
    setImportResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const headers = preview[0] || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Import Sales</h1>
          <p className="text-secondary-600 mt-1">
            Import sales data from CSV files to update your analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {domains.length > 0 && (
            <div className="relative">
              <select
                value={selectedDkey || ''}
                onChange={handleDomainChange}
                className="appearance-none bg-white border border-secondary-300 rounded-lg px-4 py-2 pr-10 text-sm font-medium text-secondary-700 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-w-[200px]"
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
        </div>
      </div>

      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <h2 className="text-lg font-semibold text-secondary-900 mb-4">Upload CSV File</h2>

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-secondary-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50 transition-colors"
          >
            <Upload className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600 mb-2">Click to upload or drag and drop</p>
            <p className="text-sm text-secondary-500">CSV files only</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-primary-600" />
                <div>
                  <p className="font-medium text-secondary-900">{file.name}</p>
                  <p className="text-sm text-secondary-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={clearFile}
                className="p-2 text-secondary-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Column Mapping */}
      {preview.length > 0 && (
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Column Mapping</h2>
          <p className="text-sm text-secondary-600 mb-4">
            Map your CSV columns to the required fields. Auto-detection has been applied.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Date Column
              </label>
              <select
                value={columnMapping.date}
                onChange={(e) => setColumnMapping({ ...columnMapping, date: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Visitor ID / Click ID <span className="text-red-500">*</span>
              </label>
              <select
                value={columnMapping.visitor_id}
                onChange={(e) => setColumnMapping({ ...columnMapping, visitor_id: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Amount / Revenue <span className="text-red-500">*</span>
              </label>
              <select
                value={columnMapping.amount}
                onChange={(e) => setColumnMapping({ ...columnMapping, amount: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Affiliate ID
              </label>
              <select
                value={columnMapping.affiliate_id}
                onChange={(e) => setColumnMapping({ ...columnMapping, affiliate_id: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Channel
              </label>
              <select
                value={columnMapping.channel}
                onChange={(e) => setColumnMapping({ ...columnMapping, channel: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Subchannel
              </label>
              <select
                value={columnMapping.subchannel}
                onChange={(e) => setColumnMapping({ ...columnMapping, subchannel: e.target.value })}
                className="w-full px-3 py-2 border border-secondary-300 rounded-lg text-sm"
              >
                <option value="">-- Not Mapped --</option>
                {headers.map((h, idx) => (
                  <option key={idx} value={idx}>{h}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 1 && (
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Preview (First 5 Rows)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary-50">
                <tr>
                  {headers.map((h, idx) => (
                    <th key={idx} className="px-3 py-2 text-left font-semibold text-secondary-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {preview.slice(1).map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 text-secondary-700">
                        {cell || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {file && (
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={importMutation.isPending}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import Sales
              </>
            )}
          </button>
        </div>
      )}

      {/* Results */}
      {importResults && (
        <div className={`p-4 rounded-lg ${importResults.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-start gap-3">
            {importResults.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <div>
              <h3 className={`font-semibold ${importResults.success ? 'text-green-800' : 'text-red-800'}`}>
                {importResults.success ? 'Import Successful' : 'Import Failed'}
              </h3>
              {importResults.imported && (
                <p className="text-sm text-green-700 mt-1">
                  {importResults.imported} records imported successfully
                </p>
              )}
              {importResults.errors && importResults.errors.length > 0 && (
                <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                  {importResults.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
