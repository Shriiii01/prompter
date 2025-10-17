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
            // Error checking login status
            return { status: 'error', error: error.message };
        }
    }

    async handleLogin() {
        try {

            // Check if we have an expired token that can be refreshed
            const tokenStatus = await this.checkTokenExpiry();
            if (tokenStatus.reason === 'expired') {
                // Attempting to refresh expired token
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
            // Login error
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
                // Cleared local data on logout
            });
            
            return { status: 'logged_out' };
        } catch (error) {
            // Logout error
            throw error;
        }
    }

    async launchOAuthFlow() {
        return new Promise((resolve, reject) => {
            // Client ID and scopes initialized
            
            // First try the simpler getAuthToken method
            chrome.identity.getAuthToken({
                interactive: true
            }, (token) => {
                // OAuth callback received
                
                if (chrome.runtime.lastError) {
                    // Check if it's the common "bad client id" error that doesn't affect functionality
                    const errorMessage = chrome.runtime.lastError.message || '';
                    if (errorMessage.includes('bad client id')) {
                        // OAuth client ID warning (auth may still work)
                    } else {
                        // Chrome runtime error
                    }
                    
                    // If getAuthToken fails, try launchWebAuthFlow as fallback
                    // Trying launchWebAuthFlow as fallback
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

        // Launching WebAuthFlow

        chrome.identity.launchWebAuthFlow({
            url: authURL,
            interactive: true
        }, (responseUrl) => {
            if (chrome.runtime.lastError) {
                const errorMessage = chrome.runtime.lastError.message || '';
                if (errorMessage.includes('bad client id')) {
                    // WebAuthFlow client ID warning (auth may still work)
                } else {
                    // WebAuthFlow error
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
                // No token found in WebAuthFlow response
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
            // Error fetching user info
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
            // Error checking token expiry
            return { valid: false, reason: 'error' };
        }
    }

    async refreshToken() {
        try {
            // Starting token refresh
            
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
            // Token refresh failed
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
                // Token will expire naturally
            }
        } catch (error) {
            // Error revoking token
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
                // Different user detected, clearing cached data
                await new Promise(resolve => {
                    chrome.storage.local.remove([
                        'last_known_prompt_count',
                        'user_info',
                        'cached_subscription_status'
                    ], resolve);
                });
                // Cached data cleared for new user
            }
            
            // Attempting to store user data securely
            const tokenStored = await this.secureStorage.setEncrypted('google_token', token);
            const userInfoStored = await this.secureStorage.setEncrypted('user_info', userInfo);
            
            // Token and user info stored securely
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            // Failed to store user data securely, falling back to plain storage
            
            // CRITICAL FIX: Also clear cache in fallback mode
            const existingData = await new Promise(resolve => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            
            const oldEmail = existingData.user_info?.email;
            const newEmail = userInfo.email;
            
            if (oldEmail && oldEmail !== newEmail) {
                // Different user detected in fallback, clearing cached data
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
            // Attempting to store token securely
            const stored = await this.secureStorage.setEncrypted('google_token', token);
            // Token stored securely
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            // Failed to store token securely, falling back to plain storage
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
            // Attempting to get encrypted token
            const token = await this.secureStorage.getEncrypted('google_token');
            // Token retrieved securely
            return token;
        } catch (error) {
            // Failed to get encrypted token, falling back to plain storage
            return new Promise((resolve) => {
                chrome.storage.local.get(['google_token'], (result) => {
                    resolve(result.google_token || null);
                });
            });
        }
    }

    async getStoredUserInfo() {
        try {
            // Attempting to get encrypted user info
            const userInfo = await this.secureStorage.getEncrypted('user_info');
            // User info retrieved securely
            return userInfo;
        } catch (error) {
            // Failed to get encrypted user info, falling back to plain storage
            return new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], (result) => {
                    resolve(result.user_info || null);
                });
            });
        }
    }

    async storeUserInfo(userInfo) {
        try {
            // Storing user info securely
            const stored = await this.secureStorage.setEncrypted('user_info', userInfo);
            // User info stored securely
            
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    'user_info': userInfo,
                    'login_time': Date.now()
                }, resolve);
            });
        } catch (error) {
            // Failed to store user info securely, falling back to plain storage
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
            // Attempting to clear encrypted data
            await this.secureStorage.removeEncrypted('google_token');
            await this.secureStorage.removeEncrypted('user_info');
            // Encrypted data cleared successfully
            
            return new Promise((resolve) => {
                chrome.storage.local.remove(['login_time'], resolve);
            });
        } catch (error) {
            // Failed to clear encrypted data, falling back to plain storage clearing
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
                // Error in token refresh monitoring
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