// 🔍 Authentication Debugging Utility
// Include this file temporarily in popup.html during debugging
// Remove once authentication issues are resolved

class AuthDebugger {
    constructor() {
        this.debugContainer = null;
        this.logContainer = null;
        this.init();
    }

    init() {
        console.log('🔍 Auth Debugger initialized');
        this.createDebugUI();
        this.runDiagnostics();
    }

    createDebugUI() {
        // Create debug container
        this.debugContainer = document.createElement('div');
        this.debugContainer.id = 'auth-debug-container';
        this.debugContainer.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            max-height: 400px;
            background: #1a1a1a;
            border: 2px solid #ff6b6b;
            border-radius: 8px;
            padding: 10px;
            font-family: monospace;
            font-size: 11px;
            color: #fff;
            z-index: 10000;
            overflow-y: auto;
        `;

        // Create header
        const header = document.createElement('div');
        header.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="color: #ff6b6b;">🔍 Auth Debugger</strong>
                <button id="close-debug" style="background: #ff6b6b; color: white; border: none; padding: 2px 6px; border-radius: 3px; cursor: pointer;">×</button>
            </div>
        `;

        // Create log container
        this.logContainer = document.createElement('div');
        this.logContainer.id = 'debug-log';
        this.logContainer.style.cssText = `
            max-height: 300px;
            overflow-y: auto;
            background: #000;
            padding: 8px;
            border-radius: 4px;
            font-size: 10px;
            line-height: 1.3;
        `;

        // Create action buttons
        const actions = document.createElement('div');
        actions.style.cssText = `
            margin-top: 10px;
            display: flex;
            gap: 5px;
            flex-wrap: wrap;
        `;
        actions.innerHTML = `
            <button id="test-oauth" style="background: #4ecdc4; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">Test OAuth</button>
            <button id="test-storage" style="background: #45b7d1; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">Test Storage</button>
            <button id="clear-logs" style="background: #96ceb4; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">Clear Logs</button>
            <button id="export-logs" style="background: #feca57; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 10px;">Export</button>
        `;

        this.debugContainer.appendChild(header);
        this.debugContainer.appendChild(this.logContainer);
        this.debugContainer.appendChild(actions);

        // Add to page
        document.body.appendChild(this.debugContainer);

        // Bind events
        document.getElementById('close-debug').addEventListener('click', () => {
            this.debugContainer.remove();
        });

        document.getElementById('test-oauth').addEventListener('click', () => {
            this.testOAuthFlow();
        });

        document.getElementById('test-storage').addEventListener('click', () => {
            this.testSecureStorage();
        });

        document.getElementById('clear-logs').addEventListener('click', () => {
            this.clearLogs();
        });

        document.getElementById('export-logs').addEventListener('click', () => {
            this.exportLogs();
        });
    }

    log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const color = {
            info: '#4ecdc4',
            error: '#ff6b6b',
            warning: '#feca57',
            success: '#96ceb4'
        }[type] || '#4ecdc4';

        const logEntry = document.createElement('div');
        logEntry.style.cssText = `
            margin-bottom: 4px;
            color: ${color};
        `;
        logEntry.textContent = `[${timestamp}] ${message}`;

