// 🔐 SUPER SIMPLE BACKGROUND SCRIPT - JUST WORKS
console.log('🚀 Background script starting...');

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);

    if (request.action === 'login') {
        console.log('🔐 Starting login...');

        // Build OAuth URL to force Google account chooser every time
        const manifest = chrome.runtime.getManifest();
        const clientId = manifest?.oauth2?.client_id;
        const scopes = manifest?.oauth2?.scopes || [];
        const redirectUri = chrome.identity.getRedirectURL();

        const authBase = 'https://accounts.google.com/o/oauth2/v2/auth';
        const authUrl = `${authBase}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}&prompt=${encodeURIComponent('consent select_account')}&include_granted_scopes=true`;

        // Safety timeout so the UI never hangs forever
        const timeout = setTimeout(() => {
            console.error('❌ OAuth timeout - taking too long');
            sendResponse({ success: false, error: 'OAuth timeout. Please try again.' });
        }, 30000);

        console.log('🔗 Launching WebAuthFlow:', authUrl);
        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
                console.error('❌ WebAuthFlow error:', chrome.runtime.lastError.message);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            if (!responseUrl) {
                console.error('❌ No response URL returned from WebAuthFlow');
                sendResponse({ success: false, error: 'No response from OAuth flow' });
                return;
            }

            // Extract access_token from fragment: #access_token=...&token_type=Bearer&expires_in=...
            try {
                const fragment = responseUrl.split('#')[1] || '';
                const params = new URLSearchParams(fragment);
                const token = params.get('access_token');

                if (!token) {
                    console.error('❌ No access_token found in OAuth response');
                    sendResponse({ success: false, error: 'No access token received' });
                    return;
                }

                console.log('✅ Token received from WebAuthFlow');

                // Get user info from Google
                const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch user info (${response.status})`);
                }
                const userInfo = await response.json();
                console.log('👤 User info:', userInfo);

                // Store in chrome storage
                chrome.storage.local.set({ auth_token: token, user_info: userInfo }, () => {
                    console.log('✅ Data stored successfully');

                    // Try to store user in backend (best-effort)
                    fetch('http://localhost:8000/api/v1/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userInfo.email, name: userInfo.name || userInfo.email }),
                    }).catch((err) => console.warn('⚠️ Storing user in DB failed (non-blocking):', err?.message));

                    // After OAuth always ask for display name in the popup
                    console.log('📤 Sending login response:', { success: true, userInfo, needsName: true });
                    sendResponse({ success: true, userInfo, needsName: true });
                    
                                    // Don't auto-activate - wait for user to click Start button
                });
            } catch (e) {
                console.error('❌ OAuth handling error:', e);
                sendResponse({ success: false, error: e?.message || 'OAuth failed' });
            }
        });

        return true; // Keep message channel open
    }

    if (request.action === 'check_login') {
        chrome.storage.local.get(['auth_token', 'user_info'], (data) => {
            if (data.auth_token && data.user_info) {
                sendResponse({ loggedIn: true, userInfo: data.user_info });
                // Don't auto-activate - wait for user to click Start button
            } else {
                sendResponse({ loggedIn: false });
            }
        });
        return true;
    }

    if (request.action === 'logout') {
        // Best-effort revoke and clear
        chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (token) {
                chrome.identity.removeCachedAuthToken({ token }, () => console.log('🗑️ Revoked OAuth token'));
            }
            chrome.storage.local.clear(() => {
                console.log('✅ Logged out - cleared everything');
                sendResponse({ success: true });
            });
        });
        return true;
    }
});

// Function to activate content script on all tabs
async function activateContentScript() {
    try {
        const tabs = await chrome.tabs.query({});
        const targetUrls = [
            'https://chat.openai.com',
            'https://chatgpt.com',
            'https://claude.ai',
            'https://gemini.google.com',
            'https://perplexity.ai',
            'https://poe.com'
        ];
        
        for (const tab of tabs) {
            if (tab.url && targetUrls.some(url => tab.url.startsWith(url))) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'activate' });
                    console.log('✅ Activated content script on tab:', tab.url);
    } catch (error) {
                    console.log('⚠️ Could not activate content script on tab:', tab.url, error.message);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error activating content scripts:', error);
    }
}

console.log('✅ Background script ready!');