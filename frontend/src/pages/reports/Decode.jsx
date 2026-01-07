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

      // Try Base64 decode of entire value
      try {
        const base64Decoded = atob(value);
        // Check if result is printable
        if (/^[\x20-\x7E\s]+$/.test(base64Decoded)) {
          decoded.base64 = base64Decoded;
        } else {
          decoded.base64 = 'Not valid Base64';
        }
      } catch (e) {
        decoded.base64 = 'Not valid Base64';
      }

      // Check for LazySauce encoded hash format: {dkey}_{base64_pkey}{3-char-suffix}
      // Example: 2427_MTU5NTYyOQ==48c
      // The format is: dkey_[base64 encoded pkey][3 char suffix]
      // To decode: split by _, take second part, remove last 3 chars, base64 decode
      const lazySauceMatch = value.match(/^(\d+)_(.+)$/);
      if (lazySauceMatch) {
        const [, dkey, encodedPart] = lazySauceMatch;
        // Remove last 3 characters (suffix) before decoding
        if (encodedPart.length > 3) {
          const suffix = encodedPart.slice(-3);
          const base64Part = encodedPart.slice(0, -3);
          try {
            const decodedPkey = atob(base64Part);
            decoded.lazySauceFormat = {
              dkey,
              fullEncodedPart: encodedPart,
              base64Part,
              suffix,
              decodedPkey,
              database: `lazysauce_${dkey}`
            };
            decoded.type = 'LazySauce Encoded Hash';
          } catch (e) {
            // Not valid base64, try without removing suffix
            try {
              const decodedPkey = atob(encodedPart);
              decoded.lazySauceFormat = {
                dkey,
                fullEncodedPart: encodedPart,
                base64Part: encodedPart,
                suffix: '',
                decodedPkey,
                database: `lazysauce_${dkey}`
              };
              decoded.type = 'LazySauce Encoded Hash';
            } catch (e2) {
              // Not valid embedded base64
            }
          }
        }
      }

      // Look for embedded base64 patterns (strings ending with = or ==)
      if (!decoded.lazySauceFormat) {
        const base64Pattern = /([A-Za-z0-9+/]{4,}={1,2})/g;
        const matches = value.match(base64Pattern);
        if (matches && matches.length > 0) {
          decoded.embeddedBase64 = [];
          for (const match of matches) {
            try {
              const decodedMatch = atob(match);
              if (/^[\x20-\x7E\s]+$/.test(decodedMatch)) {
                decoded.embeddedBase64.push({
                  encoded: match,
                  decoded: decodedMatch
                });
              }
            } catch (e) {
              // Skip invalid base64
            }
          }
          if (decoded.embeddedBase64.length === 0) {
            delete decoded.embeddedBase64;
          }
        }
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
            {/* Always show original value */}
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium text-secondary-600">Original Value</div>
                <button
                  onClick={() => handleCopy(inputValue)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="text-secondary-900 font-mono break-all">{inputValue}</div>
            </div>

            {decodedResult.type && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-600 mb-1">Detected Type</div>
                <div className="text-secondary-900">{decodedResult.type}</div>
              </div>
            )}

            {decodedResult.lazySauceFormat && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-green-600">Decoded Hash</div>
                  <button
                    onClick={() => handleCopy(decodedResult.lazySauceFormat.decodedPkey)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="text-secondary-900">
                    <span className="text-secondary-500">Decoded Pkey:</span>{' '}
                    <span className="font-mono font-bold text-green-700 text-lg">{decodedResult.lazySauceFormat.decodedPkey}</span>
                  </div>
                  <div className="text-secondary-900">
                    <span className="text-secondary-500">Database:</span>{' '}
                    <span className="font-mono">{decodedResult.lazySauceFormat.database}</span>
                  </div>
                  <div className="text-secondary-900">
                    <span className="text-secondary-500">Dkey:</span>{' '}
                    <span className="font-mono">{decodedResult.lazySauceFormat.dkey}</span>
                  </div>
                  <div className="text-secondary-900">
                    <span className="text-secondary-500">Base64 Part:</span>{' '}
                    <span className="font-mono text-sm">{decodedResult.lazySauceFormat.base64Part}</span>
                  </div>
                  {decodedResult.lazySauceFormat.suffix && (
                    <div className="text-secondary-900">
                      <span className="text-secondary-500">Suffix:</span>{' '}
                      <span className="font-mono">{decodedResult.lazySauceFormat.suffix}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {decodedResult.embeddedBase64 && decodedResult.embeddedBase64.length > 0 && (
              <div className="p-4 bg-teal-50 rounded-lg">
                <div className="text-sm font-medium text-teal-600 mb-2">Embedded Base64 Found</div>
                <div className="space-y-2">
                  {decodedResult.embeddedBase64.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-sm text-secondary-500">{item.encoded}</span>
                        <span className="mx-2">→</span>
                        <span className="font-mono font-bold text-teal-700">{item.decoded}</span>
                      </div>
                      <button
                        onClick={() => handleCopy(item.decoded)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {decodedResult.hashType && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-sm font-medium text-purple-600 mb-1">Hash Type</div>
                <div className="text-secondary-900">{decodedResult.hashType}</div>
              </div>
            )}

            {decodedResult.base64 && decodedResult.base64 !== 'Not valid Base64' && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-green-600">Base64 Decoded</div>
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
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-orange-600">URL Decoded</div>
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
              <div className="p-4 bg-cyan-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-cyan-600">Hex Decoded</div>
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
              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="text-sm font-medium text-indigo-600 mb-1">JSON Parsed</div>
                <pre className="text-secondary-900 font-mono text-sm overflow-x-auto">
                  {JSON.stringify(decodedResult.json, null, 2)}
                </pre>
              </div>
            )}

            {/* Show message if no special decoding found */}
            {!decodedResult.type &&
             !decodedResult.hashType &&
             !decodedResult.lazySauceFormat &&
             !decodedResult.embeddedBase64 &&
             (decodedResult.base64 === 'Not valid Base64') &&
             (decodedResult.urlDecoded === inputValue) &&
             !decodedResult.hexDecoded &&
             !decodedResult.json && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-sm font-medium text-yellow-600 mb-1">Analysis</div>
                <div className="text-secondary-700">
                  No special encoding detected. The value appears to be plain text.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
