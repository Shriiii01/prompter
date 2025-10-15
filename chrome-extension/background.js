// 🔐 SUPER SIMPLE BACKGROUND SCRIPT - JUST WORKS

// Global error handler to suppress non-critical OAuth errors
window.addEventListener('error', (event) => {
    if (event.error && event.error.message && event.error.message.includes('bad client id')) {
        console.warn('⚠️ OAuth client ID warning suppressed (auth functionality not affected)');
        event.preventDefault(); // Prevent the error from showing in console
    }
});

// Ensure background script is running
chrome.runtime.onStartup.addListener(() => {

});

chrome.runtime.onInstalled.addListener(() => {

});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // Ping test for background script
    if (request.action === 'ping') {

        sendResponse({ success: true, message: 'Background script is running' });
        return true;
    }

    if (request.action === 'login') {

        // Build OAuth URL to force Google account chooser every time
        const manifest = chrome.runtime.getManifest();
        const clientId = manifest?.oauth2?.client_id;
        const scopes = manifest?.oauth2?.scopes || [];
        const redirectUri = chrome.identity.getRedirectURL();

        const authBase = 'https://accounts.google.com/o/oauth2/v2/auth';
        const authUrl = `${authBase}?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scopes.join(' '))}&prompt=${encodeURIComponent('consent select_account')}&include_granted_scopes=true`;

        // Safety timeout so the UI never hangs forever
        const timeout = setTimeout(() => {

            sendResponse({ success: false, error: 'OAuth timeout. Please try again.' });
        }, 30000);

        chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (responseUrl) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {

                sendResponse({ success: false, error: chrome.runtime.lastError.message });
                return;
            }

            if (!responseUrl) {

                sendResponse({ success: false, error: 'No response from OAuth flow' });
                return;
            }

            // Extract access_token from fragment: #access_token=...&token_type=Bearer&expires_in=...
            try {
                const fragment = responseUrl.split('#')[1] || '';
                const params = new URLSearchParams(fragment);
                const token = params.get('access_token');

                if (!token) {

                    sendResponse({ success: false, error: 'No access token received' });
                    return;
                }

                // Get user info from Google
                const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch user info (${response.status})`);
                }
                const userInfo = await response.json();

                // Store in chrome storage
                chrome.storage.local.set({ auth_token: token, user_info: userInfo }, () => {

                    // Ensure user exists in database

                    const apiUrl = 'https://prompter-production-76a3.up.railway.app'; // Production Railway URL
                    fetch(`${apiUrl}/api/v1/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userInfo.email, name: userInfo.name || userInfo.email }),
                    })
                    .then(response => {
                        if (response.ok) {

                        } else {

                        }
                    })
                    .catch((err) => {

                        // Try alternative endpoint if main fails

                    });

                    // After OAuth always ask for display name in the popup

                    sendResponse({ success: true, userInfo, needsName: true });

                    //  Seamless Login Flow: Re-open the popup to show the dashboard
                    // This creates a smooth transition for the user after login.
                    chrome.action.openPopup();
                    
                                    // Don't auto-activate - wait for user to click Start button
                });
            } catch (e) {

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
                chrome.identity.removeCachedAuthToken({ token }, () => console.log(' Revoked OAuth token'));
            }
            chrome.storage.local.clear(() => {

                sendResponse({ success: true });
            });
        });
        return true;
    }

    // Stream enhancement in real-time (no fake animation)

    if (request.action === 'stream_enhance') {

        (async () => {
            try {
                const { apiUrl, prompt, targetModel, userEmail, platform, idempotencyKey } = request;
                const tabId = sender?.tab?.id || 0;

                // CRITICAL SAFETY: Verify this is the currently logged-in user
                const currentUserData = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_info'], resolve);
                });
                
                const currentUserEmail = currentUserData.user_info?.email;
                if (currentUserEmail && currentUserEmail !== userEmail) {
                    console.warn('🚨 SECURITY: Attempted to enhance prompt for different user!', {
                        requested: userEmail,
                        current: currentUserEmail
                    });
                    
                    // Send security violation message to content script
                    chrome.tabs.sendMessage(tabId, {
                        action: 'stream_chunk',
                        chunk: { type: 'error', data: 'Security violation: User mismatch detected' }
                    });
                    return;
                }

                // Store the requesting tab ID globally so we can respond to it later
                // This fixes cross-tab switching issues
                globalThis.activeEnhancementTabId = tabId;

                //  CRITICAL MONEY PROTECTION: Backend double-check before making expensive API calls
                if (userEmail) {
                    try {
                        // Quick check of user status before proceeding
                        const statusCheck = await fetch(`${apiUrl}/api/v1/payment/subscription-status/${encodeURIComponent(userEmail)}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });

                        if (statusCheck.ok) {
                            const userStatus = await statusCheck.json();
                            const dailyUsed = userStatus.daily_prompts_used || 0;
                            const dailyLimit = userStatus.daily_limit || 10;
                            const userTier = userStatus.subscription_tier || 'free';

                            //  EMERGENCY BACKEND BLOCK: If user has used 9+ of 10 prompts, block API call
                            if (userTier === 'free' && dailyUsed >= 9) {
                                console.error(` BACKEND BLOCK: Free user ${userEmail} at ${dailyUsed}/${dailyLimit} prompts - BLOCKING API CALL!`);

                                const targetTabId = globalThis.activeEnhancementTabId || tabId;
                                chrome.tabs.sendMessage(targetTabId, {
                                    action: 'limit_reached',
                                    details: {
                                        user_email: userEmail,
                                        daily_prompts_used: dailyUsed,
                                        daily_limit: dailyLimit,
                                        subscription_tier: userTier
                                    }
                                });
                                return;
                            }

                        } else {
                        }
                    } catch (statusError) {
                        console.error('Backend status check failed:', statusError);
                        // Continue with request even if check fails (don't block due to network issues)
                    }
                }

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000); // Longer timeout for streaming


                const res = await fetch(`${apiUrl}/api/stream-enhance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': userEmail || '',
                        'X-Idempotency-Key': idempotencyKey || `${Date.now()}-${Math.random()}`,
                        'X-Platform': (platform || '').toLowerCase(),
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache'
                    },
                    body: JSON.stringify({ 
                        prompt, 
                        target_model: targetModel || 'auto' 
                    }),
                    signal: controller.signal
                });


                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    sendResponse({ success: false, error: `Stream API ${res.status}: ${txt}` });
                    return;
                }

                // Read the stream
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {

                            break;
                        }

                        // Decode chunk and add to buffer
                        buffer += decoder.decode(value, { stream: true });
                        
                        // Process complete lines
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const dataStr = line.slice(6); // Remove 'data: '
                                
                                if (dataStr === '[DONE]') {

                                    // Send completion signal to content script
                                    // Use stored tab ID to handle cross-tab switching
                                    const targetTabId = globalThis.activeEnhancementTabId || tabId;
                                    chrome.tabs.sendMessage(targetTabId, {
                                        action: 'stream_complete'
                                    });
                                    break;
                                }

                                try {
                                    const chunk = JSON.parse(dataStr);

                                    // Handle count update separately
                                    if (chunk.type === 'count_update') {

                                        // Update local storage with new count
                                        chrome.storage.local.set({ last_known_prompt_count: chunk.data });
                                        // Also send to popup if it's open
                                        chrome.runtime.sendMessage({
                                            action: 'count_updated',
                                            count: chunk.data
                                        }).catch(() => {}); // Ignore if no popup listener
                                    }
                                    
                                    // Handle limit reached
                                    if (chunk.type === 'limit_reached') {
                                        // Use stored tab ID to handle cross-tab switching
                                        const targetTabId = globalThis.activeEnhancementTabId || tabId;
                                        chrome.tabs.sendMessage(targetTabId, {
                                            action: 'limit_reached',
                                            details: {
                                                user_email: userEmail,
                                                daily_prompts_used: chunk.data?.daily_prompts_used || 10,
                                                daily_limit: chunk.data?.daily_limit || 10,
                                                subscription_tier: chunk.data?.subscription_tier || 'free'
                                            }
                                        });
                                        return; // Stop processing stream
                                    }

                                    // Forward chunk to content script immediately (but skip count updates)
                                    // Use stored tab ID to handle cross-tab switching
                                    if (chunk.type !== 'count_update') {
                                        const targetTabId = globalThis.activeEnhancementTabId || tabId;
                                        chrome.tabs.sendMessage(targetTabId, {
                                            action: 'stream_chunk',
                                            chunk: chunk
                                        });
                                    }
                                    
                                } catch (parseError) {

                                }
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                    clearTimeout(timeout);
                }

                sendResponse({ success: true, message: 'Stream completed' });

            } catch (e) {

                sendResponse({ success: false, error: e?.message || 'Stream enhance failed' });
            }
        })();
        return true; // Keep channel open for async response
    }

    // Open popup for login when user needs to authenticate
    if (request.action === 'open_popup_for_login') {
        chrome.action.openPopup().catch((error) => {
            console.error('Failed to open popup:', error);
        });
        sendResponse({ success: true });
        return true;
    }

    // Get user email from popup
    if (request.action === 'get_user_email') {

        try {
            // ALWAYS get from popup display first (most reliable)
            chrome.runtime.sendMessage({action: 'get_displayed_email'}, (response) => {
                let email = '';

                if (response && response.email) {
                    email = response.email;

                } else {

                    // Fallback to storage
                    chrome.storage.local.get(['user_info'], (data) => {
                        email = data.user_info?.email || '';

                    });
                }

                sendResponse({ email: email });
            });
        } catch (error) {

            sendResponse({ email: '' });
        }
        return true;
    }

    // Simple count increment
    if (request.action === 'increment_count') {

        (async () => {
            try {
                // CRITICAL SAFETY: Verify this is the currently logged-in user
                const currentUserData = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_info'], resolve);
                });
                
                const currentUserEmail = currentUserData.user_info?.email;
                if (currentUserEmail && currentUserEmail !== request.userEmail) {
                    console.warn('🚨 SECURITY: Attempted to increment count for different user!', {
                        requested: request.userEmail,
                        current: currentUserEmail
                    });
                    sendResponse({ success: false, error: 'User mismatch - security violation' });
                    return;
                }

                const apiUrl = 'https://prompter-production-76a3.up.railway.app'; // Production Railway URL

                // FIRST: Check current user status to avoid unnecessary API calls

                const userCheckRes = await fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(request.userEmail)}`, {
                    method: 'GET',
                    headers: {
                        'Cache-Control': 'no-cache'
                    }
                });

                if (userCheckRes.ok) {
                    const userData = await userCheckRes.json();
                    const currentCount = userData.enhanced_prompts || 0;
                    const userTier = userData.subscription_tier || 'free';

                    // If free user has already reached limit, don't increment
                    if (userTier === 'free' && currentCount >= 10) {

                        return; // Don't make the increment call
                    }
                } else {

                }

                const res = await fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(request.userEmail)}/increment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();

                    // Update storage and notify popup
                    chrome.storage.local.set({ last_known_prompt_count: data.enhanced_prompts });
                    chrome.runtime.sendMessage({
                        action: 'count_updated',
                        count: data.enhanced_prompts
                    }).catch(() => {});
                }
            } catch (e) {

            }
        })();
        
        return true;
    }

    // Fallback to old non-streaming method for compatibility
    if (request.action === 'enhance_prompt') {

        (async () => {
            try {
                const { apiUrl, prompt, targetModel, userEmail, platform, idempotencyKey } = request;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);

                const res = await fetch(`${apiUrl}/api/v1/enhance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-Email': userEmail || '',
                        'X-Idempotency-Key': idempotencyKey || `${Date.now()}-${Math.random()}`,
                        'X-Platform': (platform || '').toLowerCase()
                    },
                    body: JSON.stringify({ prompt, target_model: targetModel || 'auto' }),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    sendResponse({ success: false, error: `API ${res.status}: ${txt}` });
                    return;
                }

                const data = await res.json();

                // Update count in storage and notify popup
                try {
                    if (typeof data.user_prompt_count === 'number') {

                        chrome.storage.local.set({ last_known_prompt_count: data.user_prompt_count });
                        
                        // Notify popup to refresh count

                        chrome.runtime.sendMessage({
                            action: 'count_updated',
                            count: data.user_prompt_count
                        }).catch(() => {}); // Ignore if popup is closed
                    } else {

                    }
                } catch (e) {

                }

                sendResponse({ success: true, enhanced_prompt: data.enhanced_prompt, data });
            } catch (e) {
                sendResponse({ success: false, error: e?.message || 'Enhance failed' });
            }
        })();
        return true; // Keep channel open for async response
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
            'https://meta.ai',
            'https://poe.com'
        ];
        
        for (const tab of tabs) {
            if (tab.url && targetUrls.some(url => tab.url.startsWith(url))) {
                try {
                    await chrome.tabs.sendMessage(tab.id, { action: 'activate' });

    } catch (error) {

                }
            }
        }
    } catch (error) {

    }
}
