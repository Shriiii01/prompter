//  PRODUCTION CONFIGURATION
// Update this file with your Railway URL before deploying

const PRODUCTION_CONFIG = {
  //  PRODUCTION URL - Railway
  API_BASE_URL: 'https://prompter-production-76a3.up.railway.app',
  
  // Development URL (don't change this)
  DEV_API_BASE_URL: 'http://localhost:8000',
  
  // API endpoints (don't change these)
  endpoints: {
    enhance: '/api/v1/enhance',
    quickTest: '/api/v1/quick-test',
    health: '/api/v1/health',
    userStats: '/api/v1/user/stats',
    userCount: '/api/v1/user/count',
    incrementCount: '/api/v1/user/increment-count'
  }
};

// Environment detection with improved reliability
const isProduction = () => {
  try {
    // If running inside a Chrome extension context (popup or content script),
    // prefer development API unless explicitly overridden.
    const isChromeExtension = typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    if (isChromeExtension) return false;

    // Fallback: treat real HTTPS web origins as production
    return (window.location.protocol === 'https:' && window.location.hostname !== 'localhost');
  } catch (error) {
    console.warn(' Error detecting production environment:', error);
    return false; // Default to development
  }
};

// Get the appropriate API URL with fallback
const getApiUrl = () => {
  try {
    const url = isProduction() ? PRODUCTION_CONFIG.API_BASE_URL : PRODUCTION_CONFIG.DEV_API_BASE_URL;
    try { console.log(`[CONFIG] Using API base URL: ${url}`); } catch (_) {}
    return url;
  } catch (error) {
    console.warn(' Error getting API URL, using fallback:', error);
    return PRODUCTION_CONFIG.DEV_API_BASE_URL;
  }
};

// Validate configuration
const validateConfig = () => {
  const requiredProps = ['API_BASE_URL', 'DEV_API_BASE_URL', 'endpoints'];
  const missingProps = requiredProps.filter(prop => !PRODUCTION_CONFIG.hasOwnProperty(prop));
  
  if (missingProps.length > 0) {
    console.error(' Missing required config properties:', missingProps);
    return false;
  }
  
  return true;
};

// Health check for CONFIG availability
const healthCheck = () => {
  if (typeof window === 'undefined') {
    console.warn(' Window object not available');
    return false;
  }
  
  if (!window.CONFIG) {
    console.warn(' CONFIG not available on window object');
    return false;
  }
  
  return true;
};

// Export configuration with error handling
const createConfig = () => {
  if (!validateConfig()) {
    console.error(' Configuration validation failed');
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
        console.error(' CONFIG load timeout reached (10 seconds)');
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
        console.error(' Failed to create CONFIG');
        reject(new Error('Failed to create CONFIG'));
      }
    } catch (error) {
      console.error(' Error loading CONFIG:', error);
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
    console.error(' CONFIG initialization failed:', error.message);
    
    // Create a fallback config for graceful degradation
    const fallbackConfig = createConfig();
    if (fallbackConfig && typeof window !== 'undefined') {
      window.CONFIG = fallbackConfig;
      console.warn(' Using fallback CONFIG due to initialization failure');
    }
    
    throw error;
  }
};

// Start CONFIG initialization
if (typeof window !== 'undefined') {
  initializeConfig().catch(error => {
    console.error(' CONFIG initialization failed with error:', error);
  });
}

// Fallback for immediate availability
if (typeof window !== 'undefined') {
  window.CONFIG = window.CONFIG || createConfig();
}

// Configuration module loaded 