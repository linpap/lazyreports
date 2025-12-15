// Group By field options matching existing PHP app
export const GROUP_BY_OPTIONS = [
  { id: 1, label: 'Channel', field: 'channel' },
  { id: 2, label: 'Subchannel (stripped)', field: 'subchannel_stripped' },
  { id: 3, label: 'Country', field: 'country' },
  { id: 4, label: 'Keyword', field: 'keyword' },
  { id: 5, label: 'Rawword', field: 'rawword' },
  { id: 6, label: 'State', field: 'state' },
  { id: 7, label: 'Device Type', field: 'device_type' },
  { id: 8, label: 'Operating System', field: 'os' },
  { id: 9, label: 'Operating System + Version', field: 'os_version' },
  { id: 10, label: 'Browser', field: 'browser' },
  { id: 11, label: 'Browser + Version', field: 'browser_version' },
  { id: 12, label: 'Day of Week', field: 'day_of_week' },
  { id: 13, label: 'Time of Day', field: 'hour' },
  { id: 14, label: 'Landing Page', field: 'landing_page' },
  { id: 15, label: 'Landing Page + Variant', field: 'landing_page_variant' },
  { id: 16, label: 'Subchannel (full)', field: 'subchannel' },
  { id: 18, label: 'State, City', field: 'state_city' },
  { id: 19, label: 'Source Domain', field: 'source_domain' },
  { id: 20, label: 'IP Address', field: 'ip' },
  { id: 21, label: 'IP Organization', field: 'ip_org' },
  { id: 22, label: 'ISP', field: 'isp' },
  { id: 23, label: 'Visit Date', field: 'date' },
  { id: 24, label: 'Visit Date + Day of Week', field: 'date_dow' },
];

// Report column definitions
export const REPORT_COLUMNS = [
  { key: 'grouping', label: 'Group', sortable: true, clickable: false },
  { key: 'visitors', label: 'Visitors', sortable: true, clickable: true, type: 'number' },
  { key: 'engaged', label: 'Engage', sortable: true, clickable: true, type: 'number' },
  { key: 'engage_rate', label: 'Engage %', sortable: true, clickable: false, type: 'percent' },
  { key: 'sales', label: 'Sales', sortable: true, clickable: true, type: 'number' },
  { key: 'sales_rate', label: 'Sales %', sortable: true, clickable: false, type: 'percent' },
  { key: 'revenue', label: 'Revenue', sortable: true, clickable: false, type: 'currency' },
  { key: 'aov', label: 'AOV', sortable: true, clickable: false, type: 'currency' },
  { key: 'epc', label: 'EPC', sortable: true, clickable: false, type: 'currency' },
  { key: 'fraud', label: 'Fraud', sortable: true, clickable: false, type: 'number' },
];

// Filter types
export const FILTER_TYPES = [
  { key: 'channel', label: 'Channel', placeholder: 'Search channels...' },
  { key: 'subchannel', label: 'Subchannel', placeholder: 'Search subchannels...' },
  { key: 'country', label: 'Country', placeholder: 'Search countries...' },
  { key: 'keyword', label: 'Keyword', placeholder: 'Search keywords...' },
  { key: 'iporg', label: 'IP Organization', placeholder: 'Search organizations...' },
  { key: 'page_action', label: 'Page/Action', placeholder: 'Search actions...' },
];

// Date preset options
export const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];
