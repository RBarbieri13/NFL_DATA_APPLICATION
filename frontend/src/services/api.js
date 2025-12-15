/**
 * Optimized API service with caching and error handling
 */
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:10000/api';
const CACHE_TTL = parseInt(process.env.REACT_APP_CACHE_TTL) || 300000; // 5 minutes

// Simple in-memory cache
class ApiCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  get(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp || Date.now() - timestamp > CACHE_TTL) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  set(key, value) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }

  stats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

const cache = new ApiCache();

// Create axios instance with optimized defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
apiClient.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.status, error.message);
    
    // Handle common errors
    if (error.response?.status === 404) {
      throw new Error('Data not found');
    } else if (error.response?.status >= 500) {
      throw new Error('Server error. Please try again later.');
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. Please check your connection.');
    }
    
    throw error;
  }
);

// Generate cache key from URL and params
const getCacheKey = (url, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${url}?${new URLSearchParams(sortedParams).toString()}`;
};

// Generic API request with caching
const apiRequest = async (url, params = {}, options = {}) => {
  const { useCache = true, ...requestOptions } = options;
  const cacheKey = getCacheKey(url, params);
  
  // Check cache first
  if (useCache) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Cache hit: ${cacheKey}`);
      return cachedData;
    }
  }
  
  try {
    const response = await apiClient.get(url, {
      params,
      ...requestOptions
    });
    
    const data = response.data;
    
    // Cache successful responses
    if (useCache && response.status === 200) {
      cache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error(`API Error for ${url}:`, error.message);
    throw error;
  }
};

// API service methods
export const apiService = {
  // Player data methods
  async getWeeklyStats(filters = {}) {
    const params = {
      season: filters.season || 2024,
      week: filters.week,
      position: filters.position,
      team: filters.team,
      player_name: filters.player_name,
      page: filters.page || 1,
      page_size: filters.page_size || 100
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === 'all') {
        delete params[key];
      }
    });
    
    return apiRequest('/players/weekly-stats', params);
  },

  async getSeasonStats(filters = {}) {
    const params = {
      season: filters.season || 2024,
      position: filters.position,
      team: filters.team,
      player_name: filters.player_name,
      page: filters.page || 1,
      page_size: filters.page_size || 100
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === 'all') {
        delete params[key];
      }
    });
    
    return apiRequest('/players/season-stats', params);
  },

  async getTrendData(playerNames, season, weeks = null) {
    const params = {
      season,
      weeks: weeks ? weeks.join(',') : undefined
    };
    
    // Add player names as query parameters
    playerNames.forEach((name, index) => {
      params[`player_names[${index}]`] = name;
    });
    
    return apiRequest('/players/trend-data', params);
  },

  async getTopPerformers(filters = {}) {
    const params = {
      season: filters.season || 2024,
      position: filters.position,
      stat_type: filters.stat_type || 'fantasy_points',
      limit: filters.limit || 20,
      week: filters.week
    };
    
    // Remove undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === 'all') {
        delete params[key];
      }
    });
    
    return apiRequest('/players/top-performers', params);
  },

  async searchPlayers(query, season, limit = 20) {
    const params = {
      q: query,
      season,
      limit
    };
    
    return apiRequest('/players/search', params);
  },

  // Data management methods
  async getDataStatus() {
    return apiRequest('/data/status', {}, { useCache: false });
  },

  async refreshData(seasons = null, includeCurrentExtras = true) {
    const payload = {
      seasons,
      include_current_extras: includeCurrentExtras
    };
    
    const response = await apiClient.post('/data/refresh', payload);
    
    // Clear cache after refresh
    cache.clear();
    
    return response.data;
  },

  async loadSeasonData(season, includeExtras = true) {
    const response = await apiClient.post(`/data/load-season/${season}`, {
      include_extras: includeExtras
    });
    
    // Clear cache after load
    cache.clear();
    
    return response.data;
  },

  async clearCache() {
    const response = await apiClient.delete('/data/cache');
    
    // Also clear local cache
    cache.clear();
    
    return response.data;
  },

  async getAvailableSeasons() {
    return apiRequest('/data/seasons');
  },

  // Cache management
  getCacheStats() {
    return cache.stats();
  },

  clearLocalCache() {
    cache.clear();
  },

  // Health check
  async healthCheck() {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 });
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
};

// Utility functions for data processing
export const dataUtils = {
  // Calculate fantasy points
  calculateFantasyPoints(player, isPPR = true) {
    let points = 0;

    // Passing
    points += (player.passing_yards || 0) * 0.04;
    points += (player.passing_tds || 0) * 4;
    points += (player.interceptions || 0) * -1;

    // Rushing
    points += (player.rushing_yards || 0) * 0.1;
    points += (player.rushing_tds || 0) * 6;

    // Receiving
    points += (player.receiving_yards || 0) * 0.1;
    points += (player.receiving_tds || 0) * 6;
    points += (player.receptions || 0) * (isPPR ? 1 : 0.5);

    // Fumbles
    points += (player.fumbles_lost || 0) * -1;

    return Math.round(points * 10) / 10; // Round to 1 decimal
  },

  // Format currency
  formatSalary(salary) {
    if (!salary || salary <= 0) return '-';
    return `$${(salary / 1000).toFixed(1)}k`;
  },

  // Get performance color
  getPerformanceColor(value, type) {
    if (!value || value === 0) return 'text-gray-400';

    const thresholds = {
      fantasy_points: { excellent: 25, good: 15, average: 8 },
      snap_percentage: { excellent: 80, good: 60, average: 30 },
      passing_yards: { excellent: 300, good: 250, average: 150 },
      rushing_yards: { excellent: 120, good: 80, average: 40 },
      receiving_yards: { excellent: 120, good: 80, average: 40 },
      receptions: { excellent: 8, good: 6, average: 3 }
    };

    const threshold = thresholds[type];
    if (!threshold) return 'text-gray-700';

    if (value >= threshold.excellent) return 'text-green-600 font-bold';
    if (value >= threshold.good) return 'text-green-600 font-semibold';
    if (value >= threshold.average) return 'text-yellow-600';
    return 'text-red-500';
  },

  // Get position color
  getPositionColor(position) {
    const colors = {
      'QB': 'bg-purple-100 text-purple-800 border-purple-300',
      'RB': 'bg-green-100 text-green-800 border-green-300',
      'WR': 'bg-blue-100 text-blue-800 border-blue-300',
      'TE': 'bg-orange-100 text-orange-800 border-orange-300'
    };
    return colors[position] || 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

export default apiService;