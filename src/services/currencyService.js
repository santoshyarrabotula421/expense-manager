const axios = require('axios');

class CurrencyService {
  constructor() {
    this.apiKey = process.env.CURRENCY_API_KEY;
    this.baseUrl = process.env.CURRENCY_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    this.cache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
  }

  // Get exchange rates from cache or API
  async getExchangeRates(baseCurrency = 'USD') {
    const cacheKey = `rates_${baseCurrency}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/${baseCurrency}`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'expense-manager-app'
        }
      });

      const data = {
        base: response.data.base,
        rates: response.data.rates,
        timestamp: Date.now()
      };

      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error('Currency API error:', error.message);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log('Using expired currency cache due to API error');
        return cached.data;
      }

      // Fallback rates if no cache and API fails
      return this.getFallbackRates(baseCurrency);
    }
  }

  // Convert amount from one currency to another
  async convertCurrency(amount, fromCurrency, toCurrency) {
    try {
      if (fromCurrency === toCurrency) {
        return parseFloat(amount);
      }

      const rates = await this.getExchangeRates('USD');
      
      let convertedAmount;
      
      if (fromCurrency === 'USD') {
        // Direct conversion from USD
        convertedAmount = amount * (rates.rates[toCurrency] || 1);
      } else if (toCurrency === 'USD') {
        // Direct conversion to USD
        convertedAmount = amount / (rates.rates[fromCurrency] || 1);
      } else {
        // Convert through USD
        const usdAmount = amount / (rates.rates[fromCurrency] || 1);
        convertedAmount = usdAmount * (rates.rates[toCurrency] || 1);
      }

      return Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      console.error('Currency conversion error:', error);
      throw new Error('Currency conversion failed');
    }
  }

  // Convert amount to USD (for standardization)
  async convertToUSD(amount, fromCurrency) {
    return this.convertCurrency(amount, fromCurrency, 'USD');
  }

  // Get list of supported currencies
  async getSupportedCurrencies() {
    try {
      const rates = await this.getExchangeRates();
      const currencies = Object.keys(rates.rates);
      currencies.push(rates.base); // Add base currency
      
      return currencies.sort().map(code => ({
        code,
        name: this.getCurrencyName(code)
      }));
    } catch (error) {
      console.error('Error getting supported currencies:', error);
      return this.getFallbackCurrencies();
    }
  }

  // Get currency name from code
  getCurrencyName(code) {
    const currencyNames = {
      'USD': 'US Dollar',
      'EUR': 'Euro',
      'GBP': 'British Pound',
      'JPY': 'Japanese Yen',
      'AUD': 'Australian Dollar',
      'CAD': 'Canadian Dollar',
      'CHF': 'Swiss Franc',
      'CNY': 'Chinese Yuan',
      'SEK': 'Swedish Krona',
      'NZD': 'New Zealand Dollar',
      'MXN': 'Mexican Peso',
      'SGD': 'Singapore Dollar',
      'HKD': 'Hong Kong Dollar',
      'NOK': 'Norwegian Krone',
      'ZAR': 'South African Rand',
      'TRY': 'Turkish Lira',
      'BRL': 'Brazilian Real',
      'INR': 'Indian Rupee',
      'RUB': 'Russian Ruble',
      'KRW': 'South Korean Won',
      'PLN': 'Polish Zloty',
      'THB': 'Thai Baht',
      'IDR': 'Indonesian Rupiah',
      'HUF': 'Hungarian Forint',
      'CZK': 'Czech Koruna',
      'ILS': 'Israeli Shekel',
      'CLP': 'Chilean Peso',
      'PHP': 'Philippine Peso',
      'AED': 'UAE Dirham',
      'COP': 'Colombian Peso',
      'SAR': 'Saudi Riyal',
      'MYR': 'Malaysian Ringgit',
      'RON': 'Romanian Leu'
    };

    return currencyNames[code] || code;
  }

  // Fallback rates when API is unavailable
  getFallbackRates(baseCurrency = 'USD') {
    const fallbackRates = {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.73,
      'JPY': 110,
      'AUD': 1.35,
      'CAD': 1.25,
      'CHF': 0.92,
      'CNY': 6.45,
      'INR': 74.5,
      'BRL': 5.2
    };

    return {
      base: baseCurrency,
      rates: fallbackRates,
      timestamp: Date.now(),
      fallback: true
    };
  }

  // Fallback currencies when API is unavailable
  getFallbackCurrencies() {
    return [
      { code: 'USD', name: 'US Dollar' },
      { code: 'EUR', name: 'Euro' },
      { code: 'GBP', name: 'British Pound' },
      { code: 'JPY', name: 'Japanese Yen' },
      { code: 'AUD', name: 'Australian Dollar' },
      { code: 'CAD', name: 'Canadian Dollar' },
      { code: 'CHF', name: 'Swiss Franc' },
      { code: 'CNY', name: 'Chinese Yuan' },
      { code: 'INR', name: 'Indian Rupee' },
      { code: 'BRL', name: 'Brazilian Real' }
    ];
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache() {
    this.cache.clear();
  }

  // Get cache status
  getCacheStatus() {
    const entries = Array.from(this.cache.entries()).map(([key, value]) => ({
      key,
      age: Date.now() - value.timestamp,
      expired: Date.now() - value.timestamp > this.cacheExpiry
    }));

    return {
      size: this.cache.size,
      entries,
      expiryTime: this.cacheExpiry
    };
  }
}

module.exports = new CurrencyService();