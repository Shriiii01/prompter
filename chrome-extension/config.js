// 🌐 PRODUCTION CONFIGURATION
// Update this file with your Railway URL before deploying

const PRODUCTION_CONFIG = {
  // 🚨 UPDATE THIS WITH YOUR ACTUAL RAILWAY URL
  API_BASE_URL: 'https://prompter-production-76a3.railway.app',
  
  // Development URL (don't change this)
  DEV_API_BASE_URL: 'http://localhost:8004',
  
  // API endpoints (don't change these)
  endpoints: {
    enhance: '/api/v1/enhance',
    quickTest: '/api/v1/quick-test',
    health: '/api/v1/health',
    userStats: '/api/v1/user/stats',
    userCount: '/api/v1/user/count'
  }
};

// Environment detection
const isProduction = () => {
  return window.location.protocol === 'https:' || 
         window.location.hostname !== 'localhost';
};

// Get the appropriate API URL
const getApiUrl = () => {
  return isProduction() ? PRODUCTION_CONFIG.API_BASE_URL : PRODUCTION_CONFIG.DEV_API_BASE_URL;
};

// Export configuration
window.CONFIG = {
  ...PRODUCTION_CONFIG,
  isProduction,
  getApiUrl
};

console.log('🌐 Configuration loaded:', {
  isProduction: isProduction(),
  apiUrl: getApiUrl(),
  productionUrl: PRODUCTION_CONFIG.API_BASE_URL
}); 