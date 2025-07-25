// AI Magic - Prompt Enhancer - Google Login
console.log('🚀 AI Magic Popup - Loading Google Login...');

class GoogleLoginManager {
    constructor() {
        this.clientId = '20427090028-asq8b7s849pq95li1hkmc7vrq1qeertg.apps.googleusercontent.com';
        this.scopes = ['openid', 'email', 'profile'];
        this.userInfo = null;
        this.extensionId = chrome.runtime.id;
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkLoginStatus();
        this.setupMessageListener();
    }

    bindEvents() {
        // Login button
        const loginBtn = document.getElementById('login-btn');
        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.handleLogin());
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Quit button
        const quitBtn = document.getElementById('quit-btn');
        if (quitBtn) {
            quitBtn.addEventListener('click', () => this.handleQuit());
        }

        // Start/Stop button
        const startStopBtn = document.getElementById('start-stop-btn');
        if (startStopBtn) {
            startStopBtn.addEventListener('click', () => this.handleStartStop());
        }

        // Name input functionality
        const nameSubmitBtn = document.getElementById('name-submit-btn');
        const nameInputField = document.getElementById('name-input-field');
        
        if (nameSubmitBtn) {
            nameSubmitBtn.addEventListener('click', () => this.handleNameSubmit());
        }
        
