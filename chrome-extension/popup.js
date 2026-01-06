// 🔐 SUPER SIMPLE POPUP SCRIPT - JUST WORKS

// Global error handler to suppress non-critical extension errors
window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
        const message = event.error.message;
        // Suppress common extension errors that are not critical
        if (message.includes('bad client id') || 
            message.includes('Extension context invalidated') ||
            message.includes('Receiving end does not exist') ||
            message.includes('Could not establish connection')) {
        event.preventDefault(); // Prevent the error from showing in console
            event.stopPropagation(); // Stop the error from bubbling up
            return false; // Return false to prevent default behavior
        }
    }
});

// Also suppress unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message) {
        const message = event.reason.message;
        if (message.includes('Receiving end does not exist') ||
            message.includes('Could not establish connection') ||
            message.includes('Extension context invalidated')) {
            event.preventDefault(); // Prevent the error from showing in console
        }
    }
});

// Console error filtering removed

// CRITICAL FIX: Ensure background script is ready before any operations
async function ensureBackgroundScriptReady() {
    const maxAttempts = 10;
    const delay = 100; // 100ms between attempts
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                return true;
            }
        } catch (error) {
            // Silent retry
        }
        
        if (attempt < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    return false;
}

// CRITICAL FIX: Safe message sending with proper error handling
function safeSendMessage(message, callback) {
    // Check if extension context is still valid
    if (!chrome.runtime || !chrome.runtime.sendMessage) {
        if (callback) callback({ success: false, error: 'Extension context invalidated' });
        return;
    }
    
    // Add timeout to prevent hanging
    const timeout = setTimeout(() => {
        if (callback) callback({ success: false, error: 'Message timeout - background script not responding' });
    }, 5000); // 5 second timeout
    
    chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timeout);
        
        if (chrome.runtime.lastError) {
            // Don't show "receiving end does not exist" errors - they're normal
            if (!chrome.runtime.lastError.message.includes('Receiving end does not exist')) {
                // Extension message error
            }
            if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
            return;
        }
        if (callback) callback(response);
    });
}

