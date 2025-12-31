import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token and timezone
api.interceptors.request.use(
  (config) => {
    const { token, user } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add user's timezone to all requests with query params
    if (user?.timezone && config.params) {
      config.params.timezone = user.timezone;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we have a refresh token, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data.data;
          useAuthStore.getState().setToken(accessToken);

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          useAuthStore.getState().logout();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// =====================
// AUTH API
// =====================

export const authApi = {
  login: (username, password) =>
    api.post('/auth/login', { username, password }),

  affiliateLogin: (username, password) =>
    api.post('/auth/affiliate/login', { username, password }),

  logout: () => api.post('/auth/logout'),

  refreshToken: (refreshToken) =>
    api.post('/auth/refresh', { refreshToken }),

  getCurrentUser: () => api.get('/auth/me'),

  updateProfile: (data) => api.put('/auth/profile', data),

  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/password', { currentPassword, newPassword }),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token, newPassword) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// =====================
// ANALYTICS API
// =====================

export const analyticsApi = {
  getAnalytics: (params) => api.get('/analytics', { params }),

  // Full analytics report with grouping support
  getAnalyticsReport: (params) => api.get('/analytics/report', { params }),

  // Domain report - tracking domains inventory
  getDomainReport: (params) => api.get('/domain-report', { params }),
  updateDomainAdvertiser: (id, aid) => api.put(`/domain-report/${id}`, { aid }),
  deleteDomain: (id) => api.delete(`/domain-report/${id}`),

  // Get detail records (visitors, engaged, sales)
  getAnalyticsDetail: (params) => api.get('/analytics/detail', { params }),

  // Get individual visitor/action details
  getVisitorDetail: (id, params) => api.get(`/analytics/visitor/${id}`, { params }),
  getActionDetail: (id, params) => api.get(`/analytics/action/${id}`, { params }),

  getAffiliateAnalytics: (params) =>
    api.get('/analytics/affiliate', { params }),

  getAnalyticsMap: (params) => api.get('/analytics/map', { params }),

  getAverages: (params) => api.get('/averages', { params }),
  getWeeklyAverages: (params) => api.get('/averages/weekly', { params }),
};

// =====================
// DOMAINS API
// =====================

export const domainsApi = {
  // Get user's available domains/offers for selection dropdown
  getDomains: () => api.get('/domains'),

  // Get user's default offer
  getDefaultOffer: () => api.get('/default-offer'),

  // Save user's default offer
  saveDefaultOffer: (dkey, offerName) => api.post('/default-offer', { dkey, offerName }),
};

// =====================
// DATA API
// =====================

export const dataApi = {
  getApproximate: (query, type, dkey) =>
    api.get('/approximate', { params: { query, type, dkey } }),

  getIPActions: (params) => api.get('/ip-actions', { params }),

  clearIP: (ip) => api.delete(`/ip-actions/${encodeURIComponent(ip)}`),

  getChannels: (params) => api.get('/channels', { params }),

  getClients: (params) => api.get('/clients', { params }),

  getClientReport: (clientId, params) => api.get(`/clients/${clientId}/report`, { params }),

  getConversions: (params) => api.get('/conversions', { params }),

  getOffers: (params) => api.get('/offers', { params }),

  getRawwords: (params) => api.get('/rawwords', { params }),

  runCustomSql: (query) => api.post('/custom-sql', { query }),

  // Custom reports from database (categorized: searchlight, dejavu, client)
  getCustomReportsFromDB: () => api.get('/custom-reports'),
};

// =====================
// SETTINGS API
// =====================

export const settingsApi = {
  saveDefaultDate: (data) => api.post('/settings/default-date', data),

  saveDefaultOffer: (offerId) =>
    api.post('/settings/default-offer', { offerId }),

  saveTimezone: (timezone) =>
    api.post('/settings/timezone', { timezone }),
};

// =====================
// REPORTS API
// =====================

export const reportsApi = {
  getSavedReports: () => api.get('/reports'),

  saveReport: (data) => api.post('/reports', data),

  updateReport: (id, data) => api.put(`/reports/${id}`, data),

  deleteReport: (id) => api.delete(`/reports/${id}`),
};

// =====================
// COLUMN SETS API
// =====================

export const columnSetsApi = {
  getColumnSets: (reportType) =>
    api.get('/column-sets', { params: { reportType } }),

  saveColumnSet: (data) => api.post('/column-sets', data),

  deleteColumnSet: (id) => api.delete(`/column-sets/${id}`),
};

// =====================
// FILTERS API
// =====================

export const filtersApi = {
  getFilters: (reportType) =>
    api.get('/filters', { params: { reportType } }),

  saveFilter: (data) => api.post('/filters', data),

  deleteFilter: (id) => api.delete(`/filters/${id}`),
};

// =====================
// SALES API
// =====================

export const salesApi = {
  importSales: (sales) => api.post('/sales/import', { sales }),
};

// =====================
// ADVERTISERS API (Admin)
// =====================

export const advertisersApi = {
  getAll: () => api.get('/advertisers'),
  create: (data) => api.post('/advertisers', data),
  update: (id, data) => api.put(`/advertisers/${id}`, data),
  delete: (id) => api.delete(`/advertisers/${id}`),
};
