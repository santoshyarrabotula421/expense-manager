class CountryService {
  constructor() {
    this.countries = [
      { code: 'AF', name: 'Afghanistan', currency: 'AFN' },
      { code: 'AL', name: 'Albania', currency: 'ALL' },
      { code: 'DZ', name: 'Algeria', currency: 'DZD' },
      { code: 'AS', name: 'American Samoa', currency: 'USD' },
      { code: 'AD', name: 'Andorra', currency: 'EUR' },
      { code: 'AO', name: 'Angola', currency: 'AOA' },
      { code: 'AI', name: 'Anguilla', currency: 'XCD' },
      { code: 'AQ', name: 'Antarctica', currency: 'USD' },
      { code: 'AG', name: 'Antigua and Barbuda', currency: 'XCD' },
      { code: 'AR', name: 'Argentina', currency: 'ARS' },
      { code: 'AM', name: 'Armenia', currency: 'AMD' },
      { code: 'AW', name: 'Aruba', currency: 'AWG' },
      { code: 'AU', name: 'Australia', currency: 'AUD' },
      { code: 'AT', name: 'Austria', currency: 'EUR' },
      { code: 'AZ', name: 'Azerbaijan', currency: 'AZN' },
      { code: 'BS', name: 'Bahamas', currency: 'BSD' },
      { code: 'BH', name: 'Bahrain', currency: 'BHD' },
      { code: 'BD', name: 'Bangladesh', currency: 'BDT' },
      { code: 'BB', name: 'Barbados', currency: 'BBD' },
      { code: 'BY', name: 'Belarus', currency: 'BYN' },
      { code: 'BE', name: 'Belgium', currency: 'EUR' },
      { code: 'BZ', name: 'Belize', currency: 'BZD' },
      { code: 'BJ', name: 'Benin', currency: 'XOF' },
      { code: 'BM', name: 'Bermuda', currency: 'BMD' },
      { code: 'BT', name: 'Bhutan', currency: 'BTN' },
      { code: 'BO', name: 'Bolivia', currency: 'BOB' },
      { code: 'BA', name: 'Bosnia and Herzegovina', currency: 'BAM' },
      { code: 'BW', name: 'Botswana', currency: 'BWP' },
      { code: 'BR', name: 'Brazil', currency: 'BRL' },
      { code: 'BN', name: 'Brunei', currency: 'BND' },
      { code: 'BG', name: 'Bulgaria', currency: 'BGN' },
      { code: 'BF', name: 'Burkina Faso', currency: 'XOF' },
      { code: 'BI', name: 'Burundi', currency: 'BIF' },
      { code: 'CV', name: 'Cabo Verde', currency: 'CVE' },
      { code: 'KH', name: 'Cambodia', currency: 'KHR' },
      { code: 'CM', name: 'Cameroon', currency: 'XAF' },
      { code: 'CA', name: 'Canada', currency: 'CAD' },
      { code: 'KY', name: 'Cayman Islands', currency: 'KYD' },
      { code: 'CF', name: 'Central African Republic', currency: 'XAF' },
      { code: 'TD', name: 'Chad', currency: 'XAF' },
      { code: 'CL', name: 'Chile', currency: 'CLP' },
      { code: 'CN', name: 'China', currency: 'CNY' },
      { code: 'CO', name: 'Colombia', currency: 'COP' },
      { code: 'KM', name: 'Comoros', currency: 'KMF' },
      { code: 'CG', name: 'Congo', currency: 'XAF' },
      { code: 'CD', name: 'Congo (Democratic Republic)', currency: 'CDF' },
      { code: 'CK', name: 'Cook Islands', currency: 'NZD' },
      { code: 'CR', name: 'Costa Rica', currency: 'CRC' },
      { code: 'CI', name: 'Côte d\'Ivoire', currency: 'XOF' },
      { code: 'HR', name: 'Croatia', currency: 'EUR' },
      { code: 'CU', name: 'Cuba', currency: 'CUP' },
      { code: 'CW', name: 'Curaçao', currency: 'ANG' },
      { code: 'CY', name: 'Cyprus', currency: 'EUR' },
      { code: 'CZ', name: 'Czech Republic', currency: 'CZK' },
      { code: 'DK', name: 'Denmark', currency: 'DKK' },
      { code: 'DJ', name: 'Djibouti', currency: 'DJF' },
      { code: 'DM', name: 'Dominica', currency: 'XCD' },
      { code: 'DO', name: 'Dominican Republic', currency: 'DOP' },
      { code: 'EC', name: 'Ecuador', currency: 'USD' },
      { code: 'EG', name: 'Egypt', currency: 'EGP' },
      { code: 'SV', name: 'El Salvador', currency: 'USD' },
      { code: 'GQ', name: 'Equatorial Guinea', currency: 'XAF' },
      { code: 'ER', name: 'Eritrea', currency: 'ERN' },
      { code: 'EE', name: 'Estonia', currency: 'EUR' },
      { code: 'SZ', name: 'Eswatini', currency: 'SZL' },
      { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
      { code: 'FK', name: 'Falkland Islands', currency: 'FKP' },
      { code: 'FO', name: 'Faroe Islands', currency: 'DKK' },
      { code: 'FJ', name: 'Fiji', currency: 'FJD' },
      { code: 'FI', name: 'Finland', currency: 'EUR' },
      { code: 'FR', name: 'France', currency: 'EUR' },
      { code: 'GF', name: 'French Guiana', currency: 'EUR' },
      { code: 'PF', name: 'French Polynesia', currency: 'XPF' },
      { code: 'GA', name: 'Gabon', currency: 'XAF' },
      { code: 'GM', name: 'Gambia', currency: 'GMD' },
      { code: 'GE', name: 'Georgia', currency: 'GEL' },
      { code: 'DE', name: 'Germany', currency: 'EUR' },
      { code: 'GH', name: 'Ghana', currency: 'GHS' },
      { code: 'GI', name: 'Gibraltar', currency: 'GIP' },
      { code: 'GR', name: 'Greece', currency: 'EUR' },
      { code: 'GL', name: 'Greenland', currency: 'DKK' },
      { code: 'GD', name: 'Grenada', currency: 'XCD' },
      { code: 'GP', name: 'Guadeloupe', currency: 'EUR' },
      { code: 'GU', name: 'Guam', currency: 'USD' },
      { code: 'GT', name: 'Guatemala', currency: 'GTQ' },
      { code: 'GG', name: 'Guernsey', currency: 'GBP' },
      { code: 'GN', name: 'Guinea', currency: 'GNF' },
      { code: 'GW', name: 'Guinea-Bissau', currency: 'XOF' },
      { code: 'GY', name: 'Guyana', currency: 'GYD' },
      { code: 'HT', name: 'Haiti', currency: 'HTG' },
      { code: 'HN', name: 'Honduras', currency: 'HNL' },
      { code: 'HK', name: 'Hong Kong', currency: 'HKD' },
      { code: 'HU', name: 'Hungary', currency: 'HUF' },
      { code: 'IS', name: 'Iceland', currency: 'ISK' },
      { code: 'IN', name: 'India', currency: 'INR' },
      { code: 'ID', name: 'Indonesia', currency: 'IDR' },
      { code: 'IR', name: 'Iran', currency: 'IRR' },
      { code: 'IQ', name: 'Iraq', currency: 'IQD' },
      { code: 'IE', name: 'Ireland', currency: 'EUR' },
      { code: 'IM', name: 'Isle of Man', currency: 'GBP' },
      { code: 'IL', name: 'Israel', currency: 'ILS' },
      { code: 'IT', name: 'Italy', currency: 'EUR' },
      { code: 'JM', name: 'Jamaica', currency: 'JMD' },
      { code: 'JP', name: 'Japan', currency: 'JPY' },
      { code: 'JE', name: 'Jersey', currency: 'GBP' },
      { code: 'JO', name: 'Jordan', currency: 'JOD' },
      { code: 'KZ', name: 'Kazakhstan', currency: 'KZT' },
      { code: 'KE', name: 'Kenya', currency: 'KES' },
      { code: 'KI', name: 'Kiribati', currency: 'AUD' },
      { code: 'KP', name: 'Korea (North)', currency: 'KPW' },
      { code: 'KR', name: 'Korea (South)', currency: 'KRW' },
      { code: 'KW', name: 'Kuwait', currency: 'KWD' },
      { code: 'KG', name: 'Kyrgyzstan', currency: 'KGS' },
      { code: 'LA', name: 'Laos', currency: 'LAK' },
      { code: 'LV', name: 'Latvia', currency: 'EUR' },
      { code: 'LB', name: 'Lebanon', currency: 'LBP' },
      { code: 'LS', name: 'Lesotho', currency: 'LSL' },
      { code: 'LR', name: 'Liberia', currency: 'LRD' },
      { code: 'LY', name: 'Libya', currency: 'LYD' },
      { code: 'LI', name: 'Liechtenstein', currency: 'CHF' },
      { code: 'LT', name: 'Lithuania', currency: 'EUR' },
      { code: 'LU', name: 'Luxembourg', currency: 'EUR' },
      { code: 'MO', name: 'Macao', currency: 'MOP' },
      { code: 'MK', name: 'Macedonia', currency: 'MKD' },
      { code: 'MG', name: 'Madagascar', currency: 'MGA' },
      { code: 'MW', name: 'Malawi', currency: 'MWK' },
      { code: 'MY', name: 'Malaysia', currency: 'MYR' },
      { code: 'MV', name: 'Maldives', currency: 'MVR' },
      { code: 'ML', name: 'Mali', currency: 'XOF' },
      { code: 'MT', name: 'Malta', currency: 'EUR' },
      { code: 'MH', name: 'Marshall Islands', currency: 'USD' },
      { code: 'MQ', name: 'Martinique', currency: 'EUR' },
      { code: 'MR', name: 'Mauritania', currency: 'MRU' },
      { code: 'MU', name: 'Mauritius', currency: 'MUR' },
      { code: 'YT', name: 'Mayotte', currency: 'EUR' },
      { code: 'MX', name: 'Mexico', currency: 'MXN' },
      { code: 'FM', name: 'Micronesia', currency: 'USD' },
      { code: 'MD', name: 'Moldova', currency: 'MDL' },
      { code: 'MC', name: 'Monaco', currency: 'EUR' },
      { code: 'MN', name: 'Mongolia', currency: 'MNT' },
      { code: 'ME', name: 'Montenegro', currency: 'EUR' },
      { code: 'MS', name: 'Montserrat', currency: 'XCD' },
      { code: 'MA', name: 'Morocco', currency: 'MAD' },
      { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
      { code: 'MM', name: 'Myanmar', currency: 'MMK' },
      { code: 'NA', name: 'Namibia', currency: 'NAD' },
      { code: 'NR', name: 'Nauru', currency: 'AUD' },
      { code: 'NP', name: 'Nepal', currency: 'NPR' },
      { code: 'NL', name: 'Netherlands', currency: 'EUR' },
      { code: 'NC', name: 'New Caledonia', currency: 'XPF' },
      { code: 'NZ', name: 'New Zealand', currency: 'NZD' },
      { code: 'NI', name: 'Nicaragua', currency: 'NIO' },
      { code: 'NE', name: 'Niger', currency: 'XOF' },
      { code: 'NG', name: 'Nigeria', currency: 'NGN' },
      { code: 'NU', name: 'Niue', currency: 'NZD' },
      { code: 'NF', name: 'Norfolk Island', currency: 'AUD' },
      { code: 'MP', name: 'Northern Mariana Islands', currency: 'USD' },
      { code: 'NO', name: 'Norway', currency: 'NOK' },
      { code: 'OM', name: 'Oman', currency: 'OMR' },
      { code: 'PK', name: 'Pakistan', currency: 'PKR' },
      { code: 'PW', name: 'Palau', currency: 'USD' },
      { code: 'PS', name: 'Palestine', currency: 'ILS' },
      { code: 'PA', name: 'Panama', currency: 'PAB' },
      { code: 'PG', name: 'Papua New Guinea', currency: 'PGK' },
      { code: 'PY', name: 'Paraguay', currency: 'PYG' },
      { code: 'PE', name: 'Peru', currency: 'PEN' },
      { code: 'PH', name: 'Philippines', currency: 'PHP' },
      { code: 'PN', name: 'Pitcairn', currency: 'NZD' },
      { code: 'PL', name: 'Poland', currency: 'PLN' },
      { code: 'PT', name: 'Portugal', currency: 'EUR' },
      { code: 'PR', name: 'Puerto Rico', currency: 'USD' },
      { code: 'QA', name: 'Qatar', currency: 'QAR' },
      { code: 'RE', name: 'Réunion', currency: 'EUR' },
      { code: 'RO', name: 'Romania', currency: 'RON' },
      { code: 'RU', name: 'Russia', currency: 'RUB' },
      { code: 'RW', name: 'Rwanda', currency: 'RWF' },
      { code: 'BL', name: 'Saint Barthélemy', currency: 'EUR' },
      { code: 'SH', name: 'Saint Helena', currency: 'SHP' },
      { code: 'KN', name: 'Saint Kitts and Nevis', currency: 'XCD' },
      { code: 'LC', name: 'Saint Lucia', currency: 'XCD' },
      { code: 'MF', name: 'Saint Martin', currency: 'EUR' },
      { code: 'PM', name: 'Saint Pierre and Miquelon', currency: 'EUR' },
      { code: 'VC', name: 'Saint Vincent and the Grenadines', currency: 'XCD' },
      { code: 'WS', name: 'Samoa', currency: 'WST' },
      { code: 'SM', name: 'San Marino', currency: 'EUR' },
      { code: 'ST', name: 'Sao Tome and Principe', currency: 'STN' },
      { code: 'SA', name: 'Saudi Arabia', currency: 'SAR' },
      { code: 'SN', name: 'Senegal', currency: 'XOF' },
      { code: 'RS', name: 'Serbia', currency: 'RSD' },
      { code: 'SC', name: 'Seychelles', currency: 'SCR' },
      { code: 'SL', name: 'Sierra Leone', currency: 'SLL' },
      { code: 'SG', name: 'Singapore', currency: 'SGD' },
      { code: 'SX', name: 'Sint Maarten', currency: 'ANG' },
      { code: 'SK', name: 'Slovakia', currency: 'EUR' },
      { code: 'SI', name: 'Slovenia', currency: 'EUR' },
      { code: 'SB', name: 'Solomon Islands', currency: 'SBD' },
      { code: 'SO', name: 'Somalia', currency: 'SOS' },
      { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
      { code: 'GS', name: 'South Georgia and South Sandwich Islands', currency: 'GBP' },
      { code: 'SS', name: 'South Sudan', currency: 'SSP' },
      { code: 'ES', name: 'Spain', currency: 'EUR' },
      { code: 'LK', name: 'Sri Lanka', currency: 'LKR' },
      { code: 'SD', name: 'Sudan', currency: 'SDG' },
      { code: 'SR', name: 'Suriname', currency: 'SRD' },
      { code: 'SJ', name: 'Svalbard and Jan Mayen', currency: 'NOK' },
      { code: 'SE', name: 'Sweden', currency: 'SEK' },
      { code: 'CH', name: 'Switzerland', currency: 'CHF' },
      { code: 'SY', name: 'Syria', currency: 'SYP' },
      { code: 'TW', name: 'Taiwan', currency: 'TWD' },
      { code: 'TJ', name: 'Tajikistan', currency: 'TJS' },
      { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
      { code: 'TH', name: 'Thailand', currency: 'THB' },
      { code: 'TL', name: 'Timor-Leste', currency: 'USD' },
      { code: 'TG', name: 'Togo', currency: 'XOF' },
      { code: 'TK', name: 'Tokelau', currency: 'NZD' },
      { code: 'TO', name: 'Tonga', currency: 'TOP' },
      { code: 'TT', name: 'Trinidad and Tobago', currency: 'TTD' },
      { code: 'TN', name: 'Tunisia', currency: 'TND' },
      { code: 'TR', name: 'Turkey', currency: 'TRY' },
      { code: 'TM', name: 'Turkmenistan', currency: 'TMT' },
      { code: 'TC', name: 'Turks and Caicos Islands', currency: 'USD' },
      { code: 'TV', name: 'Tuvalu', currency: 'AUD' },
      { code: 'UG', name: 'Uganda', currency: 'UGX' },
      { code: 'UA', name: 'Ukraine', currency: 'UAH' },
      { code: 'AE', name: 'United Arab Emirates', currency: 'AED' },
      { code: 'GB', name: 'United Kingdom', currency: 'GBP' },
      { code: 'US', name: 'United States', currency: 'USD' },
      { code: 'UM', name: 'United States Minor Outlying Islands', currency: 'USD' },
      { code: 'UY', name: 'Uruguay', currency: 'UYU' },
      { code: 'UZ', name: 'Uzbekistan', currency: 'UZS' },
      { code: 'VU', name: 'Vanuatu', currency: 'VUV' },
      { code: 'VA', name: 'Vatican City', currency: 'EUR' },
      { code: 'VE', name: 'Venezuela', currency: 'VES' },
      { code: 'VN', name: 'Vietnam', currency: 'VND' },
      { code: 'VG', name: 'Virgin Islands (British)', currency: 'USD' },
      { code: 'VI', name: 'Virgin Islands (US)', currency: 'USD' },
      { code: 'WF', name: 'Wallis and Futuna', currency: 'XPF' },
      { code: 'EH', name: 'Western Sahara', currency: 'MAD' },
      { code: 'YE', name: 'Yemen', currency: 'YER' },
      { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
      { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL' }
    ];
  }

  // Get all countries
  getAllCountries() {
    return this.countries.map(country => ({
      code: country.code,
      name: country.name,
      currency: country.currency
    }));
  }

  // Get countries sorted by name
  getCountriesSorted() {
    return this.countries
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency
      }));
  }

  // Get country by code
  getCountryByCode(code) {
    return this.countries.find(country => 
      country.code.toLowerCase() === code.toLowerCase()
    );
  }

  // Get country by name
  getCountryByName(name) {
    return this.countries.find(country => 
      country.name.toLowerCase() === name.toLowerCase()
    );
  }

  // Search countries by name (partial match)
  searchCountries(query) {
    if (!query || query.length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase();
    return this.countries
      .filter(country => 
        country.name.toLowerCase().includes(searchTerm) ||
        country.code.toLowerCase().includes(searchTerm)
      )
      .sort((a, b) => {
        // Prioritize exact matches at the beginning
        const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
        const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return a.name.localeCompare(b.name);
      })
      .slice(0, 20) // Limit results
      .map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency
      }));
  }

  // Get popular/common countries (for quick selection)
  getPopularCountries() {
    const popularCodes = [
      'US', 'GB', 'CA', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE',
      'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IE', 'PT', 'GR', 'PL',
      'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK', 'LT', 'LV', 'EE',
      'JP', 'KR', 'CN', 'IN', 'SG', 'HK', 'MY', 'TH', 'ID', 'PH',
      'VN', 'BD', 'PK', 'LK', 'NP', 'BR', 'MX', 'AR', 'CL', 'CO',
      'PE', 'VE', 'UY', 'PY', 'BO', 'EC', 'ZA', 'NG', 'KE', 'EG',
      'MA', 'TN', 'GH', 'ET', 'UG', 'TZ', 'ZM', 'ZW', 'MZ', 'MG'
    ];

    return popularCodes
      .map(code => this.getCountryByCode(code))
      .filter(country => country)
      .map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency
      }));
  }

  // Get countries by region (simplified)
  getCountriesByRegion(region) {
    const regions = {
      'europe': ['GB', 'IE', 'FR', 'DE', 'IT', 'ES', 'PT', 'NL', 'BE', 'LU', 'CH', 'AT', 'SE', 'NO', 'DK', 'FI', 'IS', 'GR', 'PL', 'CZ', 'SK', 'HU', 'SI', 'HR', 'BA', 'RS', 'ME', 'MK', 'AL', 'BG', 'RO', 'MD', 'UA', 'BY', 'LT', 'LV', 'EE', 'RU'],
      'north_america': ['US', 'CA', 'MX', 'GT', 'BZ', 'SV', 'HN', 'NI', 'CR', 'PA'],
      'south_america': ['BR', 'AR', 'CL', 'PE', 'CO', 'VE', 'EC', 'BO', 'PY', 'UY', 'GY', 'SR', 'GF'],
      'asia': ['CN', 'JP', 'KR', 'IN', 'ID', 'TH', 'VN', 'MY', 'SG', 'PH', 'BD', 'PK', 'LK', 'MM', 'KH', 'LA', 'NP', 'BT', 'MN', 'KZ', 'UZ', 'TM', 'KG', 'TJ', 'AF', 'IR', 'IQ', 'SY', 'JO', 'LB', 'IL', 'PS', 'SA', 'AE', 'OM', 'YE', 'KW', 'QA', 'BH'],
      'africa': ['ZA', 'NG', 'EG', 'KE', 'ET', 'UG', 'TZ', 'GH', 'MZ', 'MG', 'CM', 'CI', 'NE', 'BF', 'ML', 'MW', 'ZM', 'ZW', 'BW', 'NA', 'SZ', 'LS', 'MA', 'DZ', 'TN', 'LY', 'SD', 'SS', 'ER', 'DJ', 'SO', 'CF', 'TD', 'GA', 'GQ', 'ST', 'CV', 'GM', 'GW', 'SL', 'LR', 'SN', 'MR', 'BI', 'RW', 'KM', 'SC', 'MU'],
      'oceania': ['AU', 'NZ', 'FJ', 'PG', 'SB', 'NC', 'PF', 'VU', 'WS', 'KI', 'TO', 'NR', 'PW', 'FM', 'MH', 'TV', 'CK', 'NU', 'TK']
    };

    const countryCodes = regions[region.toLowerCase()] || [];
    return countryCodes
      .map(code => this.getCountryByCode(code))
      .filter(country => country)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(country => ({
        code: country.code,
        name: country.name,
        currency: country.currency
      }));
  }

  // Get currency for a country
  getCurrencyByCountry(countryCode) {
    const country = this.getCountryByCode(countryCode);
    return country ? country.currency : null;
  }

  // Validate country code
  isValidCountryCode(code) {
    return this.countries.some(country => 
      country.code.toLowerCase() === code.toLowerCase()
    );
  }

  // Get country statistics
  getStatistics() {
    const currencyCount = {};
    this.countries.forEach(country => {
      currencyCount[country.currency] = (currencyCount[country.currency] || 0) + 1;
    });

    return {
      total_countries: this.countries.length,
      unique_currencies: Object.keys(currencyCount).length,
      most_common_currencies: Object.entries(currencyCount)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([currency, count]) => ({ currency, count }))
    };
  }
}

module.exports = new CountryService();