        this.logContainer.appendChild(logEntry);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Also log to console
        console.log(`🔍 [${type.toUpperCase()}] ${message}`);
    }

    clearLogs() {
        this.logContainer.innerHTML = '';
        this.log('Logs cleared', 'info');
    }

    exportLogs() {
        const logs = this.logContainer.textContent;
        const blob = new Blob([logs], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `auth-debug-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.log('Logs exported', 'success');
    }

    async runDiagnostics() {
        this.log('Starting authentication diagnostics...', 'info');
        
        // Test Chrome Identity API
        await this.testChromeIdentity();
        
        // Test SecureStorage
        await this.testSecureStorage();
        
        // Test OAuth Configuration
        await this.testOAuthConfig();
        
        // Test Extension Permissions
        await this.testPermissions();
        
        // Test Google Cloud Console Setup
        await this.testGoogleCloudSetup();
        
        this.log('Diagnostics completed', 'success');
    }

    async testChromeIdentity() {
        this.log('Testing Chrome Identity API...', 'info');
        
        try {
            if (typeof chrome === 'undefined' || !chrome.identity) {
                this.log('❌ Chrome identity API not available', 'error');
                return;
            }

            this.log('✅ Chrome identity API available', 'success');
            
            // Test getRedirectURL
            const redirectUrl = chrome.identity.getRedirectURL();
            this.log(`🔄 Redirect URL: ${redirectUrl}`, 'info');
            
            // Validate redirect URL format
            if (redirectUrl.includes('chromiumapp.org')) {
                this.log('✅ Redirect URL format is correct', 'success');
            } else {
                this.log('⚠️ Redirect URL format may be incorrect', 'warning');
            }
            
        } catch (error) {
            this.log(`❌ Chrome identity test failed: ${error.message}`, 'error');
        }
    }

    async testSecureStorage() {
        this.log('Testing SecureStorage...', 'info');
        
        try {
            if (typeof SecureStorage === 'undefined') {
                this.log('❌ SecureStorage class not available', 'error');
                return;
            }

            this.log('✅ SecureStorage class available', 'success');
            
            const storage = new SecureStorage();
            
            // Test device info
            const deviceInfo = await storage.getDeviceInfo();
            this.log(`📱 Device info: ${JSON.stringify(deviceInfo)}`, 'info');
            
            // Test encryption key generation
            const encryptionKey = await storage.getEncryptionKey();
            this.log(`🔑 Encryption key generated: ${encryptionKey ? 'Yes' : 'No'}`, 'info');
            
            // Test storage operations
            const testData = { test: 'data', timestamp: Date.now() };
            const stored = await storage.setEncrypted('debug_test', testData);
            this.log(`💾 Test data stored: ${stored}`, 'info');
            
            const retrieved = await storage.getEncrypted('debug_test');
            this.log(`📥 Test data retrieved: ${JSON.stringify(retrieved)}`, 'info');
            
            // Cleanup
            await storage.removeEncrypted('debug_test');
            this.log('🧹 Test data cleaned up', 'info');
            
        } catch (error) {
            this.log(`❌ SecureStorage test failed: ${error.message}`, 'error');
        }
    }

    async testOAuthConfig() {
        this.log('Testing OAuth Configuration...', 'info');
        
        try {
            // Check manifest configuration
            const manifest = chrome.runtime.getManifest();
            const oauth2 = manifest.oauth2;
            
            if (!oauth2) {
                this.log('❌ No OAuth2 configuration in manifest', 'error');
                return;
            }
            
            this.log(`✅ OAuth2 configured in manifest`, 'success');
            this.log(`🔑 Client ID: ${oauth2.client_id}`, 'info');
            this.log(`📋 Scopes: ${oauth2.scopes.join(', ')}`, 'info');
            
            // Validate client ID format
            if (oauth2.client_id.includes('.apps.googleusercontent.com')) {
                this.log('✅ Client ID format is correct', 'success');
            } else {
                this.log('⚠️ Client ID format may be incorrect', 'warning');
            }
            
            // Check required scopes
            const requiredScopes = ['openid', 'email', 'profile'];
            const missingScopes = requiredScopes.filter(scope => !oauth2.scopes.includes(scope));
            
            if (missingScopes.length === 0) {
                this.log('✅ All required scopes are configured', 'success');
            } else {
                this.log(`❌ Missing scopes: ${missingScopes.join(', ')}`, 'error');
            }
            
        } catch (error) {
            this.log(`❌ OAuth config test failed: ${error.message}`, 'error');
        }
    }

    async testPermissions() {
        this.log('Testing Extension Permissions...', 'info');
        
        try {
            const manifest = chrome.runtime.getManifest();
            const permissions = manifest.permissions || [];
            const hostPermissions = manifest.host_permissions || [];
            
            this.log(`📋 Permissions: ${permissions.join(', ')}`, 'info');
            this.log(`🌐 Host permissions: ${hostPermissions.join(', ')}`, 'info');
            
            // Check required permissions
            const requiredPermissions = ['identity', 'storage'];
            const missingPermissions = requiredPermissions.filter(perm => !permissions.includes(perm));
            
            if (missingPermissions.length === 0) {
                this.log('✅ All required permissions are granted', 'success');
            } else {
                this.log(`❌ Missing permissions: ${missingPermissions.join(', ')}`, 'error');
            }
            
        } catch (error) {
            this.log(`❌ Permissions test failed: ${error.message}`, 'error');
        }
    }

    async testGoogleCloudSetup() {
        this.log('Testing Google Cloud Console Setup...', 'info');
        
        try {
            const manifest = chrome.runtime.getManifest();
            const clientId = manifest.oauth2?.client_id;
            
            if (!clientId) {
                this.log('❌ No client ID found in manifest', 'error');
                return;
            }
            
            this.log('📋 Google Cloud Console Setup Checklist:', 'info');
            this.log('1. ✅ Client ID configured in manifest', 'success');
            this.log('2. ⚠️ Verify in Google Cloud Console:', 'warning');
            this.log('   - Go to https://console.cloud.google.com/', 'info');
            this.log('   - Navigate to APIs & Services > Credentials', 'info');
            this.log('   - Find OAuth 2.0 Client ID matching:', 'info');
            this.log(`   - ${clientId}`, 'info');
            this.log('3. ⚠️ Check Authorized redirect URIs:', 'warning');
            this.log('   - Should include: https://<extension-id>.chromiumapp.org/', 'info');
            this.log('4. ⚠️ Verify Application type is "Chrome Extension"', 'warning');
            this.log('5. ⚠️ Ensure Google Identity API is enabled', 'warning');
            
        } catch (error) {
            this.log(`❌ Google Cloud setup test failed: ${error.message}`, 'error');
        }
    }

    async testOAuthFlow() {
        this.log('Testing OAuth Flow...', 'info');
        
        try {
            const clientId = '20427090028-asq8b7s849pq95li1hkmc7vrq1qeertg.apps.googleusercontent.com';
            const scopes = ['openid', 'email', 'profile'];
            
            const authUrl = `https://accounts.google.com/o/oauth2/auth?` +
                `client_id=${clientId}&` +
                `response_type=token id_token&` +
                `scope=${scopes.join(' ')}&` +
                `redirect_uri=${chrome.identity.getRedirectURL()}&` +
                `state=${this.generateState()}&` +
                `nonce=${this.generateNonce()}`;

            this.log(`🌐 Auth URL: ${authUrl}`, 'info');
            
            // Note: This will actually launch the OAuth flow
            // Only use this for debugging when needed
            this.log('⚠️ This will launch the actual OAuth flow', 'warning');
            this.log('⚠️ Click "Test OAuth" again to proceed', 'warning');
            
            // Uncomment the following lines to actually test the OAuth flow
            /*
            chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            }, (redirectUrl) => {
                if (chrome.runtime.lastError) {
                    this.log(`❌ OAuth flow failed: ${chrome.runtime.lastError.message}`, 'error');
                    return;
                }
                
                if (!redirectUrl) {
                    this.log('❌ OAuth flow cancelled by user', 'error');
                    return;
                }
                
                this.log(`✅ OAuth flow successful: ${redirectUrl}`, 'success');
                
                // Parse the response
                try {
                    const url = new URL(redirectUrl);
                    const fragment = url.hash.substring(1);
                    const params = new URLSearchParams(fragment);
                    
                    this.log(`🔍 URL fragment: ${fragment}`, 'info');
                    this.log(`🔍 All params: ${JSON.stringify(Object.fromEntries(params.entries()))}`, 'info');
                    
                    const idToken = params.get('id_token');
                    const accessToken = params.get('access_token');
                    
                    if (idToken) {
                        this.log('✅ ID token received', 'success');
                    } else {
                        this.log('❌ No ID token received', 'error');
                    }
                    
                    if (accessToken) {
                        this.log('✅ Access token received', 'success');
                    } else {
                        this.log('❌ No access token received', 'error');
                    }
                    
                } catch (error) {
                    this.log(`❌ Error parsing OAuth response: ${error.message}`, 'error');
                }
            });
            */
            
        } catch (error) {
            this.log(`❌ OAuth flow test failed: ${error.message}`, 'error');
        }
    }

    generateState() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    generateNonce() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
}

// Auto-initialize when script is loaded
if (typeof window !== 'undefined') {
    window.AuthDebugger = AuthDebugger;
    
    // Auto-start debugger if in development mode
    if (window.location.hostname === 'localhost' || window.location.protocol === 'chrome-extension:') {
        document.addEventListener('DOMContentLoaded', () => {
            new AuthDebugger();
        });
    }
} else {
    console.warn('⚠️ Window object not available, skipping AuthDebugger setup');
} 