        if (nameInputField) {
            // Allow Enter key to submit name
            nameInputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleNameSubmit();
                }
            });
        }


    }

    async checkLoginStatus() {
        try {
            console.log('🔍 Checking login status...');
            
            // Check token expiry status
            const tokenStatus = await this.checkTokenExpiry();
            console.log('📊 Token status:', tokenStatus);
            
            if (tokenStatus.valid) {
                // Token is valid, check if user has completed full login
                const userInfo = await this.getStoredUserInfo();
                if (userInfo && userInfo.display_name) {
                    // User has completed the full login process
                    console.log('✅ User fully logged in, showing user info');
                    this.showUserInfo();
                    
                    // If token expires soon, show warning
                    if (tokenStatus.reason === 'expiring_soon') {
                        const minutesLeft = Math.ceil(tokenStatus.timeUntilExpiry / 60);
                        console.log(`⚠️ Token expires in ${minutesLeft} minutes`);
                        // Could show a subtle warning to user here
                    }
                } else {
                    // User has token but hasn't completed name input
                    console.log('⚠️ User has token but needs to complete name input');
                    const token = await this.getStoredToken();
                    const userInfoFromToken = await this.getUserInfo(token);
                    this.showNameInputForm(userInfoFromToken);
                }
            } else {
                // Token is invalid or missing
                console.log(`❌ Token invalid: ${tokenStatus.reason}`);
                
                if (tokenStatus.reason === 'expired') {
                    // Try to refresh the token automatically
                    console.log('🔄 Attempting automatic token refresh...');
                    const refreshedToken = await this.refreshToken();
                    
                    if (refreshedToken) {
                        // Token refreshed successfully, check login status again
                        console.log('✅ Token refreshed, checking login status again');
                        await this.checkLoginStatus();
                        return;
                    } else {
                        console.log('❌ Automatic token refresh failed');
                    }
                }
                
                // Clear invalid data and show login form
                await this.clearStoredData();
                this.showLoginForm();
            }
        } catch (error) {
            console.error('❌ Error checking login status:', error);
            this.showStatus('Error checking login status', 'error');
            this.showLoginForm();
        }
    }

    async handleLogin() {
        try {
            this.setLoading(true);
            // Info notification removed

            // Launch OAuth flow
            const token = await this.launchOAuthFlow();
            
            if (token) {
                // Get user info from token
                const userInfo = await this.getUserInfo(token);
                
                // Store token temporarily (we'll store user info after name input)
                await this.storeTokenOnly(token);
                
                // Show name input form
                this.showNameInputForm(userInfo);
            } else {
                this.showStatus('Login cancelled or failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showStatus(`Login failed: ${error.message}`, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    async handleLogout() {
        try {
            // Info notification removed
            
            // Stop token refresh monitoring
            this.stopTokenRefreshMonitoring();
            
            // Clear stored data
            await this.clearStoredData();
            
            // Clear any local enhanced count and cached count
            chrome.storage.local.remove(['enhanced_count', 'cached_prompt_count'], () => {
                console.log('Cleared local enhanced count and cached count on logout');
            });
            
            // Revoke token if possible
            await this.revokeToken();
            
            // Success notification removed
            this.showLoginForm();
            
            // Notify content script about logout
            this.notifyContentScript('logout');
        } catch (error) {
            console.error('Logout error:', error);
            this.showStatus(`Logout failed: ${error.message}`, 'error');
        }
    }

    async handleQuit() {
        try {
            // Info notification removed
            
            // First, stop the content script and clear all icons
            console.log('🧹 Cleaning up content script before quitting...');
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    // Send cleanup message to content script
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'cleanupAndQuit'
                    }, () => {
                        // Continue with extension disable even if message fails
                        this.disableExtension();
                    });
                } else {
                    // No active tab, just disable extension
                    this.disableExtension();
                }
            });
        } catch (error) {
            console.error('Quit error:', error);
            this.showStatus(`Failed to quit: ${error.message}`, 'error');
        }
    }
    
    disableExtension() {
        // Disable the extension
        chrome.management.setEnabled(this.extensionId, false, () => {
            if (chrome.runtime.lastError) {
                console.error('Error disabling extension:', chrome.runtime.lastError);
                this.showStatus('Failed to quit extension', 'error');
            } else {
                // Success notification removed
                // Close the popup
                window.close();
            }
        });
    }

    async handleStartStop() {
        const startStopBtn = document.getElementById('start-stop-btn');
        const isCurrentlyActive = startStopBtn.classList.contains('stopped');
        
        if (isCurrentlyActive) {
            // Currently active, so stop
            await this.handleStop();
        } else {
            // Currently inactive, so start
            await this.handleStart();
        }
    }

    async handleStart() {
        try {
            const startStopBtn = document.getElementById('start-stop-btn');
            startStopBtn.disabled = true;
            startStopBtn.textContent = 'Starting...';
            
            // Send message to content script to start the extension
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (!tabs[0]) {
                    console.error('❌ No active tab found');
                    this.showStatus('No active tab found', 'error');
                    startStopBtn.disabled = false;
                    startStopBtn.textContent = 'Start';
                    return;
                }
                
                console.log('📡 Found active tab:', tabs[0].id, tabs[0].url);
                
                // Always try to inject content script first
                        this.injectContentScriptAndStart(tabs[0], startStopBtn);
            });
        } catch (error) {
            console.error('❌ Start error:', error);
            this.showStatus(`Failed to start: ${error.message}`, 'error');
            const startStopBtn = document.getElementById('start-stop-btn');
            startStopBtn.disabled = false;
            startStopBtn.textContent = 'Start';
        }
    }
    
    injectContentScriptAndStart(tab, startStopBtn) {
        console.log('🔄 Injecting content script...');
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['magical-enhancer.js']
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('❌ Failed to inject content script:', chrome.runtime.lastError);
                this.showStatus('Failed to inject content script', 'error');
                startStopBtn.disabled = false;
                startStopBtn.textContent = 'Start';
            } else {
                console.log('✅ Content script injected, waiting then starting...');
                setTimeout(() => {
                    this.sendStartMessage(tab, startStopBtn);
                }, 1000);
            }
        });
    }
    
    sendStartMessage(tab, startStopBtn) {
        console.log('📤 Sending startExtension message...');
        chrome.tabs.sendMessage(tab.id, {
            action: 'startExtension'
        }, (response) => {
            console.log('📡 Start response:', response);
            
            if (chrome.runtime.lastError) {
                console.error('❌ Start message failed:', chrome.runtime.lastError);
                this.showStatus(`Failed to start: ${chrome.runtime.lastError.message}`, 'error');
                startStopBtn.disabled = false;
                startStopBtn.textContent = 'Start';
            } else if (response && response.success) {
                console.log('✅ Extension started successfully');
                startStopBtn.textContent = 'Stop';
                startStopBtn.classList.add('stopped');
                startStopBtn.disabled = false;
                
                // Add debug scan after successful start
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'debugScan'
                    });
                }, 1000);
            } else {
                console.error('❌ No success response:', response);
                this.showStatus('Failed to start extension - no response', 'error');
                startStopBtn.disabled = false;
                startStopBtn.textContent = 'Start';
            }
        });
    }
    // Old duplicate code removed

    async handleStop() {
        try {
            const startStopBtn = document.getElementById('start-stop-btn');
            startStopBtn.disabled = true;
            startStopBtn.textContent = 'Stopping...';
            
            // Send message to content script to stop the extension
            chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'stopExtension'
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.log('Content script not available, but that\'s okay');
                            // Still update UI state
                            startStopBtn.textContent = 'Start';
                            startStopBtn.classList.remove('stopped');
                            startStopBtn.disabled = false;
                        } else {
                            startStopBtn.textContent = 'Start';
                            startStopBtn.classList.remove('stopped');
                            startStopBtn.disabled = false;
                        }
                    });
                } else {
                    this.showStatus('No active tab found', 'error');
                    startStopBtn.disabled = false;
                    startStopBtn.textContent = 'Stop';
                }
            });
        } catch (error) {
            console.error('Stop error:', error);
            this.showStatus(`Failed to stop: ${error.message}`, 'error');
            const startStopBtn = document.getElementById('start-stop-btn');
            startStopBtn.disabled = false;
            startStopBtn.textContent = 'Stop';
        }
    }

    async launchOAuthFlow() {
        return new Promise((resolve, reject) => {
            const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
                `client_id=${this.clientId}&` +
                `response_type=id_token&` +
                `scope=${this.scopes.join(' ')}&` +
                `redirect_uri=${chrome.identity.getRedirectURL()}&` +
                `state=${this.generateState()}&` +
                `nonce=${this.generateNonce()}`;

            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }

                if (!redirectUrl) {
                    resolve(null); // User cancelled
                    return;
                }

                try {
                    // Extract id_token from redirect URL
                    const url = new URL(redirectUrl);
                    const fragment = url.hash.substring(1);
                    const params = new URLSearchParams(fragment);
                    const idToken = params.get('id_token');
                    
                    if (idToken) {
                        resolve(idToken);
                    } else {
                        reject(new Error('No ID token received'));
                    }
                } catch (error) {
                    reject(new Error('Failed to parse redirect URL'));
                }
            });
        });
    }

    async getUserInfo(idToken) {
        try {
            // Decode JWT token to get user info
            const payload = this.decodeJWT(idToken);
            
            return {
                id: payload.sub,
                email: payload.email,
                name: payload.name,
                picture: payload.picture,
                given_name: payload.given_name,
                family_name: payload.family_name,
                email_verified: payload.email_verified
            };
        } catch (error) {
            console.error('Error decoding JWT:', error);
            throw new Error('Failed to decode user information');
        }
    }

    decodeJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('Invalid JWT token');
        }
    }

    async verifyToken(token) {
        try {
            // Basic token validation - check if it's not expired
            const payload = this.decodeJWT(token);
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (payload.exp && payload.exp < currentTime) {
                return false;
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async getValidToken() {
        try {
            const token = await this.getStoredToken();
            if (!token) {
                console.log('❌ No token stored');
                return null;
            }

            // Check if token is valid
            const isValid = await this.verifyToken(token);
            if (isValid) {
                console.log('✅ Token is valid');
                return token;
            }

            console.log('⚠️ Token expired, attempting refresh...');
            return await this.refreshToken();
        } catch (error) {
            console.error('❌ Error getting valid token:', error);
            return null;
        }
    }

    async refreshToken() {
        try {
            console.log('🔄 Starting token refresh...');
            
            // Get stored user info to know who we're refreshing for
            const userInfo = await this.getStoredUserInfo();
            if (!userInfo || !userInfo.email) {
                console.log('❌ No user info available for refresh');
                return null;
            }

            // Launch new OAuth flow to get fresh token
            const newToken = await this.launchOAuthFlow();
            if (!newToken) {
                console.log('❌ Token refresh failed - user cancelled');
                return null;
            }

            // Verify the new token
            const isValid = await this.verifyToken(newToken);
            if (!isValid) {
                console.log('❌ Refreshed token is invalid');
                return null;
            }

            // Get user info from new token
            const newUserInfo = await this.getUserInfo(newToken);
            
            // Store the new token and user info
            await this.storeUserData(newToken, newUserInfo);
            
            console.log('✅ Token refreshed successfully');
            return newToken;
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            return null;
        }
    }

    async silentTokenRefresh() {
        try {
            console.log('🔄 Attempting silent token refresh...');
            
            // For now, we can't do truly silent refresh with Google ID tokens
            // Google requires user interaction for OAuth flows
            // In a production system, you'd use refresh tokens instead
            
            // For now, we'll just check if the current token is still valid
            const tokenStatus = await this.checkTokenExpiry();
            
            if (tokenStatus.valid) {
                console.log('✅ Current token is still valid');
                return await this.getStoredToken();
            } else {
                console.log('❌ Token is invalid, user needs to re-authenticate');
                return null;
            }
        } catch (error) {
            console.error('❌ Silent token refresh failed:', error);
            return null;
        }
    }

    async checkTokenExpiry() {
        try {
            const token = await this.getStoredToken();
            if (!token) {
                return { valid: false, reason: 'no_token' };
            }

            const payload = this.decodeJWT(token);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = payload.exp ? payload.exp - currentTime : 0;

            // Token is expired
            if (timeUntilExpiry <= 0) {
                return { valid: false, reason: 'expired' };
            }

            // Token expires in less than 5 minutes (300 seconds)
            if (timeUntilExpiry < 300) {
                return { valid: true, reason: 'expiring_soon', timeUntilExpiry };
            }

            return { valid: true, reason: 'valid', timeUntilExpiry };
        } catch (error) {
            console.error('❌ Error checking token expiry:', error);
            return { valid: false, reason: 'error' };
        }
    }

    startTokenRefreshMonitoring() {
        // Clear any existing monitoring
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        // Check token every 2 minutes
        this.tokenRefreshInterval = setInterval(async () => {
            try {
                const tokenStatus = await this.checkTokenExpiry();
                
                if (tokenStatus.reason === 'expiring_soon') {
                    const minutesLeft = Math.ceil(tokenStatus.timeUntilExpiry / 60);
                    console.log(`⚠️ Token expires in ${minutesLeft} minutes - checking validity`);
                    
                    // Try silent refresh first (just check if token is still valid)
                    const validToken = await this.silentTokenRefresh();
                    if (validToken) {
                        console.log('✅ Token is still valid');
                    } else {
                        console.log('⚠️ Token will expire soon - user may need to re-authenticate');
                        // Could show a subtle notification to user here
                    }
                } else if (tokenStatus.reason === 'expired') {
                    console.log('❌ Token expired - user needs to re-authenticate');
                    // Could show a notification to user here
                }
            } catch (error) {
                console.error('❌ Error in token refresh monitoring:', error);
            }
        }, 120000); // Check every 2 minutes
    }

    stopTokenRefreshMonitoring() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    async revokeToken() {
        try {
            const token = await this.getStoredToken();
            if (token) {
                // Google doesn't provide a direct way to revoke ID tokens
                // The token will expire naturally
                console.log('Token will expire naturally');
            }
        } catch (error) {
            console.error('Error revoking token:', error);
        }
    }

    // Storage methods
    async storeUserData(token, userInfo) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                'google_token': token,
                'user_info': userInfo,
                'login_time': Date.now()
            }, resolve);
        });
    }

    async storeTokenOnly(token) {
        return new Promise((resolve) => {
            chrome.storage.local.set({
                'google_token': token,
                'login_time': Date.now()
            }, resolve);
        });
    }

    async getStoredToken() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['google_token'], (result) => {
                resolve(result.google_token || null);
            });
        });
    }

    async getStoredUserInfo() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['user_info'], (result) => {
                resolve(result.user_info || null);
            });
        });
    }

    async getCachedPromptCount() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cached_prompt_count'], (result) => {
                resolve(result.cached_prompt_count || 0);
            });
        });
    }

    async clearStoredData() {
        return new Promise((resolve) => {
            chrome.storage.local.remove(['google_token', 'user_info', 'login_time'], resolve);
        });
    }

    // UI methods - Updated for new HTML structure
    showLoginForm() {
        const authSection = document.getElementById('auth-section');
        const nameInputSection = document.getElementById('name-input-section');
        const userSection = document.getElementById('user-section');
        const statsSection = document.getElementById('stats-section');
        
        // Clear stats refresh interval
        if (this.statsRefreshInterval) {
            clearInterval(this.statsRefreshInterval);
            this.statsRefreshInterval = null;
        }
        
        // Stop token refresh monitoring
        this.stopTokenRefreshMonitoring();
        
        // Clear user info
        const userNameElement = document.getElementById('user-name');
        const userEmailElement = document.getElementById('user-email');
        if (userNameElement) userNameElement.textContent = '';
        if (userEmailElement) userEmailElement.textContent = '';
        
        // Clear enhanced count
        const enhancedCountElement = document.getElementById('enhanced-count');
        if (enhancedCountElement) enhancedCountElement.textContent = '0';
        
        // Clear name input
        const nameInputField = document.getElementById('name-input-field');
        if (nameInputField) {
            nameInputField.value = '';
        }
        
        // Hide all sections except auth
        if (nameInputSection) nameInputSection.classList.add('hidden');
        if (userSection) userSection.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        
        // Hide quit button
        const quitSection = document.getElementById('extension-control-section');
        if (quitSection) quitSection.classList.add('hidden');
        
        // Show auth section
        if (authSection) {
            authSection.classList.remove('hidden');
            authSection.classList.add('fade-in');
        }
    }

    showNameInputForm(userInfo) {
        const authSection = document.getElementById('auth-section');
        const nameInputSection = document.getElementById('name-input-section');
        const userSection = document.getElementById('user-section');
        const statsSection = document.getElementById('stats-section');
        
        // Hide auth section
        if (authSection) authSection.classList.add('hidden');
        
        // Hide logged-in sections
        if (userSection) userSection.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        
        // Hide quit button
        const quitSection = document.getElementById('extension-control-section');
        if (quitSection) quitSection.classList.add('hidden');
        
        // Show name input section
        if (nameInputSection) {
            nameInputSection.classList.remove('hidden');
            nameInputSection.classList.add('fade-in');
        }
        
        // Pre-fill name input with Google name if available
        const nameInputField = document.getElementById('name-input-field');
        if (nameInputField && userInfo.name) {
            nameInputField.value = userInfo.name;
            nameInputField.focus();
            nameInputField.select();
        }
        
        // Store user info temporarily for later use
        this.tempUserInfo = userInfo;
    }

    showUserInfo() {
        this.getStoredUserInfo().then(userInfo => {
            if (userInfo) {
                // Update user info
                const displayName = userInfo.display_name || userInfo.name || 'User';
                const userNameElement = document.getElementById('user-name');
                const userEmailElement = document.getElementById('user-email');
                if (userNameElement) userNameElement.textContent = displayName;
                if (userEmailElement) userEmailElement.textContent = userInfo.email || '';
                
                // Get DOM elements
                const authSection = document.getElementById('auth-section');
                const nameInputSection = document.getElementById('name-input-section');
                const userSection = document.getElementById('user-section');
                const statsSection = document.getElementById('stats-section');
                
                // Hide auth and name input sections
                if (authSection) authSection.classList.add('hidden');
                if (nameInputSection) nameInputSection.classList.add('hidden');
                
                // Show logged-in sections
                if (userSection) userSection.classList.remove('hidden');
                if (statsSection) statsSection.classList.remove('hidden');
                
                // Show quit button
                const quitSection = document.getElementById('extension-control-section');
                if (quitSection) quitSection.classList.remove('hidden');
                
                // Add fade-in animation
                if (userSection) userSection.classList.add('fade-in');
                if (statsSection) statsSection.classList.add('fade-in');
                if (quitSection) quitSection.classList.add('fade-in');
                
                // Check and set Start/Stop button state
                const startStopBtn = document.getElementById('start-stop-btn');
                if (startStopBtn) {
                    // Check if extension is active
                    chrome.storage.local.get(['extension_active'], (result) => {
                        if (result.extension_active) {
                            startStopBtn.textContent = 'Stop';
                            startStopBtn.classList.add('stopped');
                        } else {
                            startStopBtn.textContent = 'Start';
                            startStopBtn.classList.remove('stopped');
                        }
                        startStopBtn.disabled = false;
                    });
                }
                
                // Load and display real enhanced count immediately
                this.loadEnhancedCount();
                
                // Also refresh every 30 seconds while popup is open
                if (this.statsRefreshInterval) {
                    clearInterval(this.statsRefreshInterval);
                }
                this.statsRefreshInterval = setInterval(() => {
                    this.loadEnhancedCount();
                }, 30000);
                
                // Start background token refresh monitoring
                this.startTokenRefreshMonitoring();
            }
        });
    }

    setLoading(loading) {
        const loginBtn = document.getElementById('login-btn');
        const loginText = document.getElementById('login-text');
        const loginLoading = document.getElementById('login-loading');
        
        if (loginBtn && loginText && loginLoading) {
            if (loading) {
                loginBtn.disabled = true;
                loginText.classList.add('hidden');
                loginLoading.classList.remove('hidden');
            } else {
                loginBtn.disabled = false;
                loginText.classList.remove('hidden');
                loginLoading.classList.add('hidden');
            }
        }
    }

    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = `status ${type}`;
            statusEl.classList.remove('hidden');
            
            // Auto-hide success messages after 3 seconds
            if (type === 'success') {
                setTimeout(() => {
                    if (statusEl) statusEl.classList.add('hidden');
                }, 3000);
            }
        }
    }

    // Utility methods
    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    generateNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Communication with content script
    notifyContentScript(action, data = null) {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: action,
                    data: data
                }).catch(() => {
                    // Content script might not be loaded, which is fine
                    console.log('Content script not available for notification');
                });
            }
        });
    }

    setupMessageListener() {
        // Listen for enhanced count updates from content script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'updateEnhancedCount') {
                // Reload from backend instead of using local count
                this.loadEnhancedCount();
            }
        });
    }

    async loadEnhancedCount() {
        try {
            console.log('🔄 Loading enhanced count...');
            
            // Get user token for API call
            const token = await this.getStoredToken();
            
            if (!token) {
                console.log('❌ No token available, showing 0');
                this.updateEnhancedCountDisplay(0);
                return;
            }
            
            console.log('🔑 Token available, fetching stats...');
            console.log('🔑 Token preview:', token.substring(0, 20) + '...');
            console.log('🔑 Token length:', token.length);
            
            // Check if backend is likely available (quick health check)
            try {
                const healthCheck = await fetch('http://localhost:8004/api/v1/health', {
                    method: 'GET',
                    signal: AbortSignal.timeout(2000) // 2 second timeout
                });
                
                if (!healthCheck.ok) {
                    throw new Error('Backend health check failed');
                }
            } catch (healthError) {
                console.log('📡 Backend appears unavailable, using cached count');
                const cachedCount = await this.getCachedPromptCount();
                this.updateEnhancedCountDisplay(cachedCount);
                return;
            }
            
            // Get user email from stored user info
            const userInfo = await this.getStoredUserInfo();
            if (!userInfo || !userInfo.email) {
                console.log('❌ No user email available, showing 0');
                this.updateEnhancedCountDisplay(0);
                return;
            }
            
            console.log('📧 User email:', userInfo.email);
            
            // Fetch user count from backend with timeout (no auth required)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            try {
                const response = await fetch(`http://localhost:8004/api/v1/user/count/${encodeURIComponent(userInfo.email)}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
            
            console.log(`📡 Response status: ${response.status}`);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('📊 Raw user data response:', userData);
                
                const totalPrompts = userData.count;
                
                this.updateEnhancedCountDisplay(totalPrompts);
                
                console.log('✅ Loaded user count from backend:', userData);
                console.log(`📊 Total prompts: ${totalPrompts}`);
            } else {
                const errorText = await response.text();
                console.log(`📡 Backend returned ${response.status}: ${errorText}`);
                
                // Use cached count as fallback silently
                const cachedCount = await this.getCachedPromptCount();
                console.log(`🔄 Using cached count as fallback: ${cachedCount}`);
                console.log(`🔄 Cached count type: ${typeof cachedCount}`);
                this.updateEnhancedCountDisplay(cachedCount);
            }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.log('⏰ User stats fetch timed out, using cached count');
                } else {
                    console.log(`📡 User stats fetch failed, using cached count`);
                }
                
                // Use cached count as fallback
                const cachedCount = await this.getCachedPromptCount();
                console.log(`🔄 Using cached count as fallback: ${cachedCount}`);
                this.updateEnhancedCountDisplay(cachedCount);
            }
        } catch (error) {
            console.log('📡 Enhanced count loading failed, using cached count');
            
            // Use cached count as fallback silently
            const cachedCount = await this.getCachedPromptCount();
            console.log(`🔄 Using cached count as fallback: ${cachedCount}`);
            this.updateEnhancedCountDisplay(cachedCount);
        }
    }

    updateEnhancedCountDisplay(count) {
        const enhancedCountElement = document.getElementById('enhanced-count');
        if (enhancedCountElement) {
            enhancedCountElement.textContent = count.toString();
            console.log(`📊 Updated enhanced count display: ${count}`);
            console.log(`📊 Element text content: ${enhancedCountElement.textContent}`);
            
            // Store count locally as fallback
            chrome.storage.local.set({ 'cached_prompt_count': count }, () => {
                console.log(`💾 Cached prompt count: ${count}`);
            });
        } else {
            console.log('❌ Enhanced count element not found!');
        }
    }





    async handleNameSubmit() {
        try {
            const nameInputField = document.getElementById('name-input-field');
            const nameSubmitBtn = document.getElementById('name-submit-btn');
            const nameSubmitText = document.getElementById('name-submit-text');
            const nameSubmitLoading = document.getElementById('name-submit-loading');
            
            const displayName = nameInputField.value.trim();
            
            if (!displayName) {
                this.showStatus('Please enter your name', 'error');
                nameInputField.focus();
                return;
            }
            
            // Show loading state
            nameSubmitBtn.disabled = true;
            nameSubmitText.classList.add('hidden');
            nameSubmitLoading.classList.remove('hidden');
            
            // Get stored token
            const token = await this.getStoredToken();
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            // Update user info with custom display name
            const updatedUserInfo = {
                ...this.tempUserInfo,
                display_name: displayName,
                name: displayName // Use display name as the primary name
            };
            
            // Store complete user data
            await this.storeUserData(token, updatedUserInfo);
            
            // Store name locally (backend update will happen later)
            console.log(`✅ Name stored locally: ${displayName}`);
            
            // Clear any old local enhanced count when new user logs in
            chrome.storage.local.remove(['enhanced_count', 'cached_prompt_count'], () => {
                console.log('Cleared old enhanced count for new user login');
            });
            
            // Success notification removed
            this.showUserInfo();
            
            // Notify content script about login
            this.notifyContentScript('login', updatedUserInfo);
            
            // Clear temporary user info
            this.tempUserInfo = null;
            
        } catch (error) {
            console.error('Name submission error:', error);
            this.showStatus(`Failed to complete sign in: ${error.message}`, 'error');
            
            // Reset loading state
            const nameSubmitBtn = document.getElementById('name-submit-btn');
            const nameSubmitText = document.getElementById('name-submit-text');
            const nameSubmitLoading = document.getElementById('name-submit-loading');
            
            nameSubmitBtn.disabled = false;
            nameSubmitText.classList.remove('hidden');
            nameSubmitLoading.classList.add('hidden');
        }
    }
}

// Initialize the login manager when popup loads
document.addEventListener('DOMContentLoaded', () => {
    new GoogleLoginManager();
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getUserInfo') {
        // Return user info to content script
        chrome.storage.local.get(['user_info'], (result) => {
            sendResponse({userInfo: result.user_info});
        });
        return true; // Keep message channel open for async response
    }
}); 