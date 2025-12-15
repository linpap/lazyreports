import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, Plus, Minus } from 'lucide-react';

// Level colors for hierarchy headers (matching PHP site)
const LEVEL_COLORS = [
  'bg-primary-100 text-primary-800', // Level 1 - primary color
  'bg-pink-100 text-pink-800',        // Level 2 - pink (like "Channel" in PHP)
  'bg-orange-100 text-orange-800',    // Level 3 - orange (like "SubID" in PHP)
  'bg-blue-100 text-blue-800',        // Level 4 - blue
  'bg-green-100 text-green-800',      // Level 5 - green
];

// Row background colors by level
const ROW_LEVEL_COLORS = [
  '',                                  // Level 0 - white
  'bg-gray-50',                        // Level 1 - light gray
  'bg-gray-100',                       // Level 2 - slightly darker
  'bg-gray-100',                       // Level 3
  'bg-gray-100',                       // Level 4
];

// Format number with commas
const formatNumber = (value) => {
  if (value === null || value === undefined) return '0';
  return Number(value).toLocaleString();
};

// Format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return '$0.00';
  return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Format percentage
const formatPercent = (value) => {
  if (value === null || value === undefined) return '0.00%';
  return `${Number(value).toFixed(2)}%`;
};

// Cell renderer based on type
const CellValue = ({ value, type, onClick, clickable }) => {
  const formatted = useMemo(() => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      case 'number':
      default:
        return formatNumber(value);
    }
  }, [value, type]);

  // Only make clickable if value is greater than 0
  const isClickable = clickable && onClick && Number(value) > 0;

  if (isClickable) {
    return (
      <button
        onClick={onClick}
        className="text-primary-600 hover:text-primary-800 hover:underline font-medium"
      >
        {formatted}
      </button>
    );
  }

  return <span>{formatted}</span>;
};

// Level header row component (like "Channel", "SubID" in PHP)
function LevelHeader({ label, level, colSpan }) {
  const colorClass = LEVEL_COLORS[level % LEVEL_COLORS.length];
  return (
    <tr className={`${colorClass}`}>
      <td colSpan={colSpan} className="px-4 py-2 text-sm font-semibold">
        {label}
      </td>
    </tr>
  );
}

