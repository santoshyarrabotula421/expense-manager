import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { commonAPI } from '../services/api';

// Initial state
const initialState = {
  // App configuration
  constants: null,
  countries: [],
  currencies: [],
  timezones: [],
  
  // UI state
  sidebarOpen: false,
  theme: 'light',
  
  // Data cache
  expenseCategories: [],
  
  // Loading states
  isLoadingConstants: false,
  isLoadingCountries: false,
  isLoadingCurrencies: false,
  
  // Error states
  error: null,
};

// Action types
const ActionTypes = {
  // App configuration
  SET_CONSTANTS: 'SET_CONSTANTS',
  SET_COUNTRIES: 'SET_COUNTRIES',
  SET_CURRENCIES: 'SET_CURRENCIES',
  SET_TIMEZONES: 'SET_TIMEZONES',
  
  // UI actions
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR: 'SET_SIDEBAR',
  SET_THEME: 'SET_THEME',
  
  // Data cache
  SET_EXPENSE_CATEGORIES: 'SET_EXPENSE_CATEGORIES',
  
  // Loading states
  SET_LOADING: 'SET_LOADING',
  
  // Error handling
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
};

// Reducer
const appReducer = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_CONSTANTS:
      return {
        ...state,
        constants: action.payload,
        isLoadingConstants: false,
      };
      
    case ActionTypes.SET_COUNTRIES:
      return {
        ...state,
        countries: action.payload,
        isLoadingCountries: false,
      };
      
    case ActionTypes.SET_CURRENCIES:
      return {
        ...state,
        currencies: action.payload,
        isLoadingCurrencies: false,
      };
      
    case ActionTypes.SET_TIMEZONES:
      return {
        ...state,
        timezones: action.payload,
      };
      
    case ActionTypes.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
      
    case ActionTypes.SET_SIDEBAR:
      return {
        ...state,
        sidebarOpen: action.payload,
      };
      
    case ActionTypes.SET_THEME:
      return {
        ...state,
        theme: action.payload,
      };
      
    case ActionTypes.SET_EXPENSE_CATEGORIES:
      return {
        ...state,
        expenseCategories: action.payload,
      };
      
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        [action.payload.key]: action.payload.value,
      };
      
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
      };
      
    case ActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
      
    default:
      return state;
  }
};

// Create context
const AppContext = createContext();

// App provider component
export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load initial data
  useEffect(() => {
    loadConstants();
    loadThemeFromStorage();
  }, []);

  // Load app constants
  const loadConstants = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingConstants', value: true } });
      const response = await commonAPI.getConstants();
      dispatch({ type: ActionTypes.SET_CONSTANTS, payload: response.data.constants });
    } catch (error) {
      console.error('Failed to load constants:', error);
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingConstants', value: false } });
    }
  };

  // Load countries
  const loadCountries = async (params = {}) => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingCountries', value: true } });
      const response = await commonAPI.getCountries(params);
      dispatch({ type: ActionTypes.SET_COUNTRIES, payload: response.data.countries });
    } catch (error) {
      console.error('Failed to load countries:', error);
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingCountries', value: false } });
    }
  };

  // Load currencies
  const loadCurrencies = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingCurrencies', value: true } });
      const response = await commonAPI.getCurrencies();
      dispatch({ type: ActionTypes.SET_CURRENCIES, payload: response.data.currencies });
    } catch (error) {
      console.error('Failed to load currencies:', error);
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'isLoadingCurrencies', value: false } });
    }
  };

  // Load timezones
  const loadTimezones = async () => {
    try {
      const response = await commonAPI.getTimezones();
      dispatch({ type: ActionTypes.SET_TIMEZONES, payload: response.data.timezones });
    } catch (error) {
      console.error('Failed to load timezones:', error);
    }
  };

  // Load expense categories
  const loadExpenseCategories = async (categories) => {
    dispatch({ type: ActionTypes.SET_EXPENSE_CATEGORIES, payload: categories });
  };

  // UI actions
  const toggleSidebar = () => {
    dispatch({ type: ActionTypes.TOGGLE_SIDEBAR });
  };

  const setSidebar = (isOpen) => {
    dispatch({ type: ActionTypes.SET_SIDEBAR, payload: isOpen });
  };

  // Theme management
  const setTheme = (theme) => {
    dispatch({ type: ActionTypes.SET_THEME, payload: theme });
    localStorage.setItem('theme', theme);
    
    // Apply theme to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadThemeFromStorage = () => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
  };

  // Currency conversion
  const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    try {
      const response = await commonAPI.convertCurrency({
        amount,
        from_currency: fromCurrency,
        to_currency: toCurrency,
      });
      return response.data;
    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw error;
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      return `${currency} ${parseFloat(amount).toFixed(2)}`;
    }
  };

  // Format date
  const formatDate = (date, format = 'short', locale = 'en-US') => {
    try {
      const dateObj = new Date(date);
      
      const options = {
        short: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        datetime: { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
      };
      
      return new Intl.DateTimeFormat(locale, options[format] || options.short).format(dateObj);
    } catch (error) {
      return date;
    }
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    const statusClasses = {
      draft: 'badge-gray',
      submitted: 'badge-info',
      in_approval: 'badge-warning',
      approved: 'badge-success',
      rejected: 'badge-danger',
      paid: 'badge-success',
      pending: 'badge-warning',
      skipped: 'badge-gray',
    };
    return statusClasses[status] || 'badge-gray';
  };

  // Error handling
  const setError = (error) => {
    dispatch({ type: ActionTypes.SET_ERROR, payload: error });
  };

  const clearError = () => {
    dispatch({ type: ActionTypes.CLEAR_ERROR });
  };

  const value = {
    ...state,
    // Data loaders
    loadConstants,
    loadCountries,
    loadCurrencies,
    loadTimezones,
    loadExpenseCategories,
    
    // UI actions
    toggleSidebar,
    setSidebar,
    setTheme,
    
    // Utilities
    convertCurrency,
    formatCurrency,
    formatDate,
    getStatusBadgeClass,
    
    // Error handling
    setError,
    clearError,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use app context
export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;