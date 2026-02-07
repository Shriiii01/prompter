// PromptGrammerly Popup Script

// Suppress non-critical extension errors
window.addEventListener('error', (event) => {
    if (event.error?.message?.match(/Extension context|Receiving end|Could not establish/)) {
        event.preventDefault();
        event.stopPropagation();
    }
});
window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.match(/Receiving end|Could not establish|Extension context/)) {
        event.preventDefault();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for config to load (up to 2 seconds)
    let attempts = 0;
    while (!window.CONFIG && attempts < 20) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
    }
    if (!window.CONFIG) {
        window.CONFIG = { getApiUrl: () => 'http://localhost:8000' };
    }

    // ========================================
    // DOM Elements
    // ========================================
    const authSection = document.getElementById('auth-section');
    const nameSection = document.getElementById('name-section');
    const userSection = document.getElementById('user-section');
    const statsSection = document.getElementById('stats-section');
    const actionsSection = document.getElementById('actions-section');
    const loginBtn = document.getElementById('login-btn');
    const loginText = document.getElementById('login-text');
    const loginLoading = document.getElementById('login-loading');
    const nameInput = document.getElementById('name-input');
    const saveNameBtn = document.getElementById('save-name-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const toggleBtn = document.getElementById('toggle-btn');
    const toggleText = document.getElementById('toggle-text');
    const userNameSpan = document.getElementById('user-name');
    const userEmailSpan = document.getElementById('user-email');
    const userAvatarImg = document.getElementById('user-avatar');
    const enhancedCountSpan = document.getElementById('enhanced-count');

    let isExtensionActive = false;

    // ========================================
    // Seed count from cache to avoid blink
    // ========================================
    if (enhancedCountSpan) {
        enhancedCountSpan.textContent = '—';
        try {
            const cached = await new Promise(r => chrome.storage.local.get(['last_known_prompt_count'], r));
            if (typeof cached.last_known_prompt_count === 'number') {
                enhancedCountSpan.textContent = cached.last_known_prompt_count;
            }
        } catch {}
    }

    // ========================================
    // Event Listeners
    // ========================================
    loginBtn?.addEventListener('click', () => {
        if (loginText) loginText.classList.add('hidden');
        if (loginLoading) loginLoading.classList.remove('hidden');
        if (loginBtn) loginBtn.disabled = true;
        login();
    });

    saveNameBtn?.addEventListener('click', saveName);
    nameInput?.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveName(); });
    logoutBtn?.addEventListener('click', logout);
    toggleBtn?.addEventListener('click', toggleExtension);

    // Listen for real-time count updates from background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'count_updated') {
            updateCount(request.count);
        } else if (request.action === 'get_displayed_email') {
            sendResponse({ email: userEmailSpan?.textContent || '' });
        }
    });

    // React to storage changes (real-time count updates)
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.last_known_prompt_count) {
            const val = changes.last_known_prompt_count.newValue;
            if (typeof val === 'number') updateCount(val);
        }
    });

    // ========================================
    // Initialize
    // ========================================
    checkLogin();
    checkExtensionState();

    // ========================================
    // Auth Functions
    // ========================================
    function checkLogin() {
        chrome.runtime.sendMessage({ action: 'check_login' }, (response) => {
            if (response?.loggedIn && response.userInfo) {
                if (response.userInfo.name) {
                    showDashboard(response.userInfo);
                } else {
                    checkUserInDatabase(response.userInfo);
                }
            } else {
                showAuth();
            }
        });
    }

    function checkUserInDatabase(userInfo) {
        if (!userInfo?.email) { showNameInput(); return; }

        const apiUrl = window.CONFIG.getApiUrl();
        fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(userInfo.email)}`)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(userData => {
                if (userData?.name && userData.name !== 'User') {
                    const updated = { ...userInfo, name: userData.name };
                    chrome.storage.local.set({ user_info: updated }, () => {
                        showDashboard(updated);
                    });
                } else {
                    showNameInput();
                }
            })
            .catch(() => showNameInput());
    }

    function login() {
        chrome.runtime.sendMessage({ action: 'login' }, (response) => {
            // Reset button state
            if (loginText) loginText.classList.remove('hidden');
            if (loginLoading) loginLoading.classList.add('hidden');
            if (loginBtn) loginBtn.disabled = false;

            if (chrome.runtime.lastError) return;

            if (response?.success) {
                response.needsName ? showNameInput() : showDashboard(response.userInfo);
            }
        });
    }

    function logout() {
        chrome.runtime.sendMessage({ action: 'logout' }, () => showAuth());
    }

    function saveName() {
        const displayName = nameInput?.value?.trim();
        if (!displayName) return;

        chrome.storage.local.get(['user_info'], (data) => {
            const userInfo = { ...data.user_info, name: displayName };
            chrome.storage.local.set({ user_info: userInfo }, () => {
                const apiUrl = window.CONFIG.getApiUrl();
                fetch(`${apiUrl}/api/v1/users`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: userInfo.email, name: displayName })
                }).finally(() => showDashboard(userInfo));
            });
        });
    }

    // ========================================
    // UI State Functions
    // ========================================
    function showAuth() {
        authSection?.classList.remove('hidden');
        nameSection?.classList.add('hidden');
        userSection?.classList.add('hidden');
        statsSection?.classList.add('hidden');
        actionsSection?.classList.add('hidden');
        if (loginText) loginText.classList.remove('hidden');
        if (loginLoading) loginLoading.classList.add('hidden');
        if (loginBtn) loginBtn.disabled = false;
    }

    function showNameInput() {
        authSection?.classList.add('hidden');
        nameSection?.classList.remove('hidden');
        userSection?.classList.add('hidden');
        statsSection?.classList.add('hidden');
        actionsSection?.classList.add('hidden');
        nameInput?.focus();
    }

    function showDashboard(userInfo) {
        authSection?.classList.add('hidden');
        nameSection?.classList.add('hidden');
        userSection?.classList.remove('hidden');
        statsSection?.classList.remove('hidden');
        actionsSection?.classList.remove('hidden');

        if (userNameSpan) userNameSpan.textContent = userInfo.name || 'User';
        if (userEmailSpan) userEmailSpan.textContent = userInfo.email || '';

        if (userAvatarImg && userInfo.picture) {
            userAvatarImg.src = userInfo.picture;
        } else if (userAvatarImg) {
            const initial = (userInfo.name || userInfo.email || 'U').charAt(0).toUpperCase();
            userAvatarImg.src = `https://via.placeholder.com/40x40/007AFF/FFFFFF?text=${initial}`;
        }

        // Fetch count from backend
        if (userInfo.email) fetchCount(userInfo.email);
    }

    // ========================================
    // Count Functions
    // ========================================
    function updateCount(count) {
        if (enhancedCountSpan && enhancedCountSpan.textContent !== String(count)) {
            enhancedCountSpan.textContent = count || 0;
            chrome.storage.local.set({ last_known_prompt_count: count });
        }
    }

    async function fetchCount(email) {
        try {
            const apiUrl = window.CONFIG.getApiUrl();
            const res = await fetch(`${apiUrl}/api/v1/users/${encodeURIComponent(email)}`, {
                headers: { 'Cache-Control': 'no-cache' }
            });
            if (res.ok) {
                const data = await res.json();
                updateCount(data.enhanced_prompts || 0);
            }
        } catch {
            // Fall back to cached count (already displayed)
        }
    }

    // ========================================
    // Toggle Extension (Start/Stop)
    // ========================================
    function toggleExtension() {
        if (isExtensionActive) {
            stopExtension();
        } else {
            startExtension();
        }
    }

    function startExtension() {
        if (toggleBtn) toggleBtn.disabled = true;
        if (toggleText) toggleText.textContent = 'Starting...';

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'activate' }, () => {
                    isExtensionActive = true;
                    updateToggleButton();
                    chrome.storage.local.set({ extension_active: true });
                });
            }
        });
    }

    function stopExtension() {
        if (toggleBtn) toggleBtn.disabled = true;
        if (toggleText) toggleText.textContent = 'Stopping...';

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivate' }, () => {
                    isExtensionActive = false;
                    updateToggleButton();
                    chrome.storage.local.set({ extension_active: false });
                });
            }
        });
    }

    function updateToggleButton() {
        if (!toggleBtn || !toggleText) return;
        toggleBtn.disabled = false;
        if (isExtensionActive) {
            toggleBtn.classList.add('active');
            toggleText.textContent = 'Stop';
        } else {
            toggleBtn.classList.remove('active');
            toggleText.textContent = 'Start';
        }
    }

    function checkExtensionState() {
        chrome.storage.local.get(['extension_active'], (result) => {
            isExtensionActive = result.extension_active || false;
            updateToggleButton();
        });
    }
});