const axios = require('axios');
const { getConnection } = require('../config/database');

class CurrencyService {
  constructor() {
    this.apiUrl = process.env.CURRENCY_API_URL || 'https://api.exchangerate-api.com/v4/latest';
    this.cacheTimeout = 3600000; // 1 hour in milliseconds
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    try {
      // If same currency, return 1
      if (fromCurrency === toCurrency) {
        return 1;
      }

      // Check cache first
      const cachedRate = await this.getCachedRate(fromCurrency, toCurrency);
      if (cachedRate) {
        return cachedRate;
      }

      // Fetch from API
      const response = await axios.get(`${this.apiUrl}/${fromCurrency}`, {
        timeout: 10000
      });

      if (response.data && response.data.rates && response.data.rates[toCurrency]) {
        const rate = response.data.rates[toCurrency];
        
        // Cache the rate
        await this.cacheRate(fromCurrency, toCurrency, rate);
        
        return rate;
      }

      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    } catch (error) {
      console.error('Currency conversion error:', error.message);
      
      // Fallback to cached rate even if expired
      const fallbackRate = await this.getCachedRate(fromCurrency, toCurrency, false);
      if (fallbackRate) {
        console.log('Using fallback cached rate');
        return fallbackRate;
      }

      // If no cache available, return 1 as last resort
      console.warn(`No exchange rate available for ${fromCurrency} to ${toCurrency}, using 1:1`);
      return 1;
    }
  }

  async getCachedRate(fromCurrency, toCurrency, checkTimeout = true) {
    try {
      const connection = getConnection();
      const query = `
        SELECT rate, updated_at 
        FROM currency_rates 
        WHERE base_currency = ? AND target_currency = ?
      `;
      
      const [rows] = await connection.execute(query, [fromCurrency, toCurrency]);
      
      if (rows.length > 0) {
        const { rate, updated_at } = rows[0];
        
        if (!checkTimeout) {
          return parseFloat(rate);
        }
        
        const now = new Date();
        const cacheAge = now - new Date(updated_at);
        
        if (cacheAge < this.cacheTimeout) {
          return parseFloat(rate);
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching cached rate:', error.message);
      return null;
    }
  }

  async cacheRate(fromCurrency, toCurrency, rate) {
    try {
      const connection = getConnection();
      const query = `
        INSERT INTO currency_rates (base_currency, target_currency, rate, updated_at)
        VALUES (?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE rate = VALUES(rate), updated_at = VALUES(updated_at)
      `;
      
      await connection.execute(query, [fromCurrency, toCurrency, rate]);
    } catch (error) {
      console.error('Error caching rate:', error.message);
    }
  }

  async convertAmount(amount, fromCurrency, toCurrency) {
    try {
      const rate = await this.getExchangeRate(fromCurrency, toCurrency);
      const convertedAmount = amount * rate;
      
      return {
        originalAmount: amount,
        originalCurrency: fromCurrency,
        convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
        targetCurrency: toCurrency,
        exchangeRate: rate,
        convertedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Amount conversion error:', error.message);
      throw error;
    }
  }

  async getSupportedCurrencies() {
    // Common currencies supported by most APIs
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'KRW', name: 'South Korean Won', symbol: '₩' },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
      { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
      { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
      { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
      { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
      { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
      { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
      { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
      { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$' },
      { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
      { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
      { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
      { code: 'THB', name: 'Thai Baht', symbol: '฿' }
    ];
  }

  async updateAllRates() {
    try {
      console.log('Starting currency rates update...');
      const currencies = await this.getSupportedCurrencies();
      const baseCurrency = 'USD';
      
      for (const currency of currencies) {
        if (currency.code !== baseCurrency) {
          try {
            await this.getExchangeRate(baseCurrency, currency.code);
            console.log(`Updated rate for ${baseCurrency} to ${currency.code}`);
          } catch (error) {
            console.error(`Failed to update rate for ${currency.code}:`, error.message);
          }
        }
      }
      
      console.log('Currency rates update completed');
    } catch (error) {
      console.error('Error updating currency rates:', error.message);
      throw error;
    }
  }
}

module.exports = new CurrencyService();