import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    if (response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/signin';
      return Promise.reject(error);
    }
    
    if (response?.status === 403) {
      toast.error('Access denied. You don\'t have permission to perform this action.');
    } else if (response?.status === 404) {
      toast.error('Resource not found.');
    } else if (response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (response?.data?.error) {
      toast.error(response.data.error);
    } else if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  signin: (data) => api.post('/auth/signin', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout'),
};

// Admin API
export const adminAPI = {
  // Dashboard
  getDashboard: () => api.get('/admin/dashboard'),
  
  // Users
  getUsers: (params) => api.get('/admin/users', { params }),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  
  // Expense Categories
  getExpenseCategories: () => api.get('/admin/expense-categories'),
  createExpenseCategory: (data) => api.post('/admin/expense-categories', data),
  updateExpenseCategory: (id, data) => api.put(`/admin/expense-categories/${id}`, data),
  
  // Approval Workflows
  getApprovalWorkflows: () => api.get('/admin/approval-workflows'),
  createApprovalWorkflow: (data) => api.post('/admin/approval-workflows', data),
  
  // Company Settings
  getCompanySettings: () => api.get('/admin/company-settings'),
  updateCompanySettings: (data) => api.put('/admin/company-settings', data),
  
  // Reports
  getExpenseReports: (params) => api.get('/admin/reports/expenses', { params }),
};

// Manager API
export const managerAPI = {
  // Dashboard
  getDashboard: () => api.get('/manager/dashboard'),
  
  // Approvals
  getPendingApprovals: (params) => api.get('/manager/approvals/pending', { params }),
  getApprovalDetails: (id) => api.get(`/manager/approvals/${id}`),
  processApproval: (id, data) => api.post(`/manager/approvals/${id}/process`, data),
  getApprovalHistory: (params) => api.get('/manager/approvals/history', { params }),
  
  // Team
  getTeamMembers: () => api.get('/manager/team/members'),
  getTeamExpenses: (params) => api.get('/manager/team/expenses', { params }),
  
  // Statistics
  getStats: (params) => api.get('/manager/stats', { params }),
};

// Employee API
export const employeeAPI = {
  // Dashboard
  getDashboard: () => api.get('/employee/dashboard'),
  
  // Expenses
  getExpenses: (params) => api.get('/employee/expenses', { params }),
  getExpenseDetails: (id) => api.get(`/employee/expenses/${id}`),
  createExpense: (data) => api.post('/employee/expenses', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateExpense: (id, data) => api.put(`/employee/expenses/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteExpense: (id) => api.delete(`/employee/expenses/${id}`),
  submitExpense: (id) => api.post(`/employee/expenses/${id}/submit`),
  
  // Categories and Currencies
  getExpenseCategories: () => api.get('/employee/expense-categories'),
  getSupportedCurrencies: () => api.get('/employee/currencies'),
  
  // Notifications
  getNotifications: (params) => api.get('/employee/notifications', { params }),
  markNotificationRead: (id) => api.put(`/employee/notifications/${id}/read`),
  markAllNotificationsRead: () => api.put('/employee/notifications/read-all'),
};

// Common API
export const commonAPI = {
  getCountries: (params) => api.get('/common/countries', { params }),
  getCountryByCode: (code) => api.get(`/common/countries/${code}`),
  getCurrencies: () => api.get('/common/currencies'),
  getExchangeRates: (base) => api.get(`/common/currencies/rates/${base}`),
  convertCurrency: (data) => api.post('/common/currencies/convert', data),
  getTimezones: () => api.get('/common/timezones'),
  getHealth: () => api.get('/common/health'),
  getConstants: () => api.get('/common/constants'),
};

export default api;