//  Configuration Manager - Service Worker Compatible
class ConfigManager {
    //  Singleton instance with proper locking
    static _instance = null;
    static _initializing = false;
    static _initializationPromise = null;
    static _cleanupCallbacks = new Set();
    static _instanceId = 0;
    
    constructor() {
        //  Prevent direct instantiation - use getInstance() instead
        if (ConfigManager._instance) {
            throw new Error('ConfigManager is a singleton. Use ConfigManager.getInstance() instead.');
        }
        
        //  Generate unique instance ID for tracking
        this._instanceId = ++ConfigManager._instanceId;
        this._isDestroyed = false;
        this._initializationTime = Date.now();
        
        //  Environment detection and fallbacks
        this.environment = this.detectEnvironment();
        
        //  Initialize configuration with proper structure validation
        this._initializeConfig();
        
        //  Bind methods to prevent context loss
        this.ensureConfigAvailable = this.ensureConfigAvailable.bind(this);
        this.destroy = this.destroy.bind(this);
        this.isValid = this.isValid.bind(this);
        
        //  Register cleanup callback
        ConfigManager._cleanupCallbacks.add(this.destroy.bind(this));
        
        //  Log environment detection
    }

    //  Singleton getInstance with proper synchronization
    static getInstance() {
        return new Promise(async (resolve, reject) => {
            try {
                //  If instance exists and is valid, return it
                if (ConfigManager._instance && ConfigManager._instance.isValid()) {
                    resolve(ConfigManager._instance);
                    return;
                }
                
                //  If initialization is in progress, wait for it
                if (ConfigManager._initializing && ConfigManager._initializationPromise) {
                    try {
                        const instance = await ConfigManager._initializationPromise;
                        resolve(instance);
                        return;
                    } catch (error) {
                        reject(error);
                        return;
                    }
                }
                
                //  Start initialization with proper locking
                ConfigManager._initializing = true;
                ConfigManager._initializationPromise = new Promise(async (initResolve, initReject) => {
                    try {
                        //  Clean up any existing invalid instance
                        if (ConfigManager._instance && !ConfigManager._instance.isValid()) {
                            await ConfigManager._instance.destroy();
                        }
                        
                        //  Create new instance
                        const instance = new ConfigManager();
                        
                        //  Validate instance
                        if (!instance.isValid()) {
                            throw new Error('Failed to create valid ConfigManager instance');
                        }
                        
                        //  Set as singleton instance
                        ConfigManager._instance = instance;
                        
                        initResolve(instance);
                    } catch (error) {
                        ConfigManager._initializing = false;
                        ConfigManager._initializationPromise = null;
                        initReject(error);
                    }
                });
                
                //  Wait for initialization to complete
                try {
                    const instance = await ConfigManager._initializationPromise;
                    ConfigManager._initializing = false;
                    ConfigManager._initializationPromise = null;
                    resolve(instance);
                } catch (error) {
                    ConfigManager._initializing = false;
                    ConfigManager._initializationPromise = null;
                    reject(error);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    //  Initialize configuration with structure validation
    _initializeConfig() {
        try {
            this.config = {
                API_BASE_URL: 'http://localhost:8000',
                DEV_API_BASE_URL: 'http://localhost:8000',
                endpoints: {
                    enhance: '/api/v1/enhance',
                    quickTest: '/api/v1/quick-test',
                    health: '/api/v1/health',
                    userStats: '/api/v1/user/stats',
                    userCount: '/api/v1/user/count',
                    incrementCount: '/api/v1/user/increment-count'
                }
            };
            
            //  Validate configuration structure
            this._validateConfigStructure();
        } catch (error) {
            throw error;
        }
    }

    //  Validate configuration structure
    _validateConfigStructure() {
        const requiredStructure = {
            API_BASE_URL: 'string',
            DEV_API_BASE_URL: 'string',
            endpoints: 'object'
        };
        
        const requiredEndpoints = [
            'enhance', 'quickTest', 'health', 'userStats', 'userCount', 'incrementCount'
        ];
        
        //  Check top-level properties
        for (const [key, expectedType] of Object.entries(requiredStructure)) {
            if (!this.config.hasOwnProperty(key)) {
                throw new Error(`Missing required config property: ${key}`);
            }
            
            const actualType = typeof this.config[key];
            if (actualType !== expectedType) {
                throw new Error(`Invalid type for ${key}: expected ${expectedType}, got ${actualType}`);
            }
        }
        
        //  Check endpoints structure
        if (!this.config.endpoints || typeof this.config.endpoints !== 'object') {
            throw new Error('Endpoints configuration is invalid');
        }
        
        //  Check required endpoints
        for (const endpoint of requiredEndpoints) {
            if (!this.config.endpoints.hasOwnProperty(endpoint)) {
                throw new Error(`Missing required endpoint: ${endpoint}`);
            }
            
            if (typeof this.config.endpoints[endpoint] !== 'string') {
                throw new Error(`Invalid endpoint type for ${endpoint}: expected string`);
            }
        }
        
    }

    //  Check if instance is valid and not destroyed
    isValid() {
        return !this._isDestroyed && 
               this.config && 
               typeof this.config === 'object';
    }

    //  Destroy instance and cleanup resources
    async destroy() {
        if (this._isDestroyed) {
            return;
        }
        
        try {
            
            //  Mark as destroyed
            this._isDestroyed = true;
            
            //  Clear configuration
            this.config = null;
            
            //  Remove from singleton if this is the current instance
            if (ConfigManager._instance === this) {
                ConfigManager._instance = null;
            }
            
            //  Remove from cleanup callbacks
            ConfigManager._cleanupCallbacks.delete(this.destroy);
            
        } catch (error) {
            // Error destroying ConfigManager
        }
    }

    //  Static cleanup method for all instances
    static async cleanup() {
        
        try {
            //  Destroy current instance
            if (ConfigManager._instance) {
                await ConfigManager._instance.destroy();
            }
            
            //  Execute all cleanup callbacks
            const cleanupPromises = Array.from(ConfigManager._cleanupCallbacks).map(callback => {
                try {
                    return callback();
                } catch (error) {
                    return Promise.resolve();
                }
            });
            
            await Promise.all(cleanupPromises);
            
            //  Reset static state
            ConfigManager._instance = null;
            ConfigManager._initializing = false;
            ConfigManager._initializationPromise = null;
            ConfigManager._cleanupCallbacks.clear();
            ConfigManager._instanceId = 0;
            
        } catch (error) {
            // Error during ConfigManager cleanup
        }
    }

    //  Detect environment and handle window object availability
    detectEnvironment() {
        try {
            // Service worker context detection
            if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
                return 'service_worker';
            }
            
            // Browser context detection
            if (typeof window !== 'undefined' && typeof document !== 'undefined') {
                return 'browser';
            }
            
            // Extension context detection
            if (typeof chrome !== 'undefined' && chrome.runtime) {
                return 'extension';
            }
            
            // Fallback
            return 'unknown';
        } catch (error) {
            return 'unknown';
        }
    }

    //  Safely check if window is available
    isWindowAvailable() {
        return typeof window !== 'undefined' && window !== null;
    }

    //  Safely access window object with fallback
    safeWindowAccess(accessor, fallback = null) {
        try {
            if (this.isWindowAvailable()) {
                return accessor(window);
            }
            return fallback;
        } catch (error) {
            return fallback;
        }
    }

    //  Get API URL based on environment
    getApiUrl() {
        if (!this.config || !this.config.API_BASE_URL || !this.config.DEV_API_BASE_URL) {
            throw new Error('ConfigManager configuration is not properly initialized');
        }
        
        try {
            return this.isProduction() ? this.config.API_BASE_URL : this.config.DEV_API_BASE_URL;
        } catch (error) {
            return this.config.DEV_API_BASE_URL;
        }
    }

    //  Check if in production with environment-aware fallbacks
    isProduction() {
        try {
            // Handle different environments
            switch (this.environment) {
                case 'browser':
                    return window.location.protocol === 'https:' || 
                           window.location.hostname !== 'localhost';
                
                case 'browser-no-location':
                    // Fallback for browser without location access
                    return false;
                
                case 'nodejs':
                    // Node.js environment - check NODE_ENV
                    return process.env.NODE_ENV === 'production';
                
                case 'webworker':
                    // Web Worker environment - assume development
                    return false;
                
                case 'globalThis':
                    // Modern JavaScript environment
                    if (typeof globalThis.location !== 'undefined') {
                        return globalThis.location.protocol === 'https:' || 
                               globalThis.location.hostname !== 'localhost';
                    }
                    return false;
                
                case 'unknown':
                default:
                    // Unknown environment - assume development
                    return false;
            }
        } catch (error) {
            return false;
        }
    }

    //  Get endpoints
    getEndpoints() {
        if (!this.config || !this.config.endpoints) {
            throw new Error('ConfigManager configuration is not properly initialized');
        }
        return { ...this.config.endpoints }; // Return copy to prevent mutation
    }

    //  Get full endpoint URL
    getEndpointUrl(endpointName) {
        if (!this.config || !this.config.endpoints) {
            throw new Error('ConfigManager configuration is not properly initialized');
        }
        
        const endpoint = this.config.endpoints[endpointName];
        if (!endpoint) {
            throw new Error(`Unknown endpoint: ${endpointName}`);
        }
        return `${this.getApiUrl()}${endpoint}`;
    }

    //  Validate configuration
    validate() {
        if (!this.config || typeof this.config !== 'object') {
            return false;
        }
        
        const requiredProps = ['API_BASE_URL', 'DEV_API_BASE_URL', 'endpoints'];
        const missingProps = requiredProps.filter(prop => !this.config.hasOwnProperty(prop));
        
        if (missingProps.length > 0) {
            return false;
        }
        
        return true;
    }

    //  Health check for ConfigManager instance validity
    healthCheck() {
        try {
            // Check if this ConfigManager instance is properly initialized
            if (!this.config) {
                return false;
            }

            // Validate required configuration properties
            const requiredProps = ['API_BASE_URL', 'DEV_API_BASE_URL', 'endpoints'];
            const missingProps = requiredProps.filter(prop => !this.config.hasOwnProperty(prop));
            
            if (missingProps.length > 0) {
                return false;
            }

            // Validate endpoints object
            if (!this.config.endpoints || typeof this.config.endpoints !== 'object') {
                return false;
            }

            // Check if required endpoints exist
            const requiredEndpoints = ['enhance', 'health'];
            const missingEndpoints = requiredEndpoints.filter(endpoint => 
                !this.config.endpoints.hasOwnProperty(endpoint)
            );
            
            if (missingEndpoints.length > 0) {
                return false;
            }

            // Validate API URLs are strings and not empty
            if (!this.config.API_BASE_URL || typeof this.config.API_BASE_URL !== 'string') {
                return false;
            }

            if (!this.config.DEV_API_BASE_URL || typeof this.config.DEV_API_BASE_URL !== 'string') {
                return false;
            }

            // Test if we can generate API URLs without errors
            try {
                const apiUrl = this.getApiUrl();
                if (!apiUrl || typeof apiUrl !== 'string') {
                    return false;
                }
            } catch (error) {
                return false;
            }

            // Test if we can generate endpoint URLs without errors
            try {
                const enhanceUrl = this.getEndpointUrl('enhance');
                if (!enhanceUrl || typeof enhanceUrl !== 'string') {
                    return false;
                }
            } catch (error) {
                return false;
            }

            // All checks passed
            return true;
        } catch (error) {
            return false;
        }
    }

    //  Get detailed health information
    getHealthInfo() {
        const healthCheckResult = this.healthCheck();
        return {
            isHealthy: healthCheckResult,
            hasConfig: !!this.config,
            hasRequiredProps: ['API_BASE_URL', 'DEV_API_BASE_URL', 'endpoints'].every(prop => 
                this.config && this.config.hasOwnProperty(prop)
            ),
            hasRequiredEndpoints: ['enhance', 'health'].every(endpoint => 
                this.config && this.config.endpoints && this.config.endpoints.hasOwnProperty(endpoint)
            ),
            apiUrlValid: (() => {
                try {
                    const url = this.getApiUrl();
                    return !!url && typeof url === 'string';
                } catch {
                    return false;
                }
            })(),
            endpointUrlValid: (() => {
                try {
                    const url = this.getEndpointUrl('enhance');
                    return !!url && typeof url === 'string';
                } catch {
                    return false;
                }
            })(),
            instanceId: this._instanceId,
            isDestroyed: this._isDestroyed,
            initializationTime: this._initializationTime
        };
    }

    //  Get environment information
    getEnvironmentInfo() {
        return {
            environment: this.environment,
            hasWindow: typeof window !== 'undefined' && window !== null,
            hasLocation: typeof window !== 'undefined' && window.location !== undefined,
            hasGlobal: typeof global !== 'undefined',
            hasGlobalThis: typeof globalThis !== 'undefined',
            hasSelf: typeof self !== 'undefined',
            hasModule: typeof module !== 'undefined',
            hasExports: typeof exports !== 'undefined',
            hasDefine: typeof define === 'function'
        };
    }

    //  Log configuration status
    logStatus() {
        const healthCheckResult = this.healthCheck();
        const healthInfo = this.getHealthInfo();
            instanceId: this._instanceId,
            environment: this.environment,
            environmentInfo: this.getEnvironmentInfo(),
            isProduction: this.isProduction(),
            apiUrl: this.getApiUrl(),
            healthCheck: healthCheckResult,
            healthInfo: healthInfo,
            configValid: this.validate(),
            isDestroyed: this._isDestroyed
        });
    }

    //  Ensure CONFIG is available - synchronized implementation
    async ensureConfigAvailable() {
        try {
            // Check if CONFIG already exists and is healthy
            if (this.isWindowAvailable() && window.CONFIG && 
                window.CONFIG instanceof ConfigManager && 
                window.CONFIG.isValid()) {
                return window.CONFIG;
            }
            
            // Get singleton instance
            const configManager = await ConfigManager.getInstance();
            
            // Attach to window if available
            if (this.isWindowAvailable()) {
                window.CONFIG = configManager;
            } else {
            }
            
            configManager.logStatus();
            return configManager;
        } catch (error) {
            throw error;
        }
    }
}

//  Create synchronized CONFIG object - use the actual ConfigManager instance
let CONFIG = null;

//  Initialize CONFIG with the ConfigManager instance
const initializeCONFIG = async () => {
    try {
        // Prevent multiple initializations
        if (CONFIG && CONFIG.isValid && CONFIG.isValid()) {
            return CONFIG;
        }

        const configManager = await ConfigManager.getInstance();
        CONFIG = configManager;
        
        // Attach to global scope if available (but be more careful about it)
        if (typeof globalThis !== 'undefined') {
            try {
                // Check if we're in a browser context with document
                if (typeof document !== 'undefined') {
                    globalThis.CONFIG = CONFIG;
                } else {
                }
            } catch (error) {
                // Failed to attach CONFIG to globalThis
            }
        } else {
        }
        
        return CONFIG;
    } catch (error) {
        throw error;
    }
};

//  Auto-initialize CONFIG when script loads (but be more careful)
if (typeof globalThis !== 'undefined') {
    // Only auto-initialize if we're in a browser context with document
    if (typeof document !== 'undefined') {
        // Initialize CONFIG when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                initializeCONFIG().catch(error => {
                    // Failed to initialize CONFIG on DOMContentLoaded
                });
            });
        } else {
            initializeCONFIG().catch(error => {
                // Failed to initialize CONFIG
            });
        }
    } else {
        // Service worker context - initialize immediately
        initializeCONFIG().catch(error => {
            // Failed to initialize CONFIG in service worker
        });
    }
} else {
    // Non-browser context - initialize immediately
    initializeCONFIG().catch(error => {
        // Failed to initialize CONFIG in non-browser context
    });
}

//  Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConfigManager, CONFIG, initializeCONFIG };
} else if (typeof exports !== 'undefined') {
    exports.ConfigManager = ConfigManager;
    exports.CONFIG = CONFIG;
    exports.initializeCONFIG = initializeCONFIG;
} else if (typeof define === 'function' && define.amd) {
    // AMD module system
    define([], function() {
        return { ConfigManager, CONFIG, initializeCONFIG };
    });
} else if (typeof globalThis !== 'undefined') {
    // Modern JavaScript environment
    globalThis.ConfigManager = ConfigManager;
    globalThis.CONFIG = CONFIG;
    globalThis.initializeCONFIG = initializeCONFIG;
} 