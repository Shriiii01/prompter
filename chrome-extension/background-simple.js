// 🔧 SIMPLE BACKGROUND SCRIPT - NO OAUTH2 ISSUES

chrome.runtime.onInstalled.addListener(() => {
    console.log('✅ Extension installed/updated');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Background received message:', request.action);

    // Ping test for background script
    if (request.action === 'ping') {
        sendResponse({ success: true, message: 'Background script is running' });
        return true;
    }

    if (request.action === 'login') {
        // Simple demo authentication (no OAuth2)
        const userEmail = request.email || 'demo@example.com';
        const userName = request.name || 'Demo User';
        
        // Create mock user info
        const userInfo = {
            email: userEmail,
            name: userName,
            picture: '',
            email_verified: true
        };

        // Store in chrome storage
        chrome.storage.local.set({ 
            auth_token: 'demo_token_' + Date.now(), 
            user_info: userInfo 
        }, () => {
            console.log('✅ User logged in:', userInfo.email);
            
            // Try to create user in database (optional)
            const apiUrl = 'http://localhost:8000';
            fetch(`${apiUrl}/api/v1/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userInfo.email, name: userInfo.name }),
            })
            .then(response => {
                if (response.ok) {
                    console.log('✅ User created in database');
                } else {
                    console.log('⚠️ User creation failed, but continuing...');
                }
            })
            .catch(error => {
                console.log('⚠️ Database error, but continuing...', error);
            });

            sendResponse({ 
                success: true, 
                userInfo: userInfo
            });
        });

        return true; // Keep channel open for async response
    }

    if (request.action === 'check_login') {
        chrome.storage.local.get(['user_info'], (result) => {
            if (result.user_info) {
                sendResponse({ 
                    loggedIn: true, 
                    userInfo: result.user_info 
                });
            } else {
                sendResponse({ loggedIn: false });
            }
        });
        return true;
    }

    if (request.action === 'logout') {
        chrome.storage.local.clear(() => {
            console.log('✅ User logged out');
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'get_user_email') {
        chrome.storage.local.get(['user_info'], (result) => {
            sendResponse({ 
                email: result.user_info?.email || '' 
            });
        });
        return true;
    }

    // Simple count increment
    if (request.action === 'increment_count') {
        (async () => {
            try {
                const apiUrl = 'http://localhost:8000';

                // Get user info
                const userData = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_info'], resolve);
                });

                if (!userData.user_info?.email) {
                    sendResponse({ success: false, error: 'User not logged in' });
                    return;
                }

                const userEmail = userData.user_info.email;

                // Check current count first
                const userCheckRes = await fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(userEmail)}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (userCheckRes.ok) {
                    const userData = await userCheckRes.json();
                    const currentCount = userData.enhanced_prompts || 0;
                    const userTier = userData.subscription_tier || 'free';

                    // If free user has already reached limit, don't increment
                    if (userTier === 'free' && currentCount >= 10) {
                        console.log('⚠️ Free user limit reached, not incrementing');
                        sendResponse({ success: false, error: 'Daily limit reached' });
                        return;
                    }
                }

                // Increment count
                const incrementRes = await fetch(`${apiUrl}/api/v1/user/increment-count`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_email: userEmail })
                });

                if (incrementRes.ok) {
                    const result = await incrementRes.json();
                    console.log('✅ Count incremented:', result.new_count);
                    sendResponse({ success: true, newCount: result.new_count });
                } else {
                    console.log('⚠️ Count increment failed, but continuing...');
                    sendResponse({ success: true, newCount: 0 });
                }

            } catch (error) {
                console.log('⚠️ Count increment error, but continuing...', error);
                sendResponse({ success: true, newCount: 0 });
            }
        })();
        return true;
    }

    // Handle streaming requests
    if (request.action === 'stream_enhance') {
        (async () => {
            try {
                const apiUrl = 'http://localhost:8000';
                
                const response = await fetch(`${apiUrl}/api/v1/enhance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: request.prompt,
                        target_model: request.targetModel,
                        user_email: request.userEmail,
                        platform: request.platform
                    })
                });

                if (response.ok) {
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                try {
                                    const data = JSON.parse(line.slice(6));
                                    
                                    if (data.type === 'chunk') {
                                        chrome.tabs.sendMessage(sender.tab.id, {
                                            action: 'stream_chunk',
                                            chunk: data
                                        });
                                    } else if (data.type === 'complete') {
                                        chrome.tabs.sendMessage(sender.tab.id, {
                                            action: 'stream_complete',
                                            result: data
                                        });
                                    } else if (data.type === 'limit_reached') {
                                        chrome.tabs.sendMessage(sender.tab.id, {
                                            action: 'limit_reached'
                                        });
                                    }
                                } catch (e) {
                                    // Ignore parsing errors
                                }
                            }
                        }
                    }
                } else {
                    chrome.tabs.sendMessage(sender.tab.id, {
                        action: 'stream_error',
                        error: 'Enhancement failed'
                    });
                }

            } catch (error) {
                console.log('❌ Stream error:', error);
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: 'stream_error',
                    error: error.message
                });
            }
        })();
        return true;
    }

    return true;
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
                } catch (error) {
                    // Content script not available, that's okay
                }
            }
        }
    } catch (error) {
        console.log('⚠️ Error activating content scripts:', error);
    }
}

// Activate content scripts when extension starts
activateContentScript();
