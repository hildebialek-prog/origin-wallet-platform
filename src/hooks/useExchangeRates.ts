import { useState, useEffect, useCallback } from 'react';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: string;
}

export interface CurrencyPair {
  from: string;
  to: string;
  amount: number;
  fee: number;
}

// Service fee percentage (0.4%)
const SERVICE_FEE_PERCENT = 0.004;

// Cache duration 24 hours in milliseconds
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Fallback rates in case API fails
const FALLBACK_RATES: ExchangeRate[] = [
  { from: 'USD', to: 'EUR', rate: 0.92, lastUpdated: new Date().toISOString() },
  { from: 'GBP', to: 'VND', rate: 31500, lastUpdated: new Date().toISOString() },
  { from: 'EUR', to: 'USD', rate: 1.087, lastUpdated: new Date().toISOString() },
  { from: 'USD', to: 'JPY', rate: 149.5, lastUpdated: new Date().toISOString() },
  { from: 'AUD', to: 'GBP', rate: 0.516, lastUpdated: new Date().toISOString() },
  { from: 'USD', to: 'VND', rate: 24500, lastUpdated: new Date().toISOString() },
  { from: 'EUR', to: 'VND', rate: 26800, lastUpdated: new Date().toISOString() },
  { from: 'GBP', to: 'EUR', rate: 1.17, lastUpdated: new Date().toISOString() },
];

// Get cached rates from localStorage
const getCachedRates = (): ExchangeRate[] | null => {
  try {
    const cached = localStorage.getItem('exchange_rates_cache');
    if (!cached) return null;
    
    const { rates, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (24 hours)
    if (now - timestamp < CACHE_DURATION) {
      return rates;
    }
    
    return null;
  } catch {
    return null;
  }
};

// Save rates to localStorage
const saveRatesToCache = (rates: ExchangeRate[]) => {
  try {
    localStorage.setItem('exchange_rates_cache', JSON.stringify({
      rates,
      timestamp: Date.now()
    }));
  } catch {
    console.error('Failed to save rates to cache');
  }
};

// Fetch rates from free API (exchangerate.host or frankfurter.app)
const fetchRatesFromAPI = async (): Promise<ExchangeRate[]> => {
  try {
    // Try Frankfurter API (free, no API key needed)
    const responses = await Promise.allSettled([
      fetch('https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,VND'),
      fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,VND'),
      fetch('https://api.frankfurter.app/latest?from=GBP&to=USD,EUR,VND'),
      fetch('https://api.frankfurter.app/latest?from=AUD&to=GBP'),
    ]);

    const rates: ExchangeRate[] = [];
    const now = new Date().toISOString();

    // Process USD rates
    if (responses[0].status === 'fulfilled') {
      const data = await responses[0].value.json();
      if (data.rates) {
        if (data.rates.EUR) rates.push({ from: 'USD', to: 'EUR', rate: data.rates.EUR, lastUpdated: now });
        if (data.rates.GBP) rates.push({ from: 'USD', to: 'GBP', rate: data.rates.GBP, lastUpdated: now });
        if (data.rates.JPY) rates.push({ from: 'USD', to: 'JPY', rate: data.rates.JPY, lastUpdated: now });
        if (data.rates.VND) rates.push({ from: 'USD', to: 'VND', rate: data.rates.VND, lastUpdated: now });
      }
    }

    // Process EUR rates
    if (responses[1].status === 'fulfilled') {
      const data = await responses[1].value.json();
      if (data.rates) {
        if (data.rates.USD) rates.push({ from: 'EUR', to: 'USD', rate: data.rates.USD, lastUpdated: now });
        if (data.rates.GBP) rates.push({ from: 'EUR', to: 'GBP', rate: data.rates.GBP, lastUpdated: now });
        if (data.rates.VND) rates.push({ from: 'EUR', to: 'VND', rate: data.rates.VND, lastUpdated: now });
      }
    }

    // Process GBP rates
    if (responses[2].status === 'fulfilled') {
      const data = await responses[2].value.json();
      if (data.rates) {
        if (data.rates.USD) rates.push({ from: 'GBP', to: 'USD', rate: data.rates.USD, lastUpdated: now });
        if (data.rates.EUR) rates.push({ from: 'GBP', to: 'EUR', rate: data.rates.EUR, lastUpdated: now });
        if (data.rates.VND) rates.push({ from: 'GBP', to: 'VND', rate: data.rates.VND, lastUpdated: now });
      }
    }

    // Process AUD rates
    if (responses[3].status === 'fulfilled') {
      const data = await responses[3].value.json();
      if (data.rates) {
        if (data.rates.GBP) rates.push({ from: 'AUD', to: 'GBP', rate: data.rates.GBP, lastUpdated: now });
      }
    }

    return rates.length > 0 ? rates : FALLBACK_RATES;
  } catch (error) {
    console.error('Failed to fetch rates from API:', error);
    return FALLBACK_RATES;
  }
};

// Calculate transfer result
export const calculateTransfer = (amount: number, rate: number, feePercent: number = SERVICE_FEE_PERCENT): { fee: number; gets: number } => {
  const fee = amount * feePercent;
  const gets = (amount - fee) * rate;
  return { fee, gets };
};

// Format number with thousand separators
export const formatCurrency = (value: number, currency: string): string => {
  if (currency === 'VND' || currency === 'JPY') {
    return new Intl.NumberFormat('en-US').format(Math.round(value));
  }
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
};

// Hook to get exchange rates
export const useExchangeRates = () => {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check cache first
    const cachedRates = getCachedRates();
    if (cachedRates) {
      setRates(cachedRates);
      setLastUpdated(cachedRates[0]?.lastUpdated || null);
      setLoading(false);
      return;
    }

    // Fetch fresh rates
    const freshRates = await fetchRatesFromAPI();
    setRates(freshRates);
    setLastUpdated(freshRates[0]?.lastUpdated || null);
    saveRatesToCache(freshRates);
    setLoading(false);
  }, []);

  // Force refresh rates (admin or manual refresh)
  const refreshRates = useCallback(async () => {
    localStorage.removeItem('exchange_rates_cache');
    await fetchRates();
  }, [fetchRates]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  // Calculate corridor data
  const getCorridorData = useCallback((from: string, to: string, amount: number): { fee: string; rate: string; gets: string } | null => {
    const rateObj = rates.find(r => r.from === from && r.to === to);
    if (!rateObj) return null;

    const { fee, gets } = calculateTransfer(amount, rateObj.rate);
    
    return {
      fee: formatCurrency(fee, from),
      rate: formatCurrency(rateObj.rate, to),
      gets: formatCurrency(gets, to)
    };
  }, [rates]);

  return {
    rates,
    loading,
    lastUpdated,
    error,
    refreshRates,
    getCorridorData
  };
};

export default useExchangeRates;
