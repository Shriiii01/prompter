//  PRODUCTION CONFIGURATION
// Update this file with your Railway URL before deploying

const PRODUCTION_CONFIG = {
  //  PRODUCTION URL - Railway
  API_BASE_URL: 'https://prompter-production-76a3.up.railway.app',
  
  // Development URL (don't change this)
  DEV_API_BASE_URL: 'http://localhost:8000',
  
  // API endpoints (don't change these)
  endpoints: {
    enhance: '/api/stream-enhance',
    quickTest: '/api/v1/quick-test',
    health: '/api/v1/health',
    userStats: '/api/v1/user/stats',
    userCount: '/api/v1/user/count',
    incrementCount: '/api/v1/users/{email}/increment'
  }
};

// Environment detection with improved reliability
const isProduction = () => {
  try {
    // Smart detection: Unpacked extensions (development) don't have an update_url
    const isDevMode = !chrome.runtime.getManifest().update_url;
    if (isDevMode) return false;

    // Fallback: treat real HTTPS web origins as production
    return (window.location.protocol === 'https:' && window.location.hostname !== 'localhost');
  } catch (error) {
    return true; 
  }
};

// Get the appropriate API URL with fallback
const getApiUrl = () => {
  try {
    const url = isProduction() ? PRODUCTION_CONFIG.API_BASE_URL : PRODUCTION_CONFIG.DEV_API_BASE_URL;
    return url;
  } catch (error) {
    return PRODUCTION_CONFIG.DEV_API_BASE_URL;
  }
};

// Validate configuration
const validateConfig = () => {
  const requiredProps = ['API_BASE_URL', 'DEV_API_BASE_URL', 'endpoints'];
  const missingProps = requiredProps.filter(prop => !PRODUCTION_CONFIG.hasOwnProperty(prop));
  
  if (missingProps.length > 0) {
    return false;
  }
  
  return true;
};

// Health check for CONFIG availability
const healthCheck = () => {
  if (typeof window === 'undefined') {
    return false;
  }
  
  if (!window.CONFIG) {
    return false;
  }
  
  return true;
};

// Export configuration with error handling
const createConfig = () => {
  if (!validateConfig()) {
    return null;
  }
  
  return {
    ...PRODUCTION_CONFIG,
    isProduction,
    getApiUrl,
    validateConfig,
    healthCheck
  };
};

// Timeout-based CONFIG loading with proper error handling
const CONFIG_LOAD_TIMEOUT = 10000; // 10 seconds
let configLoadTimeout = null;
let configLoadResolved = false;

const ensureConfigAvailable = () => {
  return new Promise((resolve, reject) => {
    // Check if CONFIG is already available
    if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.healthCheck && window.CONFIG.healthCheck()) {
      // CONFIG already available and healthy
      configLoadResolved = true;
      resolve(window.CONFIG);
      return;
    }

    // Set timeout for CONFIG loading
    configLoadTimeout = setTimeout(() => {
      if (!configLoadResolved) {
        configLoadResolved = true;
        reject(new Error('CONFIG failed to load within 10 seconds'));
      }
    }, CONFIG_LOAD_TIMEOUT);

    // Try to load CONFIG immediately
    try {
      const config = createConfig();
      if (config) {
        if (typeof window !== 'undefined') {
          window.CONFIG = config;
        }
        // CONFIG loaded successfully
        configLoadResolved = true;
        clearTimeout(configLoadTimeout);
        resolve(config);
      } else {
        reject(new Error('Failed to create CONFIG'));
      }
    } catch (error) {
      configLoadResolved = true;
      clearTimeout(configLoadTimeout);
      reject(error);
    }
  });
};

// Initialize CONFIG with timeout-based approach
const initializeConfig = async () => {
  try {
    const config = await ensureConfigAvailable();
    // Configuration loaded successfully
    return config;
  } catch (error) {
    
    // Create a fallback config for graceful degradation
    const fallbackConfig = createConfig();
    if (fallbackConfig && typeof window !== 'undefined') {
      window.CONFIG = fallbackConfig;
    }
    
    throw error;
  }
};

// Start CONFIG initialization
if (typeof window !== 'undefined') {
  initializeConfig().catch(error => {
    // CONFIG initialization failed
  });
}

// Fallback for immediate availability
if (typeof window !== 'undefined') {
  window.CONFIG = window.CONFIG || createConfig();
}

// Configuration module loaded 