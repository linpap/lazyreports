import { create } from 'zustand';
import dayjs from 'dayjs';

export const useFilterStore = create((set, get) => ({
  // Date range
  startDate: dayjs().format('YYYY-MM-DD'),
  endDate: dayjs().format('YYYY-MM-DD'),
  datePreset: 'today',

  // Selected domain/offer (dkey)
  selectedDkey: null,
  selectedDomainName: null,

  // Filters
  offer: null,
  channel: null,
  affiliate: null,
  country: null,

  // Actions
  setDateRange: (startDate, endDate, preset = 'custom') => {
    set({ startDate, endDate, datePreset: preset });
  },

  setDatePreset: (preset) => {
    const today = dayjs();
    let startDate, endDate;

    switch (preset) {
      case 'today':
        startDate = today.format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'yesterday':
        startDate = today.subtract(1, 'day').format('YYYY-MM-DD');
        endDate = today.subtract(1, 'day').format('YYYY-MM-DD');
        break;
      case 'last7days':
        startDate = today.subtract(7, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'last30days':
        startDate = today.subtract(30, 'day').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'thisMonth':
        startDate = today.startOf('month').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      case 'lastMonth':
        startDate = today.subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
        endDate = today.subtract(1, 'month').endOf('month').format('YYYY-MM-DD');
        break;
      case 'thisYear':
        startDate = today.startOf('year').format('YYYY-MM-DD');
        endDate = today.format('YYYY-MM-DD');
        break;
      default:
        return;
    }

    set({ startDate, endDate, datePreset: preset });
  },

  setSelectedDomain: (dkey, name) => set({ selectedDkey: dkey, selectedDomainName: name }),
  setOffer: (offer) => set({ offer }),
  setChannel: (channel) => set({ channel }),
  setAffiliate: (affiliate) => set({ affiliate }),
  setCountry: (country) => set({ country }),

  resetFilters: () => {
    set({
      offer: null,
      channel: null,
      affiliate: null,
      country: null,
    });
  },

  // Get all filters as query params
  getQueryParams: () => {
    const state = get();
    const params = {
      startDate: state.startDate,
      endDate: state.endDate,
      // Include user's timezone for proper date filtering
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    // Include selected domain (dkey) for tenant database selection
    if (state.selectedDkey) params.dkey = state.selectedDkey;
    if (state.offer) params.offer = state.offer;
    if (state.channel) params.channel = state.channel;
    if (state.affiliate) params.affiliate = state.affiliate;
    if (state.country) params.country = state.country;

    return params;
  },
}));

export default useFilterStore;
