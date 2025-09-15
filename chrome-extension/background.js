// 🔐 SUPER SIMPLE BACKGROUND SCRIPT - JUST WORKS
console.log('🚀 Background script starting...');

// Ensure background script is running
chrome.runtime.onStartup.addListener(() => {
    console.log('🔄 Background script restarted on startup');
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('🔄 Background script installed/updated');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request.action);

    // Ping test for background script
    if (request.action === 'ping') {
        console.log('🏓 PING received - background script is responsive');
        sendResponse({ success: true, message: 'Background script is running' });
        return true;
    }

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

                    // Ensure user exists in database
                    console.log('👤 Creating/updating user in database:', userInfo.email);
                    const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                    fetch(`${apiUrl}/api/v1/users`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userInfo.email, name: userInfo.name || userInfo.email }),
                    })
                    .then(response => {
                        if (response.ok) {
                            console.log('✅ User successfully stored in database');
                        } else {
                            console.warn('⚠️ User storage response:', response.status);
                        }
                    })
                    .catch((err) => {
                        console.error('❌ Failed to store user in database:', err?.message);
                        // Try alternative endpoint if main fails
                        console.log('🔄 Trying alternative user creation...');
                    });

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


    // Stream enhancement in real-time (no fake animation)
    console.log('🔍 BACKGROUND: Received message:', request.action);
    if (request.action === 'stream_enhance') {
        console.log('🎯 STREAM_ENHANCE REQUEST RECEIVED!');
        (async () => {
            try {
                const { apiUrl, prompt, targetModel, userEmail, platform, idempotencyKey } = request;
                const tabId = sender?.tab?.id || 0;
                console.log('🎯 STREAM REQUEST from tab:', tabId, 'sender:', sender);
                console.log('📧 User email received:', userEmail);
                console.log('🔍 DEBUGGING BACKGROUND:');
                console.log('  - Email received:', JSON.stringify(userEmail));
                console.log('  - Email length:', userEmail?.length);
                console.log('  - Email type:', typeof userEmail);
                console.log('  - Email is empty?', !userEmail);
                console.log('📝 Prompt length:', prompt?.length || 0);
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 45000); // Longer timeout for streaming

                console.log('🚀 Starting SSE stream to:', `${apiUrl}/api/stream-enhance`);

                const res = await fetch(`${apiUrl}/api/stream-enhance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': userEmail || '',
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

                console.log('✅ SSE stream connected, reading chunks...');

                // Read the stream
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        
                        if (done) {
                            console.log('✅ SSE stream completed');
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
                                    console.log('🏁 Stream finished');
                                    // Send completion signal to content script
                                    console.log('📤 SENDING stream_complete to tab:', tabId);
                                    chrome.tabs.sendMessage(tabId, {
                                        action: 'stream_complete'
                                    });
                                    break;
                                }

                                try {
                                    const chunk = JSON.parse(dataStr);
                                    console.log('📦 Streaming chunk:', chunk.type, chunk.data?.substring(0, 50) + '...');
                                    
                                    // Handle count update separately
                                    if (chunk.type === 'count_update') {
                                        console.log('📊 Count update received:', chunk.data);
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
                                        console.log('🚫 Daily limit reached for user:', userEmail);
                                        chrome.tabs.sendMessage(tabId, {
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
                                    
                                    // Forward chunk to content script immediately
                                    console.log('📤 SENDING stream_chunk to tab:', tabId, 'chunk type:', chunk.type);
                                    chrome.tabs.sendMessage(tabId, {
                                        action: 'stream_chunk',
                                        chunk: chunk
                                    });
                                    
                                } catch (parseError) {
                                    console.warn('⚠️ Failed to parse SSE chunk:', dataStr);
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
                console.error('❌ Stream enhance error:', e);
                sendResponse({ success: false, error: e?.message || 'Stream enhance failed' });
            }
        })();
        return true; // Keep channel open for async response
    }

    // Get user email from popup
    if (request.action === 'get_user_email') {
        console.log('🔍 BACKGROUND: get_user_email request received');

        try {
            // ALWAYS get from popup display first (most reliable)
            chrome.runtime.sendMessage({action: 'get_displayed_email'}, (response) => {
                let email = '';

                if (response && response.email) {
                    email = response.email;
                    console.log('📧 BACKGROUND: Got email from popup:', email);
                } else {
                    console.log('❌ BACKGROUND: No email from popup, trying storage');
                    // Fallback to storage
                    chrome.storage.local.get(['user_info'], (data) => {
                        email = data.user_info?.email || '';
                        console.log('📧 BACKGROUND: Got email from storage:', email);
                    });
                }

                console.log('📤 BACKGROUND: Returning email:', email);
                sendResponse({ email: email });
            });
        } catch (error) {
            console.error('❌ BACKGROUND: Error getting user email:', error);
            sendResponse({ email: '' });
        }
        return true;
    }

    // Simple count increment
    if (request.action === 'increment_count') {
        console.log('📊 INCREMENT_COUNT REQUEST RECEIVED!');
        console.log('📧 User email:', request.userEmail);
        
        (async () => {
            try {
                const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                
                const res = await fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(request.userEmail)}/increment`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (res.ok) {
                    const data = await res.json();
                    console.log('✅ Count incremented to:', data.enhanced_prompts);
                    
                    // Update storage and notify popup
                    chrome.storage.local.set({ last_known_prompt_count: data.enhanced_prompts });
                    chrome.runtime.sendMessage({
                        action: 'count_updated',
                        count: data.enhanced_prompts
                    }).catch(() => {});
                }
            } catch (e) {
                console.error('❌ Failed to increment count:', e);
            }
        })();
        
        return true;
    }

    // Fallback to old non-streaming method for compatibility
    if (request.action === 'enhance_prompt') {
                console.log('🎯 ENHANCE_PROMPT REQUEST RECEIVED!');
        console.log('📧 User email:', request.userEmail);
        console.log('📝 Prompt:', request.prompt?.substring(0, 50) + '...');
        (async () => {
            try {
                const { apiUrl, prompt, targetModel, userEmail, platform, idempotencyKey } = request;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 30000);

                console.log('🚀 Making API call to:', `${apiUrl}/api/v1/enhance`);
                console.log('📧 Sending X-User-ID:', userEmail);
                
                const res = await fetch(`${apiUrl}/api/v1/enhance`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': userEmail || '',
                        'X-Idempotency-Key': idempotencyKey || `${Date.now()}-${Math.random()}`,
                        'X-Platform': (platform || '').toLowerCase()
                    },
                    body: JSON.stringify({ prompt, target_model: targetModel || 'auto' }),
                    signal: controller.signal
                });
                
                console.log('📡 API Response status:', res.status);
                clearTimeout(timeout);

                if (!res.ok) {
                    const txt = await res.text().catch(() => '');
                    sendResponse({ success: false, error: `API ${res.status}: ${txt}` });
                    return;
                }

                const data = await res.json();
                console.log('📊 API Response data:', data);
                console.log('📈 User prompt count from API:', data.user_prompt_count);

                // Update count in storage and notify popup
                try {
                    if (typeof data.user_prompt_count === 'number') {
                        console.log('✅ Updating count in storage:', data.user_prompt_count);
                        chrome.storage.local.set({ last_known_prompt_count: data.user_prompt_count });
                        
                        // Notify popup to refresh count
                        console.log('📤 Sending count_updated message to popup');
                        chrome.runtime.sendMessage({
                            action: 'count_updated',
                            count: data.user_prompt_count
                        }).catch(() => {}); // Ignore if popup is closed
                    } else {
                        console.error('❌ No user_prompt_count in response!');
                    }
                } catch (e) {
                    console.error('❌ Error updating count:', e);
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