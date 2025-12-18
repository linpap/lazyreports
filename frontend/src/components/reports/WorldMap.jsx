import { useState, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from 'react-simple-maps';

// TopoJSON for world countries
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Country name to ISO code mapping (common variations)
const countryNameToCode = {
  'United States': 'USA',
  'United States of America': 'USA',
  'USA': 'USA',
  'US': 'USA',
  'United Kingdom': 'GBR',
  'UK': 'GBR',
  'Great Britain': 'GBR',
  'Canada': 'CAN',
  'Australia': 'AUS',
  'Germany': 'DEU',
  'France': 'FRA',
  'India': 'IND',
  'China': 'CHN',
  'Japan': 'JPN',
  'Brazil': 'BRA',
  'Mexico': 'MEX',
  'Spain': 'ESP',
  'Italy': 'ITA',
  'Netherlands': 'NLD',
  'Russia': 'RUS',
  'Russian Federation': 'RUS',
  'South Korea': 'KOR',
  'Korea': 'KOR',
  'South Africa': 'ZAF',
  'Argentina': 'ARG',
  'Poland': 'POL',
  'Sweden': 'SWE',
  'Belgium': 'BEL',
  'Switzerland': 'CHE',
  'Austria': 'AUT',
  'Norway': 'NOR',
  'Denmark': 'DNK',
  'Finland': 'FIN',
  'Ireland': 'IRL',
  'New Zealand': 'NZL',
  'Singapore': 'SGP',
  'Hong Kong': 'HKG',
  'Philippines': 'PHL',
  'Indonesia': 'IDN',
  'Thailand': 'THA',
  'Vietnam': 'VNM',
  'Malaysia': 'MYS',
  'Taiwan': 'TWN',
  'Pakistan': 'PAK',
  'Bangladesh': 'BGD',
  'Nigeria': 'NGA',
  'Egypt': 'EGY',
  'Kenya': 'KEN',
  'Ghana': 'GHA',
  'Colombia': 'COL',
  'Chile': 'CHL',
  'Peru': 'PER',
  'Venezuela': 'VEN',
  'Puerto Rico': 'PRI',
  'Turkey': 'TUR',
  'Greece': 'GRC',
  'Portugal': 'PRT',
  'Czech Republic': 'CZE',
  'Czechia': 'CZE',
  'Romania': 'ROU',
  'Hungary': 'HUN',
  'Ukraine': 'UKR',
  'Israel': 'ISR',
  'United Arab Emirates': 'ARE',
  'UAE': 'ARE',
  'Saudi Arabia': 'SAU',
  'Ethiopia': 'ETH',
};

// Color scale from blue to orange (matching LazySauce brand)
const colorScale = [
  '#1e3a5f', // darkest blue
  '#2c5282',
  '#3182ce',
  '#4299e1',
  '#63b3ed',
  '#90cdf4',
  '#bee3f8',
  '#fbd38d',
  '#f6ad55',
  '#ed8936',
  '#dd6b20',
  '#F26522', // LazySauce orange
];

function getColor(value, min, max) {
  if (value === 0 || value === undefined) return '#e2e8f0'; // gray for no data

  const normalizedValue = (value - min) / (max - min);
  const index = Math.min(
    Math.floor(normalizedValue * (colorScale.length - 1)),
    colorScale.length - 1
  );
  return colorScale[index];
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

export default function WorldMap({ data, className = '' }) {
  const [selectedMetric, setSelectedMetric] = useState('visitors');
  const [tooltipContent, setTooltipContent] = useState('');
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Transform data into a map by country
  const countryData = useMemo(() => {
    const map = {};
    data.forEach((row) => {
      const countryName = row.grouping || row.country || row.label;
      if (countryName) {
        // Try to get ISO code, fallback to name
        const code = countryNameToCode[countryName] || countryName.toUpperCase().slice(0, 3);
        map[countryName] = {
          ...row,
          code,
          name: countryName,
        };
        // Also map by code for easy lookup
        map[code] = map[countryName];
      }
    });
    return map;
  }, [data]);

  // Calculate min/max for color scale
  const { min, max } = useMemo(() => {
    const values = data.map((row) => row[selectedMetric] || 0).filter((v) => v > 0);
    return {
      min: Math.min(...values, 0),
      max: Math.max(...values, 1),
    };
  }, [data, selectedMetric]);

  // Generate legend ranges
  const legendRanges = useMemo(() => {
    const step = (max - min) / 11;
    return colorScale.map((color, index) => {
      const rangeMin = Math.round(min + step * index);
      const rangeMax = Math.round(min + step * (index + 1));
      return {
        color,
        label: `${formatNumber(rangeMin)} - ${formatNumber(rangeMax)} ${selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)}`,
      };
    }).reverse();
  }, [min, max, selectedMetric]);

  const handleMouseEnter = (geo, evt) => {
    const countryName = geo.properties.name;
    const countryInfo = countryData[countryName] || countryData[countryNameToCode[countryName]];

    if (countryInfo) {
      setTooltipContent(`${countryName}: ${formatNumber(countryInfo[selectedMetric] || 0)} ${selectedMetric}`);
    } else {
      setTooltipContent(`${countryName}: No data`);
    }
    setTooltipPosition({ x: evt.clientX, y: evt.clientY });
  };

  const handleMouseLeave = () => {
    setTooltipContent('');
  };

  const metrics = [
    { key: 'visitors', label: 'Visitors' },
    { key: 'engaged', label: 'Engaged' },
    { key: 'sales', label: 'Sales' },
  ];

  return (
    <div className={`bg-white rounded-2xl border border-secondary-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-secondary-100">
        <h3 className="text-lg font-semibold text-secondary-900">Geographic Distribution</h3>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Legend */}
        <div className="lg:w-48 p-4 border-b lg:border-b-0 lg:border-r border-secondary-100 bg-secondary-50/50">
          <div className="space-y-1.5">
            {legendRanges.map((range, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-4 rounded flex-shrink-0"
                  style={{ backgroundColor: range.color }}
                />
                <span className="text-secondary-600 truncate">{range.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 120,
              center: [0, 30],
            }}
            style={{ width: '100%', height: 'auto', maxHeight: '500px' }}
          >
            <ZoomableGroup>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const countryName = geo.properties.name;
                    const countryInfo = countryData[countryName] || countryData[countryNameToCode[countryName]];
                    const value = countryInfo?.[selectedMetric] || 0;

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getColor(value, min, max)}
                        stroke="#fff"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: 'none' },
                          hover: { outline: 'none', fill: '#F26522', cursor: 'pointer' },
                          pressed: { outline: 'none' },
                        }}
                        onMouseEnter={(evt) => handleMouseEnter(geo, evt)}
                        onMouseLeave={handleMouseLeave}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Tooltip */}
          {tooltipContent && (
            <div
              className="fixed z-50 px-3 py-2 text-sm bg-secondary-900 text-white rounded-lg shadow-lg pointer-events-none"
              style={{
                left: tooltipPosition.x + 10,
                top: tooltipPosition.y - 30,
              }}
            >
              {tooltipContent}
            </div>
          )}
        </div>
      </div>

      {/* Metric Toggle */}
      <div className="flex justify-center gap-2 p-4 border-t border-secondary-100">
        {metrics.map((metric) => (
          <button
            key={metric.key}
            onClick={() => setSelectedMetric(metric.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              selectedMetric === metric.key
                ? 'bg-secondary-700 text-white'
                : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
            }`}
          >
            {metric.label}
          </button>
        ))}
      </div>
    </div>
  );
}
