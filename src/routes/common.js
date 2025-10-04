const express = require('express');
const router = express.Router();

const countryService = require('../services/countryService');
const currencyService = require('../services/currencyService');

// Get all countries
router.get('/countries', async (req, res) => {
  try {
    const { search, region, popular } = req.query;
    
    let countries;
    
    if (search) {
      countries = countryService.searchCountries(search);
    } else if (region) {
      countries = countryService.getCountriesByRegion(region);
    } else if (popular === 'true') {
      countries = countryService.getPopularCountries();
    } else {
      countries = countryService.getCountriesSorted();
    }
    
    res.json({ countries });
  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

// Get country by code
router.get('/countries/:code', (req, res) => {
  try {
    const { code } = req.params;
    const country = countryService.getCountryByCode(code);
    
    if (!country) {
      return res.status(404).json({ error: 'Country not found' });
    }
    
    res.json({ country });
  } catch (error) {
    console.error('Get country error:', error);
    res.status(500).json({ error: 'Failed to fetch country' });
  }
});

// Get supported currencies
router.get('/currencies', async (req, res) => {
  try {
    const currencies = await currencyService.getSupportedCurrencies();
    res.json({ currencies });
  } catch (error) {
    console.error('Get currencies error:', error);
    res.status(500).json({ error: 'Failed to fetch currencies' });
  }
});

// Get exchange rates
router.get('/currencies/rates/:base?', async (req, res) => {
  try {
    const { base = 'USD' } = req.params;
    const rates = await currencyService.getExchangeRates(base);
    res.json({ rates });
  } catch (error) {
    console.error('Get exchange rates error:', error);
    res.status(500).json({ error: 'Failed to fetch exchange rates' });
  }
});

// Convert currency
router.post('/currencies/convert', async (req, res) => {
  try {
    const { amount, from_currency, to_currency } = req.body;
    
    if (!amount || !from_currency || !to_currency) {
      return res.status(400).json({ 
        error: 'Amount, from_currency, and to_currency are required' 
      });
    }
    
    const convertedAmount = await currencyService.convertCurrency(
      parseFloat(amount), 
      from_currency, 
      to_currency
    );
    
    res.json({
      original_amount: parseFloat(amount),
      from_currency,
      to_currency,
      converted_amount: convertedAmount,
      conversion_time: new Date().toISOString()
    });
  } catch (error) {
    console.error('Currency conversion error:', error);
    res.status(500).json({ error: 'Currency conversion failed' });
  }
});

// Get timezones
router.get('/timezones', (req, res) => {
  try {
    const timezones = [
      { code: 'UTC', name: 'Coordinated Universal Time', offset: '+00:00' },
      { code: 'EST', name: 'Eastern Standard Time', offset: '-05:00' },
      { code: 'CST', name: 'Central Standard Time', offset: '-06:00' },
      { code: 'MST', name: 'Mountain Standard Time', offset: '-07:00' },
      { code: 'PST', name: 'Pacific Standard Time', offset: '-08:00' },
      { code: 'GMT', name: 'Greenwich Mean Time', offset: '+00:00' },
      { code: 'CET', name: 'Central European Time', offset: '+01:00' },
      { code: 'EET', name: 'Eastern European Time', offset: '+02:00' },
      { code: 'JST', name: 'Japan Standard Time', offset: '+09:00' },
      { code: 'AEST', name: 'Australian Eastern Standard Time', offset: '+10:00' },
      { code: 'IST', name: 'India Standard Time', offset: '+05:30' },
      { code: 'CST_CHINA', name: 'China Standard Time', offset: '+08:00' }
    ];
    
    res.json({ timezones });
  } catch (error) {
    console.error('Get timezones error:', error);
    res.status(500).json({ error: 'Failed to fetch timezones' });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get application constants
router.get('/constants', (req, res) => {
  try {
    const constants = require('../utils/constants');
    
    // Only expose safe constants to frontend
    const safeConstants = {
      USER_ROLES: constants.USER_ROLES,
      EXPENSE_STATUSES: constants.EXPENSE_STATUSES,
      APPROVAL_STATUSES: constants.APPROVAL_STATUSES,
      NOTIFICATION_TYPES: constants.NOTIFICATION_TYPES,
      APPROVER_TYPES: constants.APPROVER_TYPES,
      DEFAULT_EXPENSE_CATEGORIES: constants.DEFAULT_EXPENSE_CATEGORIES,
      FILE_LIMITS: constants.FILE_LIMITS,
      PAGINATION: constants.PAGINATION,
      COMMON_CURRENCIES: constants.COMMON_CURRENCIES
    };
    
    res.json({ constants: safeConstants });
  } catch (error) {
    console.error('Get constants error:', error);
    res.status(500).json({ error: 'Failed to fetch constants' });
  }
});

module.exports = router;