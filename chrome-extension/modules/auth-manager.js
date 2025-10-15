// 🔐 Authentication Manager - Simplified and Focused
class AuthManager {
    constructor() {
        this.clientId = '20427090028-asq8b7s849pq95li1hkmc7vrq1qeertg.apps.googleusercontent.com';
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
        ];
        this.secureStorage = new SecureStorage();
        this.tokenRefreshInterval = null;
    }

    async checkLoginStatus() {
        try {
            
            const tokenStatus = await this.checkTokenExpiry();
               
            if (tokenStatus.valid) {
                const userInfo = await this.getStoredUserInfo();
                if (userInfo && userInfo.name) {
                    return { status: 'logged_in', userInfo };
                } else {
                    const token = await this.getStoredToken();
                    const userInfoFromToken = await this.getUserInfo(token);
                    return { status: 'needs_name', userInfo: userInfoFromToken };
                }
            } else {
                await this.clearStoredData();
                return { status: 'not_logged_in' };
            }
        } catch (error) {
            console.error(' Error checking login status:', error);
            return { status: 'error', error: error.message };
        }
    }

    async handleLogin() {
        try {

            // Check if we have an expired token that can be refreshed
            const tokenStatus = await this.checkTokenExpiry();
            if (tokenStatus.reason === 'expired') {
                console.log('🔄 Attempting to refresh expired token...');
                const refreshedToken = await this.refreshToken();
                
                if (refreshedToken) {
                    const userInfo = await this.getUserInfo(refreshedToken);
                    await this.storeTokenOnly(refreshedToken);
                    return { status: 'needs_name', userInfo };
                }
            }

            // Launch new OAuth flow
            const token = await this.launchOAuthFlow();
            
            if (token) {
                const userInfo = await this.getUserInfo(token);
                await this.storeTokenOnly(token);
                return { status: 'needs_name', userInfo };
            } else {
                throw new Error('Login cancelled or failed');
            }
        } catch (error) {
            console.error(' Login error:', error);
            let errorMessage = 'Please try signing in again';
            
            if (error.message.includes('OAuth flow was cancelled')) {
                errorMessage = 'Sign in was cancelled - please try again';
            } else if (error.message.includes('No token received')) {
                errorMessage = 'Please check your Google account and try again';
            } else if (error.message.includes('OAuth flow failed')) {
                errorMessage = 'Please try signing in again';
            } else {
                errorMessage = 'Please try signing in again';
            }
            
            throw new Error(errorMessage);
        }
    }

    async handleLogout() {
        try {
            this.stopTokenRefreshMonitoring();
            await this.clearStoredData();
            await this.revokeToken();
            
            // Clear local storage
            chrome.storage.local.remove(['enhanced_count', 'cached_prompt_count'], () => {
                console.log('Cleared local data on logout');
            });
            
            return { status: 'logged_out' };
        } catch (error) {
            console.error('Logout error:', error);
            throw error;
        }
    }

    async launchOAuthFlow() {
        return new Promise((resolve, reject) => {
            console.log('🔑 Client ID:', this.clientId);
            console.log('📋 Scopes:', this.scopes);
            
            // First try the simpler getAuthToken method
            chrome.identity.getAuthToken({
                interactive: true
            }, (token) => {
                console.log('🔄 OAuth callback received');
                
                if (chrome.runtime.lastError) {
                    // Check if it's the common "bad client id" error that doesn't affect functionality
                    const errorMessage = chrome.runtime.lastError.message || '';
                    if (errorMessage.includes('bad client id')) {
                        console.warn('⚠️ OAuth client ID warning (auth may still work):', errorMessage);
                    } else {
                        console.error('❌ Chrome runtime error:', chrome.runtime.lastError);
                        console.error('❌ Error details:', errorMessage);
                    }
                    
                    // If getAuthToken fails, try launchWebAuthFlow as fallback
                    console.log('🔄 Trying launchWebAuthFlow as fallback...');
                    this.launchWebAuthFlowFallback(resolve, reject);
                    return;
                }

                if (!token) {
                    reject(new Error('OAuth flow was cancelled by user'));
                    return;
                }

                resolve(token);
            });
        });
    }

    launchWebAuthFlowFallback(resolve, reject) {
        const redirectURL = chrome.identity.getRedirectURL();
        const authURL = `https://accounts.google.com/o/oauth2/auth?` +
            `client_id=${this.clientId}&` +
            `redirect_uri=${encodeURIComponent(redirectURL)}&` +
            `scope=${encodeURIComponent(this.scopes.join(' '))}&` +
            `response_type=token&` +
            `state=${this.generateState()}&` +
            `nonce=${this.generateNonce()}`;

        console.log('🔗 Launching WebAuthFlow with URL:', authURL);

        chrome.identity.launchWebAuthFlow({
            url: authURL,
            interactive: true
        }, (responseUrl) => {
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || '';
                if (errorMessage.includes('bad client id')) {
                    console.warn('⚠️ WebAuthFlow client ID warning (auth may still work):', errorMessage);
                } else {
                    console.error('❌ WebAuthFlow error:', chrome.runtime.lastError);
                }
                reject(new Error(`WebAuthFlow failed: ${errorMessage}`));
                return;
            }

            if (!responseUrl) {
                reject(new Error('WebAuthFlow was cancelled by user'));
                return;
            }

            
            // Extract token from response URL
            const urlParams = new URLSearchParams(responseUrl.split('#')[1]);
            const token = urlParams.get('access_token');
            
            if (token) {
                resolve(token);
            } else {
                console.error(' No token found in WebAuthFlow response');
                reject(new Error('No token received from WebAuthFlow'));
            }
        });
    }

    async getUserInfo(token) {
        try {
            // Use Google People API to get user info
            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch user info: ${response.status}`);
            }

            const userInfo = await response.json();

            return {
                id: userInfo.id,
                email: userInfo.email,
                name: userInfo.name,
                picture: userInfo.picture,
                given_name: userInfo.given_name,
                family_name: userInfo.family_name,
                email_verified: userInfo.verified_email
            };
        } catch (error) {
            console.error(' Error fetching user info:', error);
            throw new Error('Failed to fetch user information');
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

    async checkTokenExpiry() {
        try {
            const token = await this.getStoredToken();
            if (!token) {
                return { valid: false, reason: 'no_token' };
            }

            const payload = this.decodeJWT(token);
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = payload.exp ? payload.exp - currentTime : 0;

            if (timeUntilExpiry <= 0) {
                return { valid: false, reason: 'expired' };
            }

            if (timeUntilExpiry < 300) {
                return { valid: true, reason: 'expiring_soon', timeUntilExpiry };
            }

            return { valid: true, reason: 'valid', timeUntilExpiry };
        } catch (error) {
            console.error(' Error checking token expiry:', error);
            return { valid: false, reason: 'error' };
        }
    }

    async refreshToken() {
        try {
            console.log('🔄 Starting token refresh...');
            
            const userInfo = await this.getStoredUserInfo();
            if (!userInfo || !userInfo.email) {
                return null;
            }

            const newToken = await this.launchOAuthFlow();
            if (!newToken) {
                return null;
            }

            const isValid = await this.verifyToken(newToken);
            if (!isValid) {
                return null;
            }

            const newUserInfo = await this.getUserInfo(newToken);
            await this.storeUserData(newToken, newUserInfo);
            
            return newToken;
        } catch (error) {
            console.error(' Token refresh failed:', error);
            return null;
        }
    }

    async verifyToken(token) {
        try {
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

    async revokeToken() {
        try {
            const token = await this.getStoredToken();
            if (token) {
                console.log('Token will expire naturally');
            }
        } catch (error) {
            console.error('Error revoking token:', error);
        }
    }

    // Storage methods
    async storeUserData(token, userInfo) {
        try {
            // CRITICAL FIX: Check if this is a different user and clear cached data
            const existingData = await new Promise(resolve => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            
            const oldEmail = existingData.user_info?.email;
            const newEmail = userInfo.email;
            
            // If switching users, clear ALL cached user data
            if (oldEmail && oldEmail !== newEmail) {
                console.log('🔄 Different user detected, clearing cached data...');
                await new Promise(resolve => {
                    chrome.storage.local.remove([
                        'last_known_prompt_count',
                        'user_info',
                        'cached_subscription_status'
                    ], resolve);
                });
                console.log('✅ Cached data cleared for new user');
            }
            
            console.log('🔐 Attempting to store user data securely...');
            const tokenStored = await this.secureStorage.setEncrypted('google_token', token);
            const userInfoStored = await this.secureStorage.setEncrypted('user_info', userInfo);
            
            console.log('🔐 Token stored securely:', tokenStored);
            console.log('🔐 User info stored securely:', userInfoStored);
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            console.error(' Failed to store user data securely:', error);
            console.log('🔄 Falling back to plain storage...');
            
            // CRITICAL FIX: Also clear cache in fallback mode
            const existingData = await new Promise(resolve => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            
            const oldEmail = existingData.user_info?.email;
            const newEmail = userInfo.email;
            
            if (oldEmail && oldEmail !== newEmail) {
                console.log('🔄 Different user detected in fallback, clearing cached data...');
                await new Promise(resolve => {
                    chrome.storage.local.remove([
                        'last_known_prompt_count',
                        'user_info',
                        'cached_subscription_status'
                    ], resolve);
                });
            }
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'google_token': token,
                    'user_info': userInfo,
                    'login_time': Date.now()
                }, resolve);
            });
        }
    }

    async storeTokenOnly(token) {
        try {
            console.log('🔐 Attempting to store token securely...');
            const stored = await this.secureStorage.setEncrypted('google_token', token);
            console.log('🔐 Token stored securely:', stored);
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            console.error(' Failed to store token securely:', error);
            console.log('🔄 Falling back to plain storage...');
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'google_token': token,
                    'login_time': Date.now()
                }, resolve);
            });
        }
    }

    async getStoredToken() {
        try {
            console.log('🔐 Attempting to get encrypted token...');
            const token = await this.secureStorage.getEncrypted('google_token');
            console.log('🔐 Token retrieved securely:', !!token);
            return token;
        } catch (error) {
            console.error(' Failed to get encrypted token:', error);
            console.log('🔄 Falling back to plain storage...');
            return new Promise((resolve) => {
                chrome.storage.local.get(['google_token'], (result) => {
                    resolve(result.google_token || null);
                });
            });
        }
    }

    async getStoredUserInfo() {
        try {
            console.log('🔐 Attempting to get encrypted user info...');
            const userInfo = await this.secureStorage.getEncrypted('user_info');
            console.log('🔐 User info retrieved securely:', !!userInfo);
            return userInfo;
        } catch (error) {
            console.error(' Failed to get encrypted user info:', error);
            console.log('🔄 Falling back to plain storage...');
            return new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], (result) => {
                    resolve(result.user_info || null);
                });
            });
        }
    }

    async storeUserInfo(userInfo) {
        try {
            console.log('🔐 Storing user info:', userInfo);
            const stored = await this.secureStorage.setEncrypted('user_info', userInfo);
            console.log('🔐 User info stored securely:', stored);
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'user_info': userInfo,
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            console.error(' Failed to store user info securely:', error);
            console.log('🔄 Falling back to plain storage...');
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'user_info': userInfo,
                    'login_time': Date.now()
                }, resolve);
            });
        }
    }

    async clearStoredData() {
        try {
            console.log('🔐 Attempting to clear encrypted data...');
            await this.secureStorage.removeEncrypted('google_token');
            await this.secureStorage.removeEncrypted('user_info');
            console.log('🔐 Encrypted data cleared successfully');
            
            return new Promise((resolve) => {
                chrome.storage.local.remove(['login_time'], resolve);
            });
        } catch (error) {
            console.error(' Failed to clear encrypted data:', error);
            console.log('🔄 Falling back to plain storage clearing...');
            return new Promise((resolve) => {
                chrome.storage.local.remove(['google_token', 'user_info', 'login_time'], resolve);
            });
        }
    }

    startTokenRefreshMonitoring() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
        }

        this.tokenRefreshInterval = setInterval(async () => {
            try {
                const tokenStatus = await this.checkTokenExpiry();
                
                if (tokenStatus.reason === 'expiring_soon') {
                    const minutesLeft = Math.ceil(tokenStatus.timeUntilExpiry / 60);
                } else if (tokenStatus.reason === 'expired') {
                    // Trigger logout event
                    window.dispatchEvent(new CustomEvent('tokenExpired'));
                }
            } catch (error) {
                console.error(' Error in token refresh monitoring:', error);
            }
        }, 120000); // Check every 2 minutes
    }

    stopTokenRefreshMonitoring() {
        if (this.tokenRefreshInterval) {
            clearInterval(this.tokenRefreshInterval);
            this.tokenRefreshInterval = null;
        }
    }

    // Utility methods
    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    generateNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    getApiUrl() {
        // Helper function to get API URL with fallback
        if (typeof CONFIG !== 'undefined' && CONFIG.getApiUrl) {
            return CONFIG.getApiUrl();
        }
        // Fallback to localhost if CONFIG is not available
        return 'http://localhost:8000/api';
    }
} 