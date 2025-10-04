const { Op } = require('sequelize');

// Format currency amount
const formatCurrency = (amount, currency = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

// Calculate days between dates
const daysBetween = (date1, date2) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
};

// Generate pagination metadata
const getPaginationMeta = (count, page, limit) => {
  const totalPages = Math.ceil(count / limit);
  
  return {
    total: count,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: totalPages,
    has_prev: page > 1,
    has_next: page < totalPages,
    prev_page: page > 1 ? page - 1 : null,
    next_page: page < totalPages ? page + 1 : null
  };
};

// Build search query for Sequelize
const buildSearchQuery = (fields, searchTerm) => {
  if (!searchTerm || !fields || fields.length === 0) {
    return {};
  }
  
  const searchConditions = fields.map(field => ({
    [field]: { [Op.like]: `%${searchTerm}%` }
  }));
  
  return { [Op.or]: searchConditions };
};

// Build date range query
const buildDateRangeQuery = (field, startDate, endDate) => {
  const query = {};
  
  if (startDate && endDate) {
    query[field] = { [Op.between]: [startDate, endDate] };
  } else if (startDate) {
    query[field] = { [Op.gte]: startDate };
  } else if (endDate) {
    query[field] = { [Op.lte]: endDate };
  }
  
  return query;
};

// Validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate currency code
const isValidCurrencyCode = (code) => {
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(code);
};

// Generate random string
const generateRandomString = (length = 8) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
};

// Generate expense reference number
const generateExpenseReference = (prefix = 'EXP') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// Sanitize filename for file uploads
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

// Calculate percentage
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 100) / 100; // Round to 2 decimal places
};

// Deep clone object
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Capitalize first letter
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// Convert snake_case to camelCase
const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
};

// Convert camelCase to snake_case
const toSnakeCase = (str) => {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

// Validate amount format
const isValidAmount = (amount, min = 0.01, max = 999999.99) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= min && num <= max;
};

// Round to decimal places
const roundToDecimal = (number, decimals = 2) => {
  return Math.round(number * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

// Get file extension
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

// Check if file type is allowed
const isAllowedFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

// Generate slug from string
const generateSlug = (str) => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Mask sensitive data
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.length > 2 
    ? username.slice(0, 2) + '*'.repeat(username.length - 2)
    : username;
  return `${maskedUsername}@${domain}`;
};

// Get time ago string
const getTimeAgo = (date) => {
  const now = new Date();
  const diffInSeconds = Math.floor((now - new Date(date)) / 1000);
  
  const intervals = [
    { label: 'year', seconds: 31536000 },
    { label: 'month', seconds: 2592000 },
    { label: 'week', seconds: 604800 },
    { label: 'day', seconds: 86400 },
    { label: 'hour', seconds: 3600 },
    { label: 'minute', seconds: 60 }
  ];
  
  for (const interval of intervals) {
    const count = Math.floor(diffInSeconds / interval.seconds);
    if (count >= 1) {
      return `${count} ${interval.label}${count > 1 ? 's' : ''} ago`;
    }
  }
  
  return 'Just now';
};

// Validate date range
const isValidDateRange = (startDate, endDate, maxDays = 365) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = (end - start) / (1000 * 60 * 60 * 24);
  
  return start <= end && diffDays <= maxDays;
};

// Extract numbers from string
const extractNumbers = (str) => {
  return str.match(/\d+/g)?.map(Number) || [];
};

// Truncate text
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
};

module.exports = {
  formatCurrency,
  formatDate,
  daysBetween,
  getPaginationMeta,
  buildSearchQuery,
  buildDateRangeQuery,
  isValidEmail,
  isValidCurrencyCode,
  generateRandomString,
  generateExpenseReference,
  sanitizeFilename,
  calculatePercentage,
  deepClone,
  capitalize,
  toCamelCase,
  toSnakeCase,
  isValidAmount,
  roundToDecimal,
  getFileExtension,
  isAllowedFileType,
  generateSlug,
  maskEmail,
  getTimeAgo,
  isValidDateRange,
  extractNumbers,
  truncateText
};