document.addEventListener('DOMContentLoaded', async () => {

    // Wait for config to be available
    let configLoadAttempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds
    
    while (!window.CONFIG && configLoadAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        configLoadAttempts++;
    }
    
    if (window.CONFIG) {
    } else {
        // Using fallback config
        // Create fallback config
        window.CONFIG = {
            getApiUrl: () => 'http://localhost:8000'
        };
    }
    
    // Get elements
    const authSection = document.getElementById('auth-section');
    const nameSection = document.getElementById('name-section');
    const userSection = document.getElementById('user-section');
    const statsSection = document.getElementById('stats-section');
    const actionsSection = document.getElementById('actions-section');
    const loginBtn = document.getElementById('login-btn');
    const nameInput = document.getElementById('name-input');
    const saveNameBtn = document.getElementById('save-name-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userNameSpan = document.getElementById('user-name');
    const userEmailSpan = document.getElementById('user-email');
    const userAvatarImg = document.getElementById('user-avatar');
    const enhancedCountSpan = document.getElementById('enhanced-count');

    // Seed count immediately to avoid 0→N blink
    if (enhancedCountSpan) {
        enhancedCountSpan.textContent = '—';
        
        // Add click handler to refresh count manually
        enhancedCountSpan.style.cursor = 'pointer';
        enhancedCountSpan.title = 'Click to refresh count';
        enhancedCountSpan.addEventListener('click', () => {

            let userEmail = '';
            
            // Try to get email from popup display first (most reliable)
            if (userEmailSpan && userEmailSpan.textContent) {
                userEmail = userEmailSpan.textContent.trim();

            }
            
            // Fallback: try storage
            if (!userEmail) {
                try {
                    chrome.storage.local.get(['user_info'], (data) => {
                        userEmail = data.user_info?.email || '';
                        
                        if (userEmail) {
                            enhancedCountSpan.textContent = '...';
                            fetchEnhancedCount(userEmail);
                        } else {

                        }
                    });
                } catch (storageError) {

                }
            }
            
            if (userEmail) {
                enhancedCountSpan.textContent = '...';
                fetchEnhancedCount(userEmail);
            } else {

            }
        });
        
        try {
            chrome.storage.local.get(['last_known_prompt_count'], (res) => {
                if (typeof res.last_known_prompt_count === 'number') {
                    enhancedCountSpan.textContent = res.last_known_prompt_count;
                }
            });
        } catch (e) {
            // ignore
        }
    }

    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');

    // Check if already logged in
    checkLogin();

    // Login button click
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {

            // Show loading state
            if (loginText) loginText.classList.add('hidden');
            if (loginLoading) loginLoading.classList.remove('hidden');
            loginBtn.disabled = true;
            
            login();
        });
    }

    // Save name button click
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', () => {

            saveName();
        });
    }

    // Logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {

            logout();
        });
    }

    // Toggle button click (Start/Stop functionality)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {

            toggleExtension();
        });
    }

    // Enter key on name input
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                saveName();
            }
        });
    }

    // Check login status
    function checkLogin() {
        
        chrome.runtime.sendMessage({ action: 'check_login' }, (response) => {

            if (response && response.loggedIn) {
                
                // Check if user has name in local storage first
                if (response.userInfo && response.userInfo.name) {
                    showUserDashboard(response.userInfo);
                    // Also fetch current count for already logged in user
                    if (response.userInfo.email) {
                        fetchEnhancedCount(response.userInfo.email);
                    }
                } else {
                    // Check database for existing name
                    checkUserInDatabase(response.userInfo);
                }
            } else {
                showAuthSection();
            }
        });
    }

    // Check if user exists in database with name
    function checkUserInDatabase(userInfo) {
        if (!userInfo || !userInfo.email) {
            showNameInput();
            return;
        }

        
        const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
        fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(userInfo.email)}`)
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            })
            .then(userData => {
                // Database user data loaded
                
                if (userData && userData.name && userData.name !== 'User') {
                    // Update local storage with the name from database
                    const updatedUserInfo = { ...userInfo, name: userData.name };
                    chrome.storage.local.set({ user_info: updatedUserInfo }, () => {
                        showUserDashboard(updatedUserInfo);
                        fetchEnhancedCount(userInfo.email);
                    });
                } else {
                    showNameInput();
                }
            })
            .catch(error => {
                // Error checking database
                showNameInput();
            });
    }

    // Login function
    function login() {
        
        chrome.runtime.sendMessage({ action: 'login' }, (response) => {
            
            // Reset login button state
            if (loginText) loginText.classList.remove('hidden');
            if (loginLoading) loginLoading.classList.add('hidden');
            if (loginBtn) loginBtn.disabled = false;
            
            if (chrome.runtime.lastError) {
                showError('Extension connection error. Please refresh and try again.');
                return;
            }
            
            if (response && response.success) {
                
                if (response.needsName) {
                    showNameInput();
                } else {
                    showUserDashboard(response.userInfo);
                }
            } else {
                // Show error message to user
                showError('Login failed. Please try again.');
            }
        });
    }

    // Logout function
    function logout() {
        chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
            if (chrome.runtime.lastError) {
                // Still show auth section even if logout fails
                showAuthSection();
                return;
            }
            
            if (response && response.success) {

                showAuthSection();
            }
        });
    }

    // Show login section
    function showLogin() {

        if (loginSection) loginSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        hideError();
    }

    // Save name function
    function saveName() {
        const displayName = nameInput.value.trim();
        
        if (!displayName) {
            return;
        }


        // Store the name and update database
        chrome.storage.local.get(['user_info'], (data) => {
            const userInfo = { ...data.user_info, name: displayName };
            
            // First update local storage
            chrome.storage.local.set({ user_info: userInfo }, () => {

                // Then update user in database
                const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                fetch(`${apiUrl}/api/v1/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: userInfo.email,
                        name: displayName
                    })
                }).then(response => {
                    if (response.ok) {
                    } else {
                        // Failed to save name to database
                    }
                    showUserDashboard(userInfo);
                }).catch(error => {
                    // Error saving name to database
                    // Still show dashboard even if database save fails
                    showUserDashboard(userInfo);
                });
            });
        });
    }

    // Show name section
    function showNameSection() {

        if (loginSection) loginSection.style.display = 'none';
        if (nameSection) nameSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        if (nameInput) nameInput.focus();
        hideError();
    }

    // Show logged in section
    function showLoggedIn(userInfo) {

        if (loginSection) loginSection.style.display = 'none';
        if (nameSection) nameSection.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'block';
        
        if (userNameSpan && userInfo) {
            userNameSpan.textContent = userInfo.name || userInfo.email || 'User';
        }
        hideError();
    }

    // Error handling function
    function showError(message) {
        // Error occurred - silent handling
        // Error handled silently
    }

    // Update functions for new UI
    function showAuthSection() {
        if (authSection) authSection.classList.remove('hidden');
        if (nameSection) nameSection.classList.add('hidden');
        if (userSection) userSection.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        if (actionsSection) actionsSection.classList.add('hidden');
        
        // Reset login button
        if (loginText) loginText.classList.remove('hidden');
        if (loginLoading) loginLoading.classList.add('hidden');
        if (loginBtn) loginBtn.disabled = false;
    }

    function showNameInput() {

        if (authSection) {
            authSection.classList.add('hidden');

        }
        if (nameSection) {
            nameSection.classList.remove('hidden');

        }
        if (userSection) userSection.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        if (actionsSection) actionsSection.classList.add('hidden');
        if (nameInput) {
            nameInput.focus();

        }
    }

    function showUserDashboard(userInfo) {
        if (authSection) authSection.classList.add('hidden');
        if (nameSection) nameSection.classList.add('hidden');
        if (userSection) userSection.classList.remove('hidden');
        if (statsSection) statsSection.classList.remove('hidden');
        if (actionsSection) actionsSection.classList.remove('hidden');
        
        // Add fade-in animation
        if (userSection) userSection.classList.add('fade-in');
        if (statsSection) statsSection.classList.add('fade-in');
        
        if (userInfo) {
            // Set user name
            if (userNameSpan) {
                userNameSpan.textContent = userInfo.name || 'User';
            }
            
            // Set user email
            if (userEmailSpan) {
                userEmailSpan.textContent = userInfo.email || '';
            }
            
            // Set user avatar
            if (userAvatarImg && userInfo.picture) {
                userAvatarImg.src = userInfo.picture;
            } else if (userAvatarImg) {
                // Create avatar with initials
                const initials = (userInfo.name || userInfo.email || 'U').charAt(0).toUpperCase();
                userAvatarImg.src = `https://via.placeholder.com/40x40/007AFF/FFFFFF?text=${initials}`;
            }
            
            // 💰 Payment system removed for free unlimited access
            
            // Seed count from local cache first (already seeded on load, but ensure latest)
            if (enhancedCountSpan) {
                try {
                    chrome.storage.local.get(['last_known_prompt_count'], (res) => {
                        if (typeof res.last_known_prompt_count === 'number') {
                            updateEnhancedCount(res.last_known_prompt_count);
                        }
                    });
                } catch (e) { /* ignore */ }
            }

            // Fetch real enhanced count from database and reconcile
            if (userInfo.email) {
                fetchEnhancedCount(userInfo.email);
                // 💳 Subscription status check removed (always free unlimited)
            }
        }

    // Initialize extension state
    checkExtensionState();
    
    // CRITICAL FIX: Ensure background script is ready before any operations
    ensureBackgroundScriptReady().then(() => {
        // Background script ready, popup initialized
    }).catch((error) => {
        // Background script not ready
    });
    
    // Listen for count updates from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'count_updated') {
            updateEnhancedCount(request.count);
            // Also update local storage to prevent future mismatches
            chrome.storage.local.set({ last_known_prompt_count: request.count });
        } else if (request.action === 'get_displayed_email') {
            // Get the displayed email from the popup
            const userEmailSpan = document.getElementById('user-email');
            const email = userEmailSpan ? userEmailSpan.textContent : '';

            sendResponse({ email: email });
        }
    });

    // NEW: React to storage changes when popup is open (real-time count updates)
    chrome.storage.onChanged.addListener((changes, area) => {
        try {
            if (area === 'local' && changes.last_known_prompt_count) {
                const newVal = changes.last_known_prompt_count.newValue;
                if (typeof newVal === 'number') {
                    updateEnhancedCount(newVal);
                }
            }
        } catch (_) { /* ignore */ }
    });
    
        // Show cached count first to avoid blink
        if (enhancedCountSpan) {
            // Try to get cached count from storage first
            chrome.storage.local.get(['last_known_prompt_count'], (data) => {
                if (data.last_known_prompt_count !== undefined) {
                    enhancedCountSpan.textContent = data.last_known_prompt_count;
                    enhancedCountSpan.style.color = ''; // Reset to default
                } else {
                    enhancedCountSpan.textContent = '0';
                }
            });
        }

        // Refresh count in background (no loading indicator)
        setTimeout(() => {
        
        let userEmail = '';
        
        // Try to get email from popup display first (most reliable)999999eirja9 
        if (userEmailSpan && userEmailSpan.textContent) {
            userEmail = userEmailSpan.textContent.trim();

        }
        
        // Fallback: try storage
        if (!userEmail) {
            try {
                chrome.storage.local.get(['user_info'], (data) => {

                    userEmail = data.user_info?.email || '';
                    
                    if (userEmail) {

                        fetchEnhancedCount(userEmail);
                    } else {

                    }
                });
            } catch (storageError) {

            }
        }
        
        if (userEmail) {

            fetchEnhancedCount(userEmail);
        } else {

        }
    }, 100); // Faster refresh
}

    // Fallback: periodic refresh while popup is open (every 5s)
    try {
        const periodicRefresh = setInterval(() => {
            try {
                chrome.storage.local.get(['last_known_prompt_count'], (data) => {
                    if (typeof data.last_known_prompt_count === 'number') {
                        updateEnhancedCount(data.last_known_prompt_count);
                    }
                });
            } catch (_) { /* ignore */ }
        }, 5000);

        // Clean up on unload
        window.addEventListener('unload', () => clearInterval(periodicRefresh));
    } catch (_) { /* ignore */ }

    // Update enhanced count
    function updateEnhancedCount(count) {
        if (enhancedCountSpan) {
            // Smooth transition - only update if different
            if (enhancedCountSpan.textContent !== count.toString()) {
                enhancedCountSpan.textContent = count || 0;
                enhancedCountSpan.style.color = ''; // Reset to default
            }
        }
    }

    // Fetch enhanced count from database
    async function fetchEnhancedCount(userEmail) {
        try {

            // Get API URL from config
            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';

            const fullUrl = `${apiUrl}/api/v1/users/${encodeURIComponent(userEmail)}`;

            // Add cache-busting parameter to force fresh data
            const cacheBustUrl = `${fullUrl}?t=${Date.now()}&force=${Math.random()}`;

            const response = await fetch(cacheBustUrl, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (response.ok) {
                const userData = await response.json();

                const count = userData.enhanced_prompts || 0;

                // Update display and storage
                updateEnhancedCount(count);
                chrome.storage.local.set({ last_known_prompt_count: count });

                // Reset color to normal
                if (enhancedCountSpan) {
                    enhancedCountSpan.style.color = ''; // Reset to default
                }
                
                return count;
            } else {

                const errorText = await response.text();

                // Fall back to last known count from local storage if available
                try {
                    const last = await new Promise((resolve) => chrome.storage.local.get(['last_known_prompt_count'], r => resolve(r.last_known_prompt_count || 0)));
                    updateEnhancedCount(last || 0);
                    return last || 0;
                } catch (e) {
                    updateEnhancedCount(0);
                    return 0;
                }
            }
        } catch (error) {

            try {
                const last = await new Promise((resolve) => chrome.storage.local.get(['last_known_prompt_count'], r => resolve(r.last_known_prompt_count || 0)));
                updateEnhancedCount(last || 0);
                return last || 0;
            } catch (e) {
                updateEnhancedCount(0);
                return 0;
            }
        }
    }

    // Toggle extension functionality
    let isExtensionActive = false;

    function toggleExtension() {

        if (isExtensionActive) {
            // Stop the extension
            stopExtension();
        } else {
            // Start the extension
            startExtension();
        }
    }

    function startExtension() {

        // Disable button temporarily
        toggleBtn.disabled = true;
        toggleText.textContent = 'Starting...';
        
        // Send message to content script to activate
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'activate' }, (response) => {

                    isExtensionActive = true;
                    updateToggleButton();

                    // Store state
                    chrome.storage.local.set({ 'extension_active': true });
                });
            }
        });
    }

    function stopExtension() {

        // Disable button temporarily
        toggleBtn.disabled = true;
        toggleText.textContent = 'Stopping...';
        
        // Send message to content script to deactivate
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivate' }, (response) => {

                    isExtensionActive = false;
                    updateToggleButton();

                    // Store state
                    chrome.storage.local.set({ 'extension_active': false });
                });
            }
        });
    }

    function updateToggleButton() {
        if (!toggleBtn || !toggleText) return;
        
        // Re-enable button
        toggleBtn.disabled = false;
        
        if (isExtensionActive) {
            // Show "Stop" state
            toggleBtn.classList.add('active');
            toggleText.textContent = 'Stop';
        } else {
            // Show "Start" state
            toggleBtn.classList.remove('active');
            toggleText.textContent = 'Start';
        }
    }

    function checkExtensionState() {
        // Check stored state
        chrome.storage.local.get(['extension_active'], (result) => {
            isExtensionActive = result.extension_active || false;
            updateToggleButton();

        });
    }

    // Override the old functions to use new UI
    const originalShowLogin = window.showLogin;
    window.showLogin = showAuthSection;
    
    const originalShowNameSection = window.showNameSection;
    window.showNameSection = showNameInput;
    
    const originalShowLoggedIn = window.showLoggedIn;
    window.showLoggedIn = showUserDashboard;
});

    // Payment system removed
    // Unlimited access for all users


// ====================================
// 🔄 ENHANCED USER DASHBOARD FUNCTION
// ====================================