// Expandable row component
function ExpandableRow({
  row,
  columns,
  level = 0,
  onCellClick,
  groupByFields = [],
  expandedRows,
  toggleRow,
  showLevelHeader = false,
  levelHeaderLabel = ''
}) {
  const hasChildren = row.children && row.children.length > 0;
  const isExpanded = expandedRows.has(row.id);
  const paddingLeft = level * 24;
  const rowBgClass = ROW_LEVEL_COLORS[Math.min(level, ROW_LEVEL_COLORS.length - 1)];

  // Get the next level's group label for child header
  const nextLevelLabel = groupByFields[level + 1]?.label || '';

  return (
    <>
      {/* Level header row if needed */}
      {showLevelHeader && levelHeaderLabel && (
        <LevelHeader label={levelHeaderLabel} level={level} colSpan={columns.length} />
      )}

      <tr className={`border-b border-secondary-100 hover:bg-secondary-50 ${rowBgClass}`}>
        {columns.map((col, colIndex) => {
          if (colIndex === 0) {
            // First column with expand/collapse and grouping value
            return (
              <td key={col.key} className="px-4 py-3 text-sm" style={{ paddingLeft: `${paddingLeft + 16}px` }}>
                <div className="flex items-center gap-2">
                  {hasChildren ? (
                    <button
                      onClick={() => toggleRow(row.id)}
                      className="w-5 h-5 flex items-center justify-center bg-secondary-200 hover:bg-secondary-300 rounded text-secondary-600"
                    >
                      {isExpanded ? (
                        <Minus className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </button>
                  ) : (
                    <span className="w-5" />
                  )}
                  <span className="font-medium text-secondary-900">
                    {row[col.key] || row.grouping || row.label || '-'}
                  </span>
                </div>
              </td>
            );
          }

          return (
            <td key={col.key} className="px-4 py-3 text-sm text-right">
              <CellValue
                value={row[col.key]}
                type={col.type}
                clickable={col.clickable}
                onClick={col.clickable ? () => onCellClick?.(col.key, row) : undefined}
              />
            </td>
          );
        })}
      </tr>

      {/* Render children if expanded - with level header */}
      {hasChildren && isExpanded && (
        <>
          {/* Show level header for children */}
          {nextLevelLabel && (
            <LevelHeader label={nextLevelLabel} level={level + 1} colSpan={columns.length} />
          )}
          {row.children.map((child) => (
            <ExpandableRow
              key={child.id}
              row={child}
              columns={columns}
              level={level + 1}
              onCellClick={onCellClick}
              groupByFields={groupByFields}
              expandedRows={expandedRows}
              toggleRow={toggleRow}
              showLevelHeader={false}
              levelHeaderLabel=""
            />
          ))}
        </>
      )}
    </>
  );
}

export default function AnalyticsTable({
  data = [],
  columns = [],
  groupByFields = [],
  onCellClick,
  onSort,
  sortConfig = { key: null, direction: 'asc' },
  isLoading = false,
  title = 'Report Data'
}) {
  const [expandedRows, setExpandedRows] = useState(new Set());

  const toggleRow = (rowId) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set();
    const collectIds = (rows) => {
      rows.forEach(row => {
        if (row.children && row.children.length > 0) {
          allIds.add(row.id);
          collectIds(row.children);
        }
      });
    };
    collectIds(data);
    setExpandedRows(allIds);
  };

  const collapseAll = () => {
    setExpandedRows(new Set());
  };

  // Calculate totals
  const totals = useMemo(() => {
    const result = {};
    columns.forEach(col => {
      if (col.key !== 'grouping' && col.type !== 'percent') {
        result[col.key] = data.reduce((sum, row) => sum + (Number(row[col.key]) || 0), 0);
      }
    });
    // Calculate percentages from totals
    if (result.visitors > 0) {
      result.engage_rate = (result.engaged / result.visitors) * 100;
      result.sales_rate = (result.sales / result.visitors) * 100;
      result.epc = result.revenue / result.visitors;
    }
    if (result.sales > 0) {
      result.aov = result.revenue / result.sales;
    }
    return result;
  }, [data, columns]);

  const handleSort = (key) => {
    if (onSort) {
      const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
      onSort({ key, direction });
    }
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="w-4 h-4 text-secondary-300" />;
    }
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-primary-500" />
      : <ArrowDown className="w-4 h-4 text-primary-500" />;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-secondary-200 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <span className="ml-3 text-secondary-600">Loading report data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-secondary-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-secondary-200 flex items-center justify-between">
        <h3 className="font-semibold text-secondary-900">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Expand All
          </button>
          <span className="text-secondary-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
          >
            Collapse All
          </button>
          <span className="text-secondary-300 ml-4">|</span>
          <span className="text-xs text-secondary-500">{data.length} rows</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary-50">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider ${
                    index === 0 ? 'text-left' : 'text-right'
                  } ${col.sortable ? 'cursor-pointer hover:bg-secondary-100' : ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={`flex items-center gap-1 ${index === 0 ? '' : 'justify-end'}`}>
                    {col.label}
                    {col.sortable && getSortIcon(col.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-secondary-500">
                  No data available for the selected filters
                </td>
              </tr>
            ) : (
              <>
                {data.map((row) => (
                  <ExpandableRow
                    key={row.id}
                    row={row}
                    columns={columns}
                    onCellClick={onCellClick}
                    groupByFields={groupByFields}
                    expandedRows={expandedRows}
                    toggleRow={toggleRow}
                    showLevelHeader={false}
                    levelHeaderLabel=""
                  />
                ))}
              </>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="bg-secondary-100 font-semibold">
              <tr>
                {columns.map((col, index) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm ${index === 0 ? 'text-left' : 'text-right'}`}
                  >
                    {index === 0 ? (
                      <span className="font-bold text-secondary-900">TOTALS</span>
                    ) : (
                      <CellValue
                        value={totals[col.key]}
                        type={col.type}
                        clickable={col.clickable}
                        onClick={col.clickable ? () => onCellClick?.(col.key, { ...totals, isTotal: true }) : undefined}
                      />
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
