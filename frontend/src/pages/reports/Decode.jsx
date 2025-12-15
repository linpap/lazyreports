import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Copy, Check, Key } from 'lucide-react';
import { dataApi, domainsApi } from '../../services/api';
import { useFilterStore } from '../../store/filterStore';
import toast from 'react-hot-toast';

export default function Decode() {
  const { selectedDkey, setSelectedDomain } = useFilterStore();
  const [inputValue, setInputValue] = useState('');
  const [decodedResult, setDecodedResult] = useState(null);
  const [copied, setCopied] = useState(false);

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

  // Decode function - attempts to decode various encoded formats
  const handleDecode = () => {
    if (!inputValue.trim()) {
      toast.error('Please enter a value to decode');
      return;
    }

    try {
      let decoded = {};
      const value = inputValue.trim();

      // Try Base64 decode
      try {
        const base64Decoded = atob(value);
        decoded.base64 = base64Decoded;
      } catch (e) {
        decoded.base64 = 'Not valid Base64';
      }

      // Try URL decode
      try {
        decoded.urlDecoded = decodeURIComponent(value);
      } catch (e) {
        decoded.urlDecoded = 'Not valid URL encoding';
      }

      // Try to parse as JSON
      try {
        decoded.json = JSON.parse(value);
      } catch (e) {
        decoded.json = null;
      }

      // Check if it looks like a hash/pkey
      if (/^[a-f0-9]{32,64}$/i.test(value)) {
        decoded.hashType = value.length === 32 ? 'MD5' : value.length === 40 ? 'SHA1' : value.length === 64 ? 'SHA256' : 'Unknown Hash';
      }

      // Check if it's a visitor/action pkey format
      if (/^\d+$/.test(value)) {
        decoded.type = 'Numeric ID (possibly pkey/visitor_id)';
      }

      // Try hex decode
      if (/^[a-f0-9]+$/i.test(value) && value.length % 2 === 0) {
        try {
          const hexDecoded = value.match(/.{2}/g).map(byte => String.fromCharCode(parseInt(byte, 16))).join('');
          if (/^[\x20-\x7E]+$/.test(hexDecoded)) {
            decoded.hexDecoded = hexDecoded;
          }
        } catch (e) {
          // Not valid hex
        }
      }

      setDecodedResult(decoded);
    } catch (error) {
      toast.error('Error decoding value');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Decode</h1>
          <p className="text-secondary-600 mt-1">
            Decode encoded values, hashes, and identifiers
          </p>
        </div>
        <div className="flex items-center gap-3">
          {domains.length > 0 && (
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
          )}
        </div>
      </div>

      {/* Decode Input */}
      <div className="bg-white rounded-lg border border-secondary-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Key className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-secondary-900">Enter Value to Decode</h2>
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
            placeholder="Enter encoded value, hash, pkey, or any identifier..."
            className="flex-1 px-4 py-3 text-sm border border-secondary-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <button
            onClick={handleDecode}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Decode
          </button>
        </div>
      </div>

      {/* Results */}
      {decodedResult && (
        <div className="bg-white rounded-lg border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Decode Results</h2>

          <div className="space-y-4">
            {decodedResult.type && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm font-medium text-secondary-600 mb-1">Detected Type</div>
                <div className="text-secondary-900">{decodedResult.type}</div>
              </div>
            )}

            {decodedResult.hashType && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm font-medium text-secondary-600 mb-1">Hash Type</div>
                <div className="text-secondary-900">{decodedResult.hashType}</div>
              </div>
            )}

            {decodedResult.base64 && decodedResult.base64 !== 'Not valid Base64' && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-secondary-600">Base64 Decoded</div>
                  <button
                    onClick={() => handleCopy(decodedResult.base64)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-secondary-900 font-mono break-all">{decodedResult.base64}</div>
              </div>
            )}

            {decodedResult.urlDecoded && decodedResult.urlDecoded !== inputValue && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-secondary-600">URL Decoded</div>
                  <button
                    onClick={() => handleCopy(decodedResult.urlDecoded)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-secondary-900 font-mono break-all">{decodedResult.urlDecoded}</div>
              </div>
            )}

            {decodedResult.hexDecoded && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-secondary-600">Hex Decoded</div>
                  <button
                    onClick={() => handleCopy(decodedResult.hexDecoded)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-secondary-900 font-mono break-all">{decodedResult.hexDecoded}</div>
              </div>
            )}

            {decodedResult.json && (
              <div className="p-4 bg-secondary-50 rounded-lg">
                <div className="text-sm font-medium text-secondary-600 mb-1">JSON Parsed</div>
                <pre className="text-secondary-900 font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decodedResult.json, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
