// 🔐 SUPER SIMPLE POPUP SCRIPT - JUST WORKS
console.log('🚀 Popup starting...');
console.log('🔧 Payment system debugging enabled');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ DOM loaded');
    
    // Wait for config to be available
    console.log('⏳ Waiting for config to load...');
    let configLoadAttempts = 0;
    const maxAttempts = 20; // Wait up to 2 seconds
    
    while (!window.CONFIG && configLoadAttempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        configLoadAttempts++;
    }
    
    if (window.CONFIG) {
        console.log('✅ Config loaded successfully:', window.CONFIG.getApiUrl());
    } else {
        console.warn('⚠️ Config not loaded, using fallback URL');
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
            console.log('🔐 Login button clicked');
            
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
            console.log('💾 Save name button clicked');
            saveName();
        });
    }

    // Logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            console.log('🚪 Logout button clicked');
            logout();
        });
    }

    // Toggle button click (Start/Stop functionality)
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            console.log('🔄 Toggle button clicked');
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
        console.log('🔍 Checking login status...');
        
        chrome.runtime.sendMessage({ action: 'check_login' }, (response) => {
            console.log('📬 Check login response:', response);
            
            if (response && response.loggedIn) {
                // Check if user has display_name, if not show name input
                if (response.userInfo && !response.userInfo.display_name) {
                    console.log('👤 User logged in but needs to enter name');
                    showNameInput();
                } else {
                    console.log('👤 User fully logged in with name');
                    showUserDashboard(response.userInfo);
                    // Also fetch current count for already logged in user
                    if (response.userInfo.email) {
                        fetchEnhancedCount(response.userInfo.email);
                    }
                }
            } else {
                console.log('❌ User not logged in');
                showAuthSection();
            }
        });
    }

    // Login function
    function login() {
        console.log('🔐 Starting login...');
        
        // The loading state is already handled by the button click event
        // Don't interfere with it here
        
        chrome.runtime.sendMessage({ action: 'login' }, (response) => {
            console.log('📬 Login response:', response);
            
            // Reset login button state
            if (loginText) loginText.classList.remove('hidden');
            if (loginLoading) loginLoading.classList.add('hidden');
            if (loginBtn) loginBtn.disabled = false;
            
            if (response && response.success) {
                console.log('✅ Login successful!');
                if (response.needsName) {
                    console.log('👤 User needs to enter name');
                    showNameInput();
                } else {
                    console.log('👤 User fully logged in');
                    showUserDashboard(response.userInfo);
                }
            } else {
                console.error('❌ Login failed:', response?.error);
                console.error('❌ Login failed:', response?.error || 'Unknown error');
            }
        });
    }

    // Logout function
    function logout() {
        chrome.runtime.sendMessage({ action: 'logout' }, (response) => {
            if (response && response.success) {
                console.log('✅ Logout successful!');
                showAuthSection();
            }
        });
    }

    // Show login section
    function showLogin() {
        console.log('👋 Showing login section');
        if (loginSection) loginSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        hideError();
    }

    // Save name function
    function saveName() {
        const displayName = nameInput.value.trim();
        
        if (!displayName) {
            console.error('❌ Please enter your display name');
            return;
        }

        console.log('💾 Saving name:', displayName);
        
        // Store the name and update database
        chrome.storage.local.get(['user_info'], (data) => {
            const userInfo = { ...data.user_info, display_name: displayName };
            chrome.storage.local.set({ user_info: userInfo }, () => {
                console.log('✅ Name saved locally!');
                
                // Update user in database with display name
                const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                fetch(`${apiUrl}/api/v1/users`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: userInfo.email,
                        name: displayName // Use display name instead of Google name
                    })
                }).then(response => {
                    console.log('✅ User updated in database with display name');
                    showUserDashboard(userInfo);
                }).catch(error => {
                    console.error('❌ Failed to update user in database:', error);
                    // Still show logged in even if database update fails
                    showUserDashboard(userInfo);
                });
            });
        });
    }

    // Show name section
    function showNameSection() {
        console.log('📝 Showing name input section');
        if (loginSection) loginSection.style.display = 'none';
        if (nameSection) nameSection.style.display = 'block';
        if (loggedInSection) loggedInSection.style.display = 'none';
        if (nameInput) nameInput.focus();
        hideError();
    }

    // Show logged in section
    function showLoggedIn(userInfo) {
        console.log('👤 Showing logged in section:', userInfo);
        if (loginSection) loginSection.style.display = 'none';
        if (nameSection) nameSection.style.display = 'none';
        if (loggedInSection) loggedInSection.style.display = 'block';
        
        if (userNameSpan && userInfo) {
            userNameSpan.textContent = userInfo.display_name || userInfo.name || userInfo.email || 'User';
        }
        hideError();
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
        console.log('📝 Showing name input section');
        if (authSection) {
            authSection.classList.add('hidden');
            console.log('✅ Hidden auth section');
        }
        if (nameSection) {
            nameSection.classList.remove('hidden');
            console.log('✅ Shown name section');
        }
        if (userSection) userSection.classList.add('hidden');
        if (statsSection) statsSection.classList.add('hidden');
        if (actionsSection) actionsSection.classList.add('hidden');
        if (nameInput) {
            nameInput.focus();
            console.log('✅ Focused name input');
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
                userNameSpan.textContent = userInfo.display_name || userInfo.name || 'User';
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
            
            // 💰 Initialize payment system with user email
            console.log('💰 Initializing payment system for:', userInfo.email);
            paymentManager.setUserEmail(userInfo.email);
            paymentManager.init();
            
            // Test payment system
            console.log('🧪 Testing payment system...');
            setTimeout(() => {
                console.log('🧪 PaymentManager state:', {
                    currentUserEmail: paymentManager.currentUserEmail,
                    hasInit: paymentManager.init
                });
            }, 1000);
            
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
                // 💳 Load subscription status
                paymentManager.loadSubscriptionStatus();
            }
        }
        
        console.log('✅ Successfully signed in!');
        
        // Initialize extension state
        checkExtensionState();
    }

    // Update enhanced count
    function updateEnhancedCount(count) {
        if (enhancedCountSpan) {
            enhancedCountSpan.textContent = count || 0;
        }
    }

    // Fetch enhanced count from database
    async function fetchEnhancedCount(userEmail) {
        try {
            console.log('📊 Fetching enhanced count for:', userEmail);
            
            // Get API URL from config
            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
            console.log('🌐 Using API URL:', apiUrl);
            
            const fullUrl = `${apiUrl}/api/v1/users/${encodeURIComponent(userEmail)}`;
            console.log('🔗 Full URL:', fullUrl);
            
            const response = await fetch(fullUrl);
            console.log('📡 Response status:', response.status, response.statusText);
            
            if (response.ok) {
                const userData = await response.json();
                console.log('✅ User data from database:', userData);
                const count = userData.enhanced_prompts || 0;
                console.log('📈 Enhanced prompts count:', count);
                updateEnhancedCount(count);
                return count;
            } else {
                console.warn('⚠️ Failed to fetch user data from database');
                const errorText = await response.text();
                console.warn('❌ Error response:', errorText);
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
            console.error('❌ Error fetching enhanced count:', error);
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
        console.log('🔄 Toggling extension state. Current:', isExtensionActive);
        
        if (isExtensionActive) {
            // Stop the extension
            stopExtension();
        } else {
            // Start the extension
            startExtension();
        }
    }

    function startExtension() {
        console.log('▶️ Starting AI Magic extension...');
        
        // Disable button temporarily
        toggleBtn.disabled = true;
        toggleText.textContent = 'Starting...';
        
        // Send message to content script to activate
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'activate' }, (response) => {
                    console.log('✅ Extension activated:', response);
                    
                    isExtensionActive = true;
                    updateToggleButton();
                    console.log('✅ Started! Icons will appear on input boxes.');
                    
                    // Store state
                    chrome.storage.local.set({ 'extension_active': true });
                });
            }
        });
    }

    function stopExtension() {
        console.log('⏹️ Stopping AI Magic extension...');
        
        // Disable button temporarily
        toggleBtn.disabled = true;
        toggleText.textContent = 'Stopping...';
        
        // Send message to content script to deactivate
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivate' }, (response) => {
                    console.log('✅ Extension deactivated:', response);
                    
                    isExtensionActive = false;
                    updateToggleButton();
                    console.log('ℹ️ Stopped. Icons removed from input boxes.');
                    
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
            console.log('🔍 Extension state loaded:', isExtensionActive);
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

    console.log('✅ Popup script ready!');

    // ====================================
    // 💰 PAYMENT SYSTEM
    // ====================================

    // Payment Manager Class
    class PaymentManager {
        constructor() {
            this.apiBaseUrl = CONFIG.getApiUrl();
            this.currentUserEmail = null;
            this.subscriptionStatus = 'free';
        }

        // Initialize payment system
        async init() {
            console.log('🚀 PaymentManager init() called');
            this.setupEventListeners();
            console.log('✅ PaymentManager init() completed');
        }

        // Setup all payment-related event listeners
        setupEventListeners() {
            console.log('🔧 Setting up payment event listeners...');
            
            // Upgrade button click
            const upgradeBtn = document.getElementById('upgrade-btn');
            if (upgradeBtn) {
                console.log('✅ Found upgrade button, adding click listener');
                upgradeBtn.addEventListener('click', () => {
                    console.log('🔘 Upgrade button clicked!');
                    this.openPaymentModal();
                });
            } else {
                console.error('❌ Upgrade button not found!');
            }

            // Pay now button click
            const payNowBtn = document.getElementById('pay-now-btn');
            if (payNowBtn) {
                console.log('✅ Found pay now button, adding click listener');
                payNowBtn.addEventListener('click', () => {
                    console.log('🔘 Pay now button clicked!');
                    this.initiatePayment();
                });
            } else {
                console.error('❌ Pay now button not found!');
            }

            // Close payment modal
            const closePaymentBtn = document.getElementById('close-payment');
            if (closePaymentBtn) {
                closePaymentBtn.addEventListener('click', () => {
                    this.closePaymentModal();
                });
            }

            // Modal backdrop click to close
            const paymentModal = document.getElementById('payment-modal');
            if (paymentModal) {
                paymentModal.addEventListener('click', (e) => {
                    if (e.target === paymentModal) {
                        this.closePaymentModal();
                    }
                });
            }
        }

        // Set current user email
        setUserEmail(email) {
            console.log('📧 Setting user email in PaymentManager:', email);
            this.currentUserEmail = email;
        }

        // Dynamically load Razorpay script
        async loadRazorpayScript() {
            return new Promise((resolve, reject) => {
                // Check if already loaded
                if (typeof Razorpay !== 'undefined') {
                    console.log('✅ Razorpay already loaded');
                    resolve();
                    return;
                }

                console.log('📥 Loading Razorpay script...');
                
                // Create script element
                const script = document.createElement('script');
                script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                script.onload = () => {
                    console.log('✅ Razorpay script loaded successfully');
                    resolve();
                };
                script.onerror = () => {
                    console.error('❌ Failed to load Razorpay script');
                    reject(new Error('Failed to load Razorpay script'));
                };
                
                // Add to document head
                document.head.appendChild(script);
            });
        }

        // Open payment modal
        openPaymentModal() {
            const modal = document.getElementById('payment-modal');
            if (modal) {
                modal.classList.remove('hidden');
                console.log('💳 Payment modal opened');
            }
        }

        // Close payment modal
        closePaymentModal() {
            const modal = document.getElementById('payment-modal');
            if (modal) {
                modal.classList.add('hidden');
                console.log('✖️ Payment modal closed');
            }
        }

        // Initiate payment process
        async initiatePayment() {
            if (!this.currentUserEmail) {
                console.error('❌ Please sign in first');
                return;
            }

            try {
                console.log('🚀 Starting payment process...');
                this.setPaymentLoading(true);
                console.log('🚀 Initiating payment for:', this.currentUserEmail);

                // Create payment order
                console.log('📝 Creating payment order...');
                const order = await this.createOrder();
                
                if (!order) {
                    throw new Error('Failed to create payment order');
                }

                console.log('✅ Order created successfully:', order);

                // Open Razorpay checkout
                console.log('💳 Opening Razorpay checkout...');
                await this.openRazorpayCheckout(order);

            } catch (error) {
                console.error('❌ Payment initiation failed:', error);
                console.error('❌ Payment failed. Please try again.');
                this.setPaymentLoading(false);
            }
        }

        // Create payment order via API
        async createOrder() {
            try {
                console.log('📡 Calling create-order API...');
                const response = await fetch(`${this.apiBaseUrl}/api/v1/payment/create-order`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        user_email: this.currentUserEmail
                    })
                });

                console.log('📡 API Response status:', response.status);
                console.log('📡 API Response headers:', response.headers);

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ API Error:', errorText);
                    throw new Error(`API error: ${response.status} - ${errorText}`);
                }

                const order = await response.json();
                console.log('✅ Order response:', order);
                return order;

            } catch (error) {
                console.error('❌ Create order failed:', error);
                throw error;
            }
        }

        // Open Razorpay checkout
        async openRazorpayCheckout(order) {
            // To avoid CSP issues inside the extension, open a hosted checkout page
            try {
                const checkoutUrl = `${this.apiBaseUrl}/api/v1/payment/checkout-page?order_id=${encodeURIComponent(order.order_id)}&user_email=${encodeURIComponent(this.currentUserEmail)}`;
                console.log('💳 Opening hosted checkout page:', checkoutUrl);
                // Open in a new tab so Razorpay can load freely
                window.open(checkoutUrl, '_blank');
                return true;
            } catch (error) {
                console.error('❌ Failed to open hosted checkout page:', error);
                throw error;
            }
        }

        // Handle successful payment
        async handlePaymentSuccess(response) {
            try {
                console.log('✅ Payment successful:', response.razorpay_payment_id);
                
                // Verify payment with backend
                const verificationResult = await this.verifyPayment(response);
                
                if (verificationResult && verificationResult.success) {
                    // Store pro status in local storage
                    await this.storeProStatus();
                    
                    // Update UI to show pro status
                    this.updateSubscriptionUI('pro');
                    
                    // Close payment modal
                    this.closePaymentModal();
                    
                    // Show success message
                    console.log('🎉 Welcome to Pro! You now have unlimited access.');
                    
                    console.log('🎉 User upgraded to Pro successfully');
                } else {
                    throw new Error('Payment verification failed');
                }

            } catch (error) {
                console.error('❌ Payment handling failed:', error);
                console.error('❌ Payment verification failed. Please contact support.');
            } finally {
                this.setPaymentLoading(false);
            }
        }

        // Verify payment with backend
        async verifyPayment(response) {
            try {
                const verifyResponse = await fetch(`${this.apiBaseUrl}/api/v1/payment/verify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        user_email: this.currentUserEmail
                    })
                });

                if (!verifyResponse.ok) {
                    throw new Error(`Verification failed: ${verifyResponse.status}`);
                }

                const result = await verifyResponse.json();
                console.log('✅ Payment verified successfully');
                
                return result;

            } catch (error) {
                console.error('❌ Payment verification error:', error);
                throw error;
            }
        }

        // Store pro status in chrome storage
        async storeProStatus() {
            return new Promise((resolve) => {
                chrome.storage.local.set({
                    subscription_tier: 'pro',
                    subscription_updated: Date.now()
                }, () => {
                    console.log('✅ Pro status stored locally');
                    resolve();
                });
            });
        }

        // Get subscription status from storage
        async getStoredSubscriptionStatus() {
            return new Promise((resolve) => {
                chrome.storage.local.get(['subscription_tier'], (result) => {
                    resolve(result.subscription_tier || 'free');
                });
            });
        }

        // Update subscription UI based on tier
        updateSubscriptionUI(tier) {
            // For now, just store the status - UI is simplified
            this.subscriptionStatus = tier;
            console.log(`🔄 Subscription status updated to: ${tier}`);
        }

        // Set payment button loading state
        setPaymentLoading(isLoading) {
            const payBtn = document.getElementById('pay-now-btn');
            const payBtnText = document.getElementById('pay-btn-text');
            const payLoading = document.getElementById('pay-loading');

            if (payBtn && payBtnText && payLoading) {
                payBtn.disabled = isLoading;
                
                if (isLoading) {
                    payBtnText.classList.add('hidden');
                    payLoading.classList.remove('hidden');
                } else {
                    payBtnText.classList.remove('hidden');
                    payLoading.classList.add('hidden');
                }
            }
        }



        // Load and display user subscription status
        async loadSubscriptionStatus() {
            if (!this.currentUserEmail) return;

            try {
                // Check stored status first
                const storedStatus = await this.getStoredSubscriptionStatus();
                
                // Update UI with stored status
                this.updateSubscriptionUI(storedStatus);

                // Fetch fresh status from backend
                const response = await fetch(
                    `${this.apiBaseUrl}/api/v1/payment/subscription-status/${this.currentUserEmail}`
                );

                if (response.ok) {
                    const status = await response.json();
                    
                    // Update UI if status changed
                    if (status.subscription_tier !== storedStatus) {
                        this.updateSubscriptionUI(status.subscription_tier);
                        
                        // Update stored status
                        chrome.storage.local.set({
                            subscription_tier: status.subscription_tier
                        });
                    }

                    console.log('🔄 Subscription status loaded:', status.subscription_tier);
                }

            } catch (error) {
                console.error('❌ Failed to load subscription status:', error);
            }
        }
    }

    // Initialize payment manager
    const paymentManager = new PaymentManager();
    
    // Test function for debugging
    window.testPaymentSystem = () => {
        console.log('🧪 Testing payment system manually...');
        console.log('🔍 Looking for payment buttons...');
        
        const upgradeBtn = document.getElementById('upgrade-btn');
        const payNowBtn = document.getElementById('pay-now-btn');
        const paymentModal = document.getElementById('payment-modal');
        
        console.log('🔘 Upgrade button:', upgradeBtn);
        console.log('🔘 Pay now button:', payNowBtn);
        console.log('💳 Payment modal:', paymentModal);
        
        console.log('💰 PaymentManager state:', {
            currentUserEmail: paymentManager.currentUserEmail,
            hasInit: paymentManager.init
        });
        
        // Test button clicks
        if (upgradeBtn) {
            console.log('🔘 Testing upgrade button click...');
            upgradeBtn.click();
        }
        
        if (payNowBtn) {
            console.log('🔘 Testing pay now button click...');
            payNowBtn.click();
        }
    };

    // ====================================
    // 🔄 ENHANCED USER DASHBOARD FUNCTION
    // ====================================