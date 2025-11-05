// 🪄 PromptGrammerly - Prompt Enhancer Content Script
//  FIXED: Extension context invalidated error with safe storage handling

// Global error handler to suppress non-critical extension errors
window.addEventListener('error', (event) => {
    if (event.error && event.error.message) {
        const message = event.error.message;
        // Suppress common extension errors that are not critical
        if (message.includes('Extension context invalidated') ||
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

// Console warn filtering removed

class MagicalEnhancer {
    constructor() {
        this.isActive = false;
        this.observer = null;
        this.icons = new Map();
        this.activePopup = null;
        this.isProcessing = false;
        this.userInfo = null;
        this.iconCreationLock = new Set(); // Prevent duplicate creation
        this.lastScanTime = 0; // Debounce scanning
        this.scanTimeout = null; // For debounced scanning
        this.currentChatId = null; // Track current chat to prevent duplicates
        this.isStreaming = false; // Track streaming state
        this.currentStreamAbortController = null; // Stream abort controller
        this.streamMessageListener = null; // Stream message listener
        this.init();
    }

    // Safely convert plain text to HTML with <br> for newlines
    escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    toHtmlWithLineBreaks(text) {
        return this.escapeHtml(text).replace(/\n/g, '<br>');
    }

    init() {
        // Clean up any existing icons from previous instances
        this.cleanupExistingIcons();
        
        this.injectStyles();
        this.listenForMessages();
        this.setupGlobalListeners();
        this.checkLoginStatus();

        // CRITICAL FIX: Ensure authentication works across tabs
        this.initializeCrossTabAuth();
        
        // Check if extension was already active before page reload
        this.checkAndRestoreActiveState();
        
        // CRITICAL FIX: Periodic login status check to ensure P button disappears on logout
        this.startPeriodicLoginCheck();
        
        // Don't auto-activate - wait for toggle button (unless already active)
    }

    // CRITICAL FIX: Ensure authentication works seamlessly across tabs
    async initializeCrossTabAuth() {
        try {
            // Check if user is globally authenticated
            const userData = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });

            if (userData.user_info?.email) {
                // User is authenticated, extension should work on any supported platform
            } else {
            }

            // Listen for authentication changes across tabs
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes.user_info) {
                    // Refresh extension state when authentication changes
                    this.checkLoginStatus();
                }
            });

        } catch (error) {
            // Cross-tab auth initialization failed
        }
    }

    // Safe storage utility methods
    safeStorageGet(keys, callback) {
        try {
            if (this.isStorageAvailable()) {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {

                        callback(null);
                        return;
                    }
                    callback(result);
                });
            } else {

                callback(null);
            }
        } catch (error) {

            callback(null);
        }
    }

    // Enhanced error handling for storage operations
    isStorageAvailable() {
        return typeof chrome !== 'undefined' && 
               chrome.storage && 
               chrome.storage.local && 
               chrome.runtime && 
               chrome.runtime.id;
    }

    safeStorageSet(data, callback = () => {}) {
        try {
            if (this.isStorageAvailable()) {
                chrome.storage.local.set(data, () => {
                    if (chrome.runtime.lastError) {

                    } else {

                    }
                    callback();
                });
            } else {

                callback();
            }
        } catch (error) {

            callback();
        }
    }

    cleanupExistingIcons() {
        // Remove any existing icons from previous instances
        const existingIcons = document.querySelectorAll('.ce-icon');
        if (existingIcons.length > 0) {

            existingIcons.forEach(icon => icon.remove());
        }
        
        // Also clean up any orphaned icons that might be duplicates
        this.removeDuplicateIcons();
    }

    removeDuplicateIcons() {
        // Find and remove duplicate icons for the same input
        const allIcons = document.querySelectorAll('.ce-icon');
        const iconGroups = new Map();
        
        allIcons.forEach(icon => {
            const inputId = icon.getAttribute('data-input-id');
            if (inputId) {
                if (!iconGroups.has(inputId)) {
                    iconGroups.set(inputId, []);
                }
                iconGroups.get(inputId).push(icon);
            }
        });
        
        // Remove duplicates, keeping only the first one
        iconGroups.forEach((icons, inputId) => {
            if (icons.length > 1) {

                for (let i = 1; i < icons.length; i++) {
                    icons[i].remove();
                }
            }
        });
    }

    checkAndRestoreActiveState() {
        // Check if the extension was active before page reload
        this.safeStorageGet(['extension_active'], (result) => {
            if (!result) return;

            if (result.extension_active) {

                this.isActive = true;
                
                // Immediate attempt for instant results
                    this.scanForInputs(true); // Bypass debounce
                
                // Faster restore attempts with minimal delays
                const restoreAttempts = [100, 300, 600, 1000]; // Reduced delays
                
                restoreAttempts.forEach((delay, index) => {
                    setTimeout(() => {

                        // Force scan even with debouncing during restore
                        this.scanForInputs(true); // Bypass debounce
                        
                        // Check if we found any inputs
                        if (this.icons.size > 0) {

                        } else {

                            // If this is the last attempt and we still haven't found anything,
                            // try a less restrictive scan
                            if (index === restoreAttempts.length - 1) {

                                this.scanForInputsRelaxed();
                            }
                        }
                    }, delay);
                });
                
                // Start periodic checking immediately
                this.startPeriodicCheck();
                
                // Also listen for page readiness changes
                if (document.readyState !== 'complete') {
                    document.addEventListener('DOMContentLoaded', () => {

                        this.scanForInputs(true); // Bypass debounce
                    });
                    
                    window.addEventListener('load', () => {

                        this.scanForInputs(true); // Bypass debounce
                    });
                }
                
                // Monitor for dynamic content changes more aggressively during restore
                const restoreObserver = new MutationObserver(() => {
                    if (this.isActive && this.icons.size === 0) {

                        this.scanForInputs(true); // Bypass debounce
                    }
                });
                
                restoreObserver.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                // Stop aggressive monitoring after 5 seconds (reduced from 10)
                setTimeout(() => {
                    restoreObserver.disconnect();

                }, 5000);
                
            } else {

            }
        });
    }

    startPeriodicCheck() {
        // Check for new inputs more frequently when active
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
        }
        
        this.periodicCheckInterval = setInterval(() => {
            if (this.isActive) {
                // First, clean up any duplicates that might have appeared
                this.removeDuplicateIcons();
                this.cleanupOrphanedIcons();
                
                const beforeCount = this.icons.size;
                this.scanForInputs();
                const afterCount = this.icons.size;
                
                if (afterCount > beforeCount) {

                }
            }
        }, 1000); // Reduced from 3000ms to 1000ms for faster detection
    }

    // Add this new function to handle input element changes
    handleInputElementChange(oldElement, newElement) {
        // If the old element had an icon, transfer it to the new element
        if (this.icons.has(oldElement)) {
            const icon = this.icons.get(oldElement);
            this.icons.delete(oldElement);
            this.icons.set(newElement, icon);
            icon._targetElement = newElement;

        }
    }

    stopPeriodicCheck() {
        if (this.periodicCheckInterval) {
            clearInterval(this.periodicCheckInterval);
            this.periodicCheckInterval = null;
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.id = 'clean-enhancer-styles';
        style.textContent = `
            .ce-icon {
                position: fixed !important;
                width: 40px !important;
                height: 40px !important;
                background: #2c2c2c !important;
                border: none !important;
                border-radius: 50% !important;
                cursor: grab !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                font-size: 22px !important;
                font-weight: bold !important;
                color: white !important;
                transition: all 0.2s ease !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2) !important;
                user-select: none !important;
            }

            .ce-icon:hover {
                background: #1a1a1a !important;
                transform: scale(1.1) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
            }

            .ce-icon:active {
                transform: scale(0.95) !important;
            }

            .ce-icon.dragging {
                cursor: grabbing !important;
                opacity: 0.8 !important;
                transform: scale(1.05) !important;
            }

            .ce-icon.processing {
                animation: pulse 1s infinite !important;
            }

            @keyframes pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.8; transform: scale(1.05); }
            }

            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            .ce-popup {
                position: fixed !important;
                width: 400px !important;
                max-height: 340px !important;
                background: #1a1a1a !important;
                border: 1px solid #333 !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
                color: #f0f0f0 !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                z-index: 1000000 !important;
                backdrop-filter: blur(16px) !important;
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
                padding-bottom: 60px !important; /* Space for the insert button */
            }

            .ce-close-btn {
                background: none !important;
                border: none !important;
                color: #888 !important;
                font-size: 18px !important;
                cursor: pointer !important;
                padding: 0 !important;
                width: 24px !important;
                height: 24px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 4px !important;
                transition: all 0.2s ease !important;
            }

            .ce-close-btn:hover {
                background: #333 !important;
                color: #fff !important;
            }

            .ce-content {
                padding: 16px !important;
                flex: 1 !important;
                overflow-y: auto !important;
                font-size: 15px !important;
                line-height: 1.6 !important;
                position: relative !important;
                padding-bottom: 16px !important;
            }

            .ce-loading {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 40px 20px !important;
                color: #6b7280 !important;
                text-align: center !important;
            }

            .ce-insert-btn {
                background: #2D9CDB !important;
                color: white !important;
                border: 2px solid #c0c0c0 !important;
                padding: 8px 16px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 500 !important;
                font-size: 14px !important;
                transition: all 0.2s ease !important;
                z-index: 1000001 !important;
                position: absolute !important;
            }

            .ce-insert-btn:hover {
                background: #1E7BB8 !important;
                border-color: #e0e0e0 !important;
            }

            .ce-insert-btn:disabled {
                opacity: 0.5 !important;
                cursor: not-allowed !important;
            }
        `;
        document.head.appendChild(style);
    }

    listenForMessages() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'activate') {
                    this.activate();
                    sendResponse({ success: true });
            } else if (message.action === 'deactivate') {
                    this.deactivate();
                    sendResponse({ success: true });
            } else if (message.action === 'limit_reached') {
                    // Handle limit reached from background script
                    const inputElement = this.findActiveInput();
                    if (inputElement) {
                        this.showLimitNotification(inputElement);
                    }
                    sendResponse({ success: true });
            }
        });
    }

    findActiveInput() {
        // Find the most recently focused input element
        const inputs = document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"]');
        if (inputs.length > 0) {
            return inputs[inputs.length - 1]; // Return the last one (most likely to be active)
        }
        return null;
    }

    activate() {
        if (this.isActive) {
            return;
        }
        
        this.isActive = true;

        // Save active state for page reloads
        this.safeStorageSet({ extension_active: true });
        
        // Immediate scan for instant results
        this.scanForInputs(true);
        
        // Set up optimized observer for dynamic content
        this.observer = new MutationObserver((mutations) => {
            if (this.isActive && mutations.length > 0) {
                // Only scan if there are significant changes
                const hasRelevantChanges = mutations.some(mutation => {
                    return mutation.type === 'childList' && 
                           (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0);
                });
                
                if (hasRelevantChanges) {
                    // Debounced scanning for performance
                    clearTimeout(this.scanTimeout);
                    this.scanTimeout = setTimeout(() => {
                        this.scanForInputs();
                    }, 50); // Reduced delay for faster response
                }
            }
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.startPeriodicCheck();
        this.startGlobalDuplicatePrevention();
    }

    startGlobalDuplicatePrevention() {
        // Run duplicate prevention every 500ms to catch any that slip through
        if (this.duplicatePreventionInterval) {
            clearInterval(this.duplicatePreventionInterval);
        }
        
        this.duplicatePreventionInterval = setInterval(() => {
            if (this.isActive) {
                this.removeDuplicateIcons();
                this.cleanupOrphanedIcons();
            }
        }, 500);
    }

    stopGlobalDuplicatePrevention() {
        if (this.duplicatePreventionInterval) {
            clearInterval(this.duplicatePreventionInterval);
            this.duplicatePreventionInterval = null;
        }
    }

    deactivate() {
        this.isActive = false;
        
        // Save inactive state
        this.safeStorageSet({ extension_active: false });
        
        this.removeAllIcons();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        this.stopPeriodicCheck();
        this.stopGlobalDuplicatePrevention();

    }

    scanForInputs(bypassDebounce = false) {
        // Reduced debouncing for faster response
        const now = Date.now();
        if (!bypassDebounce && now - this.lastScanTime < 100) { // Reduced from 500ms to 100ms
            return;
        }
        this.lastScanTime = now;

        // Clean up any orphaned icons before scanning
        this.cleanupOrphanedIcons();
        

        // Optimized selectors for faster detection - focus on main chat inputs only
        const selectors = [
            // Perplexity AI specific selectors (prioritized) - UPDATED 2024
            'textarea[placeholder*="Ask anything or @mention a Space"]',
            'textarea[placeholder*="Ask anything or @mention"]',
            'textarea[placeholder*="Ask anything"]',
            'textarea[placeholder*="Ask"]',
            'div[contenteditable="true"][role="textbox"][aria-label*="Ask anything"]',
            'div[contenteditable="true"][role="textbox"]',
            'textarea[data-testid*="composer"]',
            'textarea[data-testid*="search"]',
            'textarea[data-testid*="input"]',
            'textarea[data-testid*="query"]',
            'textarea[data-testid*="prompt"]',
            // Additional Perplexity selectors
            'textarea[class*="composer"]',
            'textarea[class*="input"]',
            'textarea[class*="search"]',
            'div[contenteditable="true"][class*="composer"]',
            'div[contenteditable="true"][class*="input"]',
            // Generic textarea fallbacks
            'textarea:not([readonly]):not([disabled])',
            // ChatGPT main input - most common
            'textarea[placeholder*="Message ChatGPT"]',
            'div[contenteditable="true"][data-id*="root"]',
            // Claude main input
            'div[contenteditable="true"][data-placeholder*="Talk with Claude"]',
            // Gemini main input  
            'textarea[placeholder*="Enter a prompt here"]',
            // Meta AI main input - comprehensive selectors
            'textarea[placeholder*="Ask Meta AI"]',
            'div[contenteditable="true"][aria-label*="Ask Meta AI"]',
            // Generic main chat inputs (as fallback)
            'textarea[data-testid*="composer"]',
            'div[contenteditable="true"]:not([role="textbox"]):not([aria-label*="search"])',
            // More generic selectors (last resort)
            'textarea',
            'div[contenteditable="true"]'
        ];

        let totalFound = 0;
        let newlyAdded = 0;

        // Process selectors in order of priority for faster results
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            totalFound += elements.length;
            
            
            for (const element of elements) {
                const inputId = this.getInputId(element);
                
                // ROBUST duplicate check - multiple layers to prevent duplicates
                if (this.icons.has(element)) {

                    continue;
                }
                
                if (this.iconCreationLock.has(inputId)) {

                    continue;
                }
                
                // Check if there's already an icon in the DOM for this input
                const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
                if (existingIcon) {

                    continue;
                }
                
                // Additional check: look for any icon near this input element
                const rect = element.getBoundingClientRect();
                const nearbyIcons = document.querySelectorAll('.ce-icon');
                let hasNearbyIcon = false;
                for (const icon of nearbyIcons) {
                    const iconRect = icon.getBoundingClientRect();
                    const distance = Math.sqrt(
                        Math.pow(iconRect.left - rect.right, 2) + 
                        Math.pow(iconRect.top - rect.top, 2)
                    );
                    if (distance < 100) { // If icon is within 100px, consider it a duplicate

                        hasNearbyIcon = true;
                        break;
                    }
                }
                
                if (hasNearbyIcon) {
                    continue;
                }
                
                if (this.isValidInputFast(element)) { // Use fast validation
                    this.addIconToInput(element);
                    newlyAdded++;
                    
                    // Early exit if we found enough inputs (performance optimization)
                    if (newlyAdded >= 3) {

                        break;
                    }
                }
            }
            
            // Early exit if we found inputs from high-priority selectors
            if (newlyAdded > 0) break;
        }

    }

    scanForInputsRelaxed() {
        // Fast relaxed scanning for restore attempts

        const relaxedSelectors = [
            'textarea',
            'div[contenteditable="true"]',
            'input[type="text"]'
        ];

        let totalFound = 0;
        let newlyAdded = 0;

        // Process selectors in order for faster results
        for (const selector of relaxedSelectors) {
            const elements = document.querySelectorAll(selector);
            totalFound += elements.length;
            
            for (const element of elements) {
                const inputId = this.getInputId(element);
                
                // Basic duplicate check
                if (this.icons.has(element) || 
                    this.iconCreationLock.has(inputId) ||
                    document.querySelector(`[data-input-id="${inputId}"]`)) {
                    continue;
                }
                
                // Ultra-fast validation - just basic size and visibility
                const rect = element.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 15 && 
                    !element.closest('.ce-popup') &&
                    !element.hasAttribute('readonly') &&
                    !element.disabled) {

                    this.addIconToInput(element);
                    newlyAdded++;
                    
                    // Early exit for performance
                    if (newlyAdded >= 2) break;
                }
            }

            // Early exit if we found inputs
            if (newlyAdded > 0) break;
    }

    }

    isValidInputFast(element) {
        const rect = element.getBoundingClientRect();
        
        // Ultra-fast validation - minimal checks for speed
        if (rect.width < 80 || rect.height < 15 || 
            element.closest('.ce-popup') ||
            element.hasAttribute('readonly') ||
            element.disabled) {
            return false;
        }
        
        // Skip obvious non-chat inputs quickly
        const placeholder = element.placeholder?.toLowerCase() || '';
        const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
        
        if (ariaLabel.includes('search') || 
            ariaLabel.includes('filter') ||
            placeholder.includes('search') ||
            placeholder.includes('filter')) {
            return false;
        }
        
        // Simplified positioning check - just ensure it's in the lower portion
        const viewportHeight = window.innerHeight;
        const isInLowerHalf = rect.bottom > viewportHeight * 0.4; // Reduced threshold for faster detection
        
        if (!isInLowerHalf) {
            return false;
        }
        
        return true; // Passed all quick checks
    }

    addIconToInput(inputElement) {
        const inputId = this.getInputId(inputElement);
        
        // FINAL CHECK: Remove any existing duplicates before creating new icon
        this.removeDuplicateIcons();
        
        // ROBUST duplicate prevention - multiple layers of checking
        if (this.icons.has(inputElement)) {

            return;
        }
        
        if (this.iconCreationLock.has(inputId)) {

            return;
        }
        
        // Check if there's already an icon in the DOM for this input
        const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
        if (existingIcon) {

            return;
        }
        
        // Additional check: look for any icon near this input element
        const rect = inputElement.getBoundingClientRect();
        const nearbyIcons = document.querySelectorAll('.ce-icon');
        for (const icon of nearbyIcons) {
            const iconRect = icon.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(iconRect.left - rect.right, 2) + 
                Math.pow(iconRect.top - rect.top, 2)
            );
            if (distance < 100) { // If icon is within 100px, consider it a duplicate

                return;
            }
        }
        
        // Lock this input to prevent duplicates during creation
        this.iconCreationLock.add(inputId);

        try {
            const icon = document.createElement('button');
            icon.className = 'ce-icon';
            icon.innerHTML = this.createPLogo();
            icon.title = 'Improve with PromptGrammerly';
            icon.setAttribute('data-input-id', inputId);
            
            // Fast positioning - immediate placement without complex calculations
            this.positionIconFast(icon, inputElement);
            
            // Make icon draggable and clickable
            this.makeIconDraggableAndClickable(icon, inputElement);
            
            // Add to DOM immediately
            document.body.appendChild(icon);
            this.icons.set(inputElement, icon);
            
            // Store reference for positioning updates
            icon._targetElement = inputElement;
            
            //  AUTO-REPOSITIONING: Keep icon positioned relative to input on scroll/resize
            this.setupAutoRepositioning(icon, inputElement);

        } finally {
            // Always unlock after creation attempt
            setTimeout(() => {
                this.iconCreationLock.delete(inputId);

            }, 50); // Reduced from 100ms to 50ms
        }
    }

    cleanupOrphanedIcons() {
        // Remove any icons that are no longer associated with valid inputs
        const iconsToRemove = [];
        
        this.icons.forEach((icon, inputElement) => {
            // Check if the input element still exists in the DOM
            if (!document.contains(inputElement)) {

                iconsToRemove.push(inputElement);
                return;
            }
            
            // Check if the input element is still visible and valid
            const rect = inputElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 ||
                inputElement.hasAttribute('readonly') ||
                inputElement.disabled) {

                iconsToRemove.push(inputElement);
                return;
            }
            
            // Check if there are multiple icons for the same input
            const inputId = icon.getAttribute('data-input-id');
            const allIconsForInput = document.querySelectorAll(`[data-input-id="${inputId}"]`);
            if (allIconsForInput.length > 1) {

                // Keep only the first icon, remove the rest
                for (let i = 1; i < allIconsForInput.length; i++) {
                    allIconsForInput[i].remove();
                }
            }
        });
        
        // Remove the orphaned icons
        iconsToRemove.forEach(inputElement => {
            const icon = this.icons.get(inputElement);
            if (icon) {
                // Cleanup auto-repositioning listeners
                if (icon._cleanup) {
                    icon._cleanup();
                }
                icon.remove();
                this.icons.delete(inputElement);
            }
        });
        
        if (iconsToRemove.length > 0) {

        }
    }

    positionIconFast(icon, inputElement) {
        const rect = inputElement.getBoundingClientRect();
        
        //  FIXED: Position icon OUTSIDE input box, never inside
        const iconSize = 32; // Smaller for better UX
        const spacing = 15; // More spacing to ensure it's clearly outside
        
        // Always position to the RIGHT of the input box, never inside
        let left = rect.right + spacing;
        let top = rect.top + (rect.height - iconSize) / 2;
        
        // Smart positioning: if no space on right, position on left side
        if (left + iconSize > window.innerWidth - 10) {
            left = rect.left - iconSize - spacing; // Left side of input
        }
        
        // CRITICAL: Ensure it's NEVER inside the input bounds
        if (left >= rect.left && left <= rect.right) {
            left = rect.right + spacing; // Force outside on right
        }
        if (left < rect.left - iconSize && left > rect.left - iconSize - spacing) {
            left = rect.left - iconSize - spacing; // Force outside on left
        }
        
        // Vertical bounds checking with more margin
        if (top < 15) top = 15;
        if (top + iconSize > window.innerHeight - 15) top = window.innerHeight - iconSize - 15;
        
        // Apply position with enhanced styling for draggability
        icon.style.position = 'fixed';
        icon.style.left = `${left}px`;
        icon.style.top = `${top}px`;
        icon.style.zIndex = '999999';
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
        icon.style.pointerEvents = 'auto';
        icon.style.cursor = 'grab';
        icon.style.borderRadius = '8px';
        icon.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        icon.style.transition = 'all 0.2s ease';
        icon.style.backgroundColor = '#007AFF';
        icon.style.border = '2px solid rgba(255,255,255,0.2)';
        
        // Store position for repositioning on scroll/resize
        icon._lastPosition = { left, top };
        icon._inputRect = rect;
    }

    setupAutoRepositioning(icon, inputElement) {
        //  AUTO-REPOSITIONING: Keep icon properly positioned
        let repositionTimer;
        
        const repositionIcon = () => {
            if (!icon.isConnected || !inputElement.isConnected) return;
            
            // Don't reposition if user is dragging
            if (icon._isDragging) return;
            
            clearTimeout(repositionTimer);
            repositionTimer = setTimeout(() => {
                this.positionIconFast(icon, inputElement);
            }, 100);
        };
        
        // Listen for scroll and resize events
        window.addEventListener('scroll', repositionIcon, { passive: true });
        window.addEventListener('resize', repositionIcon, { passive: true });
        
        // Store cleanup function
        icon._cleanup = () => {
            window.removeEventListener('scroll', repositionIcon);
            window.removeEventListener('resize', repositionIcon);
            clearTimeout(repositionTimer);
        };
    }

    makeIconDraggableAndClickable(icon, inputElement) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let dragStartTime = 0;
        
        icon.draggable = false;
        icon.style.cursor = 'grab';
        icon.style.userSelect = 'none';
        icon.style.touchAction = 'none'; // Better mobile support

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            
            dragStartTime = Date.now();
            isDragging = true;
            icon._isDragging = true; // Flag for auto-repositioning
            
            startX = e.clientX;
            startY = e.clientY;
            
            // Get ACTUAL current position from computed style, not style attribute
            const rect = icon.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            icon.style.cursor = 'grabbing';
            icon.style.zIndex = '9999999';
            
            e.preventDefault();
            e.stopPropagation();
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const newLeft = startLeft + deltaX;
            const newTop = startTop + deltaY;
            
            // Keep within bounds
            const maxLeft = window.innerWidth - 32 - 10;
            const maxTop = window.innerHeight - 32 - 10;
            
            const finalLeft = Math.max(10, Math.min(newLeft, maxLeft));
            const finalTop = Math.max(10, Math.min(newTop, maxTop));
            
            icon.style.left = finalLeft + 'px';
            icon.style.top = finalTop + 'px';
            
            e.preventDefault();
        });
        
        document.addEventListener('mouseup', (e) => {
            if (!isDragging) return;
            
            const dragDuration = Date.now() - dragStartTime;
            const deltaX = Math.abs(e.clientX - startX);
            const deltaY = Math.abs(e.clientY - startY);
            const totalMovement = deltaX + deltaY;
            
            isDragging = false;
            icon._isDragging = false; // Clear flag for auto-repositioning
            icon.style.cursor = 'grab';
            
            // If it was a quick click with minimal movement, treat as click
            if (dragDuration < 200 && totalMovement < 10) {

                icon.classList.add('processing');
                this.handleIconClick(inputElement, icon);
            } else {

                const finalLeft = parseInt(icon.style.left);
                const finalTop = parseInt(icon.style.top);

                this.saveIconPosition(inputElement, finalLeft, finalTop);
            }
            
            e.preventDefault();
        });
    }

    saveIconPosition(inputElement, left, top) {
        try {
            const key = this.getInputKey(inputElement);
            const position = { left, top, timestamp: Date.now() };
            
            this.safeStorageGet(['iconPositions'], (result) => {
                if (!result) return;
                
                const positions = result.iconPositions || {};
                positions[key] = position;
                
                this.safeStorageSet({ iconPositions: positions });
            });
        } catch (error) {

        }
    }

    loadIconPosition(inputElement, callback) {
        try {
            const key = this.getInputKey(inputElement);
            
            this.safeStorageGet(['iconPositions'], (result) => {
                if (!result) {
                    callback(null, null);
                    return;
                }
                
                const positions = result.iconPositions || {};
                const position = positions[key];
                
                // Use saved position if it's recent (within 1 hour)
                if (position && (Date.now() - position.timestamp) < 3600000) {
                    callback(position.left, position.top);
                } else {
                    callback(null, null);
                }
            });
        } catch (error) {

            callback(null, null);
        }
    }

    getInputId(inputElement) {
        // Create a unique identifier for the input element
        const tagName = inputElement.tagName;
        const id = inputElement.id || '';
        const className = inputElement.className || '';
        const placeholder = inputElement.placeholder || '';
        
        // Create a short hash from the element characteristics
        const elementString = `${tagName}_${id}_${className}_${placeholder}`;
        const hash = this.simpleHash(elementString);
        
        return `input_${hash}`;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    getInputKey(inputElement) {
        // Create a unique key for this input based on URL and element characteristics
        const url = window.location.href;
        const tagName = inputElement.tagName;
        const id = inputElement.id || '';
        const className = inputElement.className || '';
        const placeholder = inputElement.placeholder || '';
        
        return `${url}_${tagName}_${id}_${className}_${placeholder}`.replace(/[^a-zA-Z0-9_]/g, '_');
    }

    createPLogo() {
        return `P`;
    }

    async handleIconClick(inputElement, icon) {
        
        if (this.isProcessing || icon.isProcessing) {
            return;
        }

        const text = this.getInputText(inputElement);
        if (!text.trim()) {
            icon.classList.remove('processing');
            return;
        }
        

        //  SMART LIMIT CHECK: Get real daily usage from backend before blocking
        try {
            const userData = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });

            const userEmail = userData.user_info?.email || '';
            const userTier = userData.user_info?.subscription_tier || 'free';

            // If no user email found, open popup for login
            if (!userEmail) {
                chrome.runtime.sendMessage({action: 'open_popup_for_login'}, (response) => {
                    if (chrome.runtime.lastError) {
                        // Failed to open popup
                    }
                });
                icon.classList.remove('processing');
                return;
            }

            // CRITICAL FIX: Always use fresh backend data for current user's email
            // Don't rely on cached data that might be from a different user
            // Check user limits

            // Check user subscription status from backend for ALL users
            if (userEmail) {
                try {
                    const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                    const statusCheck = await fetch(`${apiUrl}/api/v1/payment/subscription-status/${encodeURIComponent(userEmail)}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(3000) // 3 second timeout
                    });

                    if (statusCheck.ok) {
                        const userStatus = await statusCheck.json();
                        
                        // DEBUG: Log the full API response to see what we're getting
                        
                        const userTier = userStatus.subscription_tier || 'free';
                        const dailyUsed = userStatus.daily_prompts_used || 0;
                        const dailyLimit = userStatus.daily_limit || 10;


                        // UPDATE CHROME STORAGE with fresh subscription data
                        try {
                            chrome.storage.local.get(['user_info'], (result) => {
                                if (result.user_info) {
                                    result.user_info.subscription_tier = userTier;
                                    result.user_info.daily_prompts_used = dailyUsed;
                                    result.user_info.daily_limit = dailyLimit;
                                    chrome.storage.local.set({ user_info: result.user_info });
                                }
                            });
                        } catch (storageError) {
                        }

                        // PRO USERS: No limits, allow all requests
                        if (userTier === 'pro') {
                            // Pro users can proceed without any limits
                        }
                        // FREE USERS: Check daily limit
                        else if (userTier === 'free' && dailyUsed >= 10) {
                            this.showLimitNotification(inputElement);
                            icon.classList.remove('processing');
                            return;
                        }
                        // FREE USERS: Still have prompts remaining
                        else {
                        }
                    } else {
                    }
                } catch (backendError) {
                    // Allow request if backend check fails - backend will still enforce limits
                }
            }
        } catch (error) {
            // Allow request on error - backend safety net will catch it
        }

        if (this.activePopup) {
            this.closePopup();
        }

        this.isProcessing = true;
        icon.isProcessing = true;

        try {
            await this.showEnhancementPopup(inputElement, icon, text);
        } finally {
            this.isProcessing = false;
            icon.isProcessing = false;
            // Stop processing animation
            icon.classList.remove('processing');

        }
    }

    getInputText(element) {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            return element.value;
        } else if (element.contentEditable === 'true') {
            return element.textContent || element.innerText;
        }
        return '';
    }

    async showEnhancementPopup(inputElement, iconElement, inputText) {
        const popup = document.createElement('div');
        popup.className = 'ce-popup';
        popup.innerHTML = `
            <div class="ce-content">
                <div class="ce-stream-container" id="stream-container">
                    <div class="ce-stream-text" id="stream-text" style="font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;"></div>
                </div>
                <button class="ce-close-btn" title="Close" style="position: absolute; top: 12px; right: 12px;">×</button>
            </div>
            <button class="ce-insert-btn" id="insert-btn" style="display: none; position: absolute; bottom: 16px; left: 16px; z-index: 1000001;">Insert</button>
        `;

        document.body.appendChild(popup);
        this.activePopup = popup;
        this.positionPopup(popup, iconElement);
        this.makePopupDraggable(popup);

        popup.querySelector('.ce-close-btn').onclick = () => {
            this.closePopup();
            iconElement.classList.remove('processing');
        };

        // Use REAL streaming for immediate response
        this.startStreaming(inputElement, iconElement, inputText, popup);
    }

    showInsertButton(popup, finalText, inputElement) {
            const insertBtn = popup.querySelector('#insert-btn');
            if (insertBtn) {
                insertBtn.style.display = 'block';
                insertBtn.disabled = false;
                insertBtn.textContent = 'Insert';

                // Guard against double-click increments
                let isIncrementing = false;

                // Simple click handler - increment count when inserting (single source of truth)
                insertBtn.onclick = async () => {
                    // Prevent double-click
                    if (isIncrementing) return;
                    isIncrementing = true;
                    
                    // Insert the text
                    this.insertText(finalText, inputElement);
                    this.closePopup();
                    
                    // Increment count by making a simple API call
                    try {
                        const userData = await new Promise((resolve) => {
                            chrome.storage.local.get(['user_info'], resolve);
                        });
                        const userEmail = userData.user_info?.email || '';
                        
                        if (userEmail) {
                            chrome.runtime.sendMessage({
                                action: 'increment_count',
                                userEmail: userEmail
                            });
                        }
                    } catch (e) {
                        // Ignore count increment errors
                    } finally {
                        setTimeout(() => { isIncrementing = false; }, 500);
                    }
                };
            }
        }

    async startStreaming(inputElement, iconElement, inputText, popup) {

        const streamText = popup.querySelector('#stream-text');
        if (!streamText) {

            return;
        }

        // Show loading
        streamText.textContent = 'Enhancing your prompt...';

        // Set up simple message listener
        this.streamMessageListener = (message) => {
            if (message.action === 'stream_chunk') {
                const aiText = message.chunk?.data || '';
                if (aiText) {
                    // Safely render text with preserved line breaks
                    streamText.innerHTML = this.toHtmlWithLineBreaks(aiText);
                }
            } else if (message.action === 'stream_complete') {
                // CRITICAL FIX: Get the original text with line breaks preserved
                // Convert <br> tags back to \n for proper insertion
                const originalText = streamText.innerHTML.replace(/<br\s*\/?>/gi, '\n');
                this.showInsertButton(popup, originalText, inputElement);
            } else if (message.action === 'limit_reached') {
                // Backend detected limit reached during streaming

                this.showLimitNotification(inputElement);
                // Close popup since limit is reached
                this.closePopup();
            } else if (message.action === 'stream_error') {
                streamText.textContent = `Error: ${message.error}`;
            }
        };

        // Add listener and make API call
        chrome.runtime.onMessage.addListener(this.streamMessageListener);

        try {
            const targetModel = this.detectTargetModel();
            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
            
            // Get user email from storage (most reliable method)
            let userEmail = '';
            
            try {
                // Always try storage first - it's the most reliable
                const userData = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_info'], resolve);
                });
                userEmail = userData.user_info?.email || '';

            } catch (storageError) {
                // Storage error
            }
            
            // Fallback: try popup display (only if storage failed)
            if (!userEmail) {
                try {
                    const popupEmail = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({action: 'get_user_email'}, (response) => {
                            resolve(response?.email || '');
                        });
                    });
                    userEmail = popupEmail;

                } catch (popupError) {
                    // Popup email error
                }
            }
            
            if (!userEmail) {
                // CRITICAL FIX: Instead of showing error, redirect to login flow
                // This fixes the cross-tab switching issue by ensuring user is always logged in
                streamText.textContent = ' Please reload your page ';

                // Open popup to trigger login
                setTimeout(() => {
                    chrome.runtime.sendMessage({ action: 'open_popup_for_login' }, (response) => {
                        if (chrome.runtime.lastError) {
                            streamText.textContent = ' Reload your page ';
                        }
                    });
                }, 1000);
                return;
            }

            // Check if background script is available
            if (!chrome.runtime) {

                streamText.textContent = 'Error: Extension not properly loaded. Please refresh the page.';
                return;
            }

            // DOUBLE SAFETY CHECK: FINAL VERIFICATION before API call
            // This is the LAST LINE OF DEFENSE against money-wasting API calls
            const finalCheckData = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info', 'last_known_prompt_count'], resolve);
            });

            const finalPromptCount = finalCheckData.last_known_prompt_count || 0;
            const finalUserTier = finalCheckData.user_info?.subscription_tier || 'free';
            const cachedEmail = finalCheckData.user_info?.email;

            // CRITICAL FIX: Verify we're checking the SAME user who's currently logged in
            if (cachedEmail && cachedEmail !== userEmail) {
                // Email mismatch detected, forcing fresh backend check
                // Don't use cached data - force fresh backend check
            }

            //  FINAL SAFETY CHECK: Only block if actually at limit
            if (finalUserTier === 'free' && userEmail) {
                try {
                    const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
                    const finalCheck = await fetch(`${apiUrl}/api/v1/payment/subscription-status/${encodeURIComponent(userEmail)}`, {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' },
                        signal: AbortSignal.timeout(2000)
                    });

                    if (finalCheck.ok) {
                        const finalStatus = await finalCheck.json();
                        const finalDailyUsed = finalStatus.daily_prompts_used || 0;

                        // Only block if actually at 10+ prompts (limit reached)
                        if (finalDailyUsed >= 10) {
                            this.showLimitNotification(inputElement);
                            streamText.textContent = 'You\'ve used all 10 free prompts today. Your free prompts will reset tomorrow, or upgrade to Pro for unlimited access.';
                            return;
                        }
                    }
                } catch (e) {
                    // Allow if check fails - backend will enforce
                }
            }

            // Test background script connectivity first
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    streamText.textContent = 'Please reload your page.';
                    return;
                }
                // Background script is running
            });

            const messageData = {
                action: 'stream_enhance',
                apiUrl,
                prompt: inputText,
                targetModel,
                userEmail: userEmail,
                platform: targetModel,
                idempotencyKey: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
            };

            // Sending API call to background script

            // Add timeout for message sending
            const messageTimeout = setTimeout(() => {
                // API call timeout, background script not responding
                streamText.textContent = 'Error: Background script not responding. Please refresh the page.';
            }, 5000);

            chrome.runtime.sendMessage(messageData, (response) => {
                clearTimeout(messageTimeout);
                
                if (chrome.runtime.lastError) {
                    streamText.textContent = 'Error: Extension not responding. Please refresh the page and try again.';
                    return;
                }

            });

        } catch (error) {

            streamText.textContent = 'Enhancement failed. Please try again.';
        }
    }

    abortStreaming() {
        if (this.isStreaming && this.currentStreamAbortController) {

            this.currentStreamAbortController.abort();
            this.isStreaming = false;
        }

        // Remove stream listener
        if (this.streamMessageListener) {
            chrome.runtime.onMessage.removeListener(this.streamMessageListener);
            this.streamMessageListener = null;
        }
    }

    positionPopup(popup, iconElement) {
        const iconRect = iconElement.getBoundingClientRect();
        const popupWidth = 400;
        const popupHeight = 340;
        const spacing = 8; // Closer spacing
        
        // Always position close to the icon - prioritize staying near the icon
        let left = iconRect.right + spacing;
        let top = iconRect.top - 10; // Slightly down from top
        
        // Smart positioning: only adjust minimally to stay close to icon
        if (left + popupWidth > window.innerWidth - 16) {
            // First try: shift just enough to fit, staying close to icon
            const overflowAmount = (left + popupWidth) - (window.innerWidth - 16);
            left = left - overflowAmount;
            
            // If that pushes it too far left, position it to the left of the icon instead
            // but still keep it close
            if (left < iconRect.left - popupWidth - spacing) {
                left = iconRect.left - popupWidth - spacing;

            } else {

            }
        }
        
        // Minimum distance from viewport edge, but prioritize staying near icon
        if (left < 8) {
            left = 8;
        }
        
        // Adjust vertical position if needed, but keep close to icon
        if (top + popupHeight > window.innerHeight - 16) {
            // Try positioning above the icon first
            const aboveTop = iconRect.top - popupHeight - spacing;
            if (aboveTop >= 8) {
                top = aboveTop;

            } else {
                // If no space above, position at top but keep horizontal position close to icon
                top = 8;

            }
        }
        if (top < 8) {
            top = 8;
        }
        
        popup.style.position = 'fixed';
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.zIndex = '1000000';

    }

    // This method is now deprecated - we use showFinalResult instead
    showUpgradeModal(popup, details) {

        const content = popup.querySelector('.ce-content');
        content.innerHTML = `
            <div class="ce-upgrade-modal">
                <div class="ce-upgrade-header">
                    <h3>Free Prompts Used Up!</h3>
                </div>
                <div class="ce-upgrade-body">
                    <p>You've used all <strong>10 free prompts</strong> today.</p>
                    <p>Your free prompts will reset tomorrow, or upgrade to Pro for <strong>unlimited access</strong>!</p>
                    <div class="ce-upgrade-features">
                        <div class="ce-feature"> Unlimited daily prompts</div>
                        <div class="ce-feature"> Priority processing</div>
                        <div class="ce-feature"> Advanced AI models</div>
                    </div>
                    <div class="ce-upgrade-price">
                        <span class="ce-price">$5<span class="ce-period">/month</span></span>
                        <span class="ce-cancel">Cancel anytime</span>
                    </div>
                </div>
                <div class="ce-upgrade-actions">
                    <button class="ce-upgrade-btn" onclick="window.open('${window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000'}/api/v1/payment/checkout-page?order_id=temp&user_email=${details?.user_email || ''}', '_blank')">
                        Upgrade to Pro
                    </button>
                    <button class="ce-cancel-btn" onclick="this.closest('.ce-popup').remove()">
                        Maybe Later
                    </button>
                </div>
            </div>
        `;
        
        // Add styles for upgrade modal
        const style = document.createElement('style');
        style.textContent = `
            .ce-upgrade-modal {
                text-align: center;
                padding: 20px;
                max-width: 350px;
            }
            .ce-upgrade-header h3 {
                color: #ff6b35;
                margin: 0 0 15px 0;
                font-size: 18px;
            }
            .ce-upgrade-body p {
                margin: 10px 0;
                color: #333;
            }
            .ce-upgrade-features {
                background: #f8f9fa;
                padding: 15px;
                border-radius: 8px;
                margin: 15px 0;
            }
            .ce-feature {
                color: #28a745;
                margin: 5px 0;
                font-size: 14px;
            }
            .ce-upgrade-price {
                margin: 15px 0;
            }
            .ce-price {
                font-size: 24px;
                font-weight: bold;
                color: #007bff;
            }
            .ce-period {
                font-size: 14px;
                color: #666;
            }
            .ce-cancel {
                display: block;
                color: #666;
                font-size: 12px;
                margin-top: 5px;
            }
            .ce-upgrade-actions {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            .ce-upgrade-btn {
                flex: 1;
                background: #007bff;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: bold;
            }
            .ce-upgrade-btn:hover {
                background: #0056b3;
            }
            .ce-cancel-btn {
                flex: 1;
                background: #6c757d;
                color: white;
                border: none;
                padding: 12px;
                border-radius: 6px;
                cursor: pointer;
            }
            .ce-cancel-btn:hover {
                background: #545b62;
            }
        `;
        document.head.appendChild(style);
    }

    // Center notification - 3 seconds only
    showLimitNotification(inputElement) {
        // Remove any existing notification
        const existingNotification = document.querySelector('.ce-limit-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // Create center notification
        const notification = document.createElement('div');
        notification.className = 'ce-limit-notification';
        notification.innerHTML = `
            <div style="
                background: #DC2626;
                color: #FFFFFF;
                padding: 8px 16px;
                font-size: 14px;
                font-weight: 500;
                text-align: center;
                box-shadow: 0 3px 8px rgba(0,0,0,0.3);
                z-index: 99999;
                position: fixed;
                top: 10%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.8);
                border-radius: 6px;
                border: 2px solid #B91C1C;
                white-space: normal;
                transition: transform 0.3s ease-out;
                max-width: 280px;
                line-height: 1.3;
            ">
                You've used all 10 free prompts today. Your free prompts will reset tomorrow, or upgrade to Pro for unlimited access.
            </div>
        `;

        document.body.appendChild(notification);

        // Animate in from center
        setTimeout(() => {
            const notificationBar = notification.querySelector('div');
            notificationBar.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 10);

        // Auto remove after 3 seconds with animation
        setTimeout(() => {
            if (notification.parentNode) {
                const notificationBar = notification.querySelector('div');
                notificationBar.style.transform = 'translate(-50%, -50%) scale(0.8)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 3000);
    }

    async showEnhancedResultWithAnimation(popup, enhancedText, inputElement) {
        const content = popup.querySelector('.ce-content');

        // Stop processing animation
        const icon = this.icons.get(inputElement);
        if (icon) {
            icon.classList.remove('processing');
        }

        // Handle authentication error
        if (!enhancedText) {
            content.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="color: #dc3545; font-size: 16px; margin-bottom: 10px;"> Authentication Required</div>
                    <div style="color: #808080; font-size: 14px; line-height: 1.5;">
                        Please sign in with Google to use AI enhancement.<br>
                        Click the extension icon to sign in.
                    </div>
                </div>
            `;
            return;
        }

        // Use the new optimized method
        this.showFinalResult(content, enhancedText, inputElement, popup);
    }
    
    animateTextWordByWord(container, text, onComplete = () => {}) {

        const words = text.split(' ');
        let currentIndex = 0;

        // Clear container content
        container.innerHTML = '';

        // Create the container for animated text
        const textContainer = document.createElement('div');
        textContainer.id = 'animated-text';
        textContainer.style.cssText = 'font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;';
        container.appendChild(textContainer);

        const animateNextWord = () => {
            if (currentIndex < words.length) {
                const word = words[currentIndex];
                const space = currentIndex < words.length - 1 ? ' ' : '';

                // Add word with instant effect (no fade delay)
                const wordSpan = document.createElement('span');
                wordSpan.textContent = word + space;
                wordSpan.style.opacity = '1'; // Start visible immediately
                wordSpan.style.transition = 'none'; // Remove transition for instant effect

                textContainer.appendChild(wordSpan);

                currentIndex++;

                // ULTRA FAST animation - 5ms between words (lightning fast!)
                setTimeout(animateNextWord, 5);
            } else {

                onComplete();
            }
        };

        // Start animation immediately

        animateNextWord();

        // Return promise that resolves when animation completes
        return new Promise(resolve => {
            const checkComplete = () => {
                if (currentIndex >= words.length) {
                    resolve();
                } else {
                    setTimeout(checkComplete, 10);
                }
            };
            checkComplete();
        });
    }

    showFinalResult(container, finalText, inputElement, popup) {

        // Create text container for final result
        const textContainer = document.createElement('div');
        textContainer.id = 'final-text';
        textContainer.style.cssText = 'font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;';
        // Safely render text with preserved line breaks
        textContainer.innerHTML = this.toHtmlWithLineBreaks(finalText);
        container.appendChild(textContainer);

        // Show insert button
        const insertBtn = popup.querySelector('#insert-btn');
        if (insertBtn) {
            insertBtn.style.display = 'block';
            insertBtn.disabled = false;
            insertBtn.textContent = 'Insert';

            // DUPLICATE INSERT HANDLER - REMOVED
            // Count increment now only happens in showInsertButton() method above

        }
    }

    async enhancePrompt(text) {
        try {
            // Get auth token from storage
            const authToken = await new Promise((resolve) => {
                chrome.storage.local.get(['auth_token'], (result) => {
                    resolve(result.auth_token);
                });
            });

            if (!authToken) {

                return null; // This will trigger auth required message
            }

            // Detect target model based on current site
            const targetModel = this.detectTargetModel();
            

            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
            const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const platform = this.detectTargetModel();

            // Get user email with multiple fallbacks
            let userEmail = '';
            
            // Try storage first
            const userData = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            userEmail = userData.user_info?.email || '';
            
            // Fallback: try popup display if storage failed
            if (!userEmail) {
                try {
                    const popupEmail = await new Promise((resolve) => {
                        chrome.runtime.sendMessage({action: 'get_user_email'}, (response) => {
                            resolve(response?.email || '');
                        });
                    });
                    userEmail = popupEmail;
                } catch (popupError) {
                    // Popup email error
                }
            }

            if (!userEmail) {
                // User not logged in - open popup for login
                chrome.runtime.sendMessage({action: 'open_popup_for_login'}, (response) => {
                    if (chrome.runtime.lastError) {
                        // Failed to open popup
                    }
                });
                return null;
            }

            // Use background to perform the network call so content-script context invalidation cannot break it
            const data = await new Promise((resolve, reject) => {
                const messageData = {
                    action: 'enhance_prompt',
                    apiUrl,
                    prompt: text,
                    targetModel,
                    userEmail: userEmail,
                    platform,
                    idempotencyKey
                };
                

                chrome.runtime.sendMessage(messageData, (resp) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                        return;
                    }
                    if (!resp || !resp.success) {
                        reject(new Error(resp?.error || 'Enhance failed'));
                    } else {
                        resolve(resp.data);
                    }
                });
            });

            // Update local last-known count immediately (no popup blink)
            if (typeof data.user_prompt_count === 'number') {
                try {
                    chrome.storage.local.set({ last_known_prompt_count: data.user_prompt_count });
                } catch (e) { /* ignore */ }
            }
            
            
            return data.enhanced_prompt;
            
        } catch (error) {

            return this.getFallbackEnhancement(text);
        }
    }

    detectTargetModel() {
        const hostname = window.location.hostname;
        
        
        if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
            return 'gpt-5';
        } else if (hostname.includes('claude.ai')) {
            return 'claude-3-5-sonnet';
        } else if (hostname.includes('gemini.google.com')) {
            return 'gemini-1.5-pro';
        } else if (hostname.includes('perplexity.ai')) {
            return 'perplexity-sonar';
        } else if (hostname.includes('meta.ai')) {
            return 'meta-llama-3';
        } else if (hostname.includes('poe.com')) {
            return 'gpt-5';
        }
        
        return 'gpt-5'; // Default fallback for ChatGPT
    }

    getFallbackEnhancement(text) {
        return `Please provide a comprehensive and detailed response to the following query, ensuring accuracy and clarity:

${text}

Additional context: Please structure your response in a clear, organized manner with relevant examples where appropriate.`;
    }

    formatText(text) {
        //  CRITICAL FIX: Return AI text EXACTLY as generated - no processing!
        // The AI generates perfectly structured prompts - we must preserve them completely!
        
        // Only trim leading/trailing whitespace, keep ALL internal structure
        return text.trim();
    }

    insertText(text, inputElement) {
        // CRITICAL FIX: Use text EXACTLY as it appears in the small UI - NO processing!
        // The small UI shows perfect structure, so we must preserve it exactly
        
        // Focus the element first
        inputElement.focus();
        
        // GEMINI-SPECIFIC FIX: Detect if we're on Gemini and use special handling
        const isGemini = window.location.hostname.includes('gemini.google.com');
        
        if (isGemini) {
            // GEMINI SPECIAL HANDLING: More aggressive approach to prevent interference
            
            // Store original value to prevent reversion
            const originalValue = inputElement.value || inputElement.textContent || '';
            
            // Method 1: Direct value setting for textarea
            if (inputElement.tagName === 'TEXTAREA') {
                inputElement.value = text;
                
                // Trigger multiple events to ensure Gemini recognizes the change
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                inputElement.dispatchEvent(new Event('keyup', { bubbles: true }));
                
                // Set cursor to end
                inputElement.setSelectionRange(text.length, text.length);
                
            } else if (inputElement.contentEditable === 'true') {
                // Method 2: Direct textContent for contenteditable
                inputElement.textContent = text;
                
                // Trigger events
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                
                // Set cursor to end
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(inputElement);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // GEMINI ANTI-REVERSION: Monitor for any attempts to revert the text
            let revertAttempts = 0;
            const maxRevertAttempts = 5;
            
            const preventReversion = () => {
                const currentValue = inputElement.value || inputElement.textContent || '';
                
                // If the text has been reverted to original or cleared, restore it
                if (currentValue !== text && (currentValue === originalValue || currentValue === '')) {
                    revertAttempts++;
                    
                    if (revertAttempts <= maxRevertAttempts) {
                        if (inputElement.tagName === 'TEXTAREA') {
                            inputElement.value = text;
                        } else {
                            inputElement.textContent = text;
                        }
                        
                        // Re-trigger events
                        inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                        inputElement.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }
            };
            
            // Monitor for reversions for 3 seconds
            const monitorInterval = setInterval(preventReversion, 100);
            setTimeout(() => {
                clearInterval(monitorInterval);
            }, 3000);
            
        } else {
            // STANDARD INSERTION for other platforms (ChatGPT, Claude, Perplexity, etc.)
            
            // CRITICAL FIX: Select all existing text first, then replace with paste
            if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
                // For textarea/input, select all
                inputElement.select();
                inputElement.setSelectionRange(0, inputElement.value.length);
            } else if (inputElement.contentEditable === 'true') {
                // For contenteditable divs (ChatGPT, Claude, Perplexity)
                // Select all content using Selection API
                const range = document.createRange();
                range.selectNodeContents(inputElement);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            }
            
            // Small delay to ensure selection is registered
            setTimeout(() => {
                // UNIVERSAL FIX: Use paste event for ALL platforms to preserve structure
                // This will REPLACE the selected text (old prompt) with new enhanced prompt
                const dataTransfer = new DataTransfer();
                dataTransfer.setData('text/plain', text); // Use original text with ALL line breaks intact
                
                const pasteEvent = new ClipboardEvent('paste', {
                    clipboardData: dataTransfer,
                    bubbles: true,
                    cancelable: true
                });
                
                inputElement.dispatchEvent(pasteEvent);
                
                // Also trigger input event to ensure the platform recognizes the change
                inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                inputElement.dispatchEvent(new Event('change', { bubbles: true }));
            }, 10); // Small delay to ensure selection is complete
        }
    }

    closePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }
    }

    removeAllIcons() {

        this.icons.forEach((icon, inputElement) => {
            if (icon.intervalUpdate) {
                clearInterval(icon.intervalUpdate);
            }
            if (icon.updatePosition) {
                window.removeEventListener('scroll', icon.updatePosition);
                window.removeEventListener('resize', icon.updatePosition);
            }
            // Cleanup auto-repositioning listeners
            if (icon._cleanup) {
                icon._cleanup();
            }
            icon.remove();
        });
        this.icons.clear();
        
        // Clear all creation locks
        this.iconCreationLock.clear();

        // Also clean up any orphaned icons in the DOM
        const orphanedIcons = document.querySelectorAll('.ce-icon');
        orphanedIcons.forEach(icon => {

            icon.remove();
        });
        
        // Clean up any remaining duplicate icons
        this.cleanupOrphanedIcons();

    }

    setupGlobalListeners() {
        // Close popup on outside click
        document.addEventListener('click', (e) => {
            if (this.activePopup && !this.activePopup.contains(e.target)) {
                const isIcon = e.target.closest('.ce-icon');
                if (!isIcon) {
                    this.closePopup();
                }
            }
        });

        // Close popup on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activePopup) {
                this.closePopup();
                this.icons.forEach((icon) => {
                    icon.classList.remove('processing');
                });
            }
        });

        // Monitor URL changes for chat switches (especially important for ChatGPT)
        this.monitorUrlChanges();
    }

    monitorUrlChanges() {
        let currentUrl = window.location.href;
        let currentChatId = this.extractChatId(window.location.href);
        
        // Check for URL changes every 200ms (more aggressive)
        setInterval(() => {
            const newUrl = window.location.href;
            const newChatId = this.extractChatId(newUrl);
            
            if (newUrl !== currentUrl || newChatId !== currentChatId) {

                currentUrl = newUrl;
                currentChatId = newChatId;
                
                // AGGRESSIVE cleanup - remove ALL icons immediately
                this.aggressiveCleanup();
                
                // Wait for new chat to load, then scan for new inputs
                setTimeout(() => {
                    if (this.isActive) {

                        this.scanForInputs(true);
                    }
                }, 200); // Reduced delay for faster response
            }
        }, 200); // More frequent checking
        
        // Also listen for navigation events
        window.addEventListener('popstate', () => {

            this.aggressiveCleanup();
            
            setTimeout(() => {
                if (this.isActive) {
                    this.scanForInputs(true);
                }
            }, 200);
        });
        
        // Listen for pushState/replaceState changes (used by SPAs like ChatGPT)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;
        
        history.pushState = function(...args) {
            originalPushState.apply(history, args);
            window.dispatchEvent(new Event('popstate'));
        };
        
        history.replaceState = function(...args) {
            originalReplaceState.apply(history, args);
            window.dispatchEvent(new Event('popstate'));
        };
        
        // Listen for ChatGPT-specific events
        this.listenForChatGPTSpecificEvents();
    }

    extractChatId(url) {
        // Extract chat ID from ChatGPT URLs
        const match = url.match(/\/c\/([a-f0-9-]+)/);
        return match ? match[1] : null;
    }

    aggressiveCleanup() {

        // Clear all internal state
        this.icons.clear();
        this.iconCreationLock.clear();
        
        // Remove ALL icons from DOM (including any hidden or orphaned ones)
        const allIcons = document.querySelectorAll('.ce-icon');
        allIcons.forEach(icon => {

            icon.remove();
        });
        
        // Also remove any icons that might be in the body
        const bodyIcons = document.body.querySelectorAll('.ce-icon');
        bodyIcons.forEach(icon => {

            icon.remove();
        });

    }

    listenForChatGPTSpecificEvents() {
        // Listen for ChatGPT-specific DOM changes that indicate chat switches
        const chatObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if this looks like a chat switch
                    const addedNodes = Array.from(mutation.addedNodes);
                    const hasChatSwitch = addedNodes.some(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for elements that indicate new chat content
                            return node.querySelector && (
                                node.querySelector('[data-testid*="conversation"]') ||
                                node.querySelector('[data-testid*="chat"]') ||
                                node.querySelector('[data-testid*="composer"]') ||
                                node.querySelector('textarea[placeholder*="Ask anything"]')
                            );
                        }
                        return false;
                    });
                    
                    if (hasChatSwitch) {

                        this.aggressiveCleanup();
                        
                        setTimeout(() => {
                            if (this.isActive) {
                                this.scanForInputs(true);
                            }
                        }, 100);
                    }
                }
            });
        });
        
        chatObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    async checkLoginStatus() {
        try {
            // Check if extension context is still valid
            if (!chrome.storage || !chrome.storage.local) {
                // Extension context invalidated, skipping login check
                return;
            }
            
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            
            this.userInfo = result.user_info;
            if (this.userInfo && this.userInfo.email) {
                // User is logged in
                // User is logged in, extension can be active if toggled
            } else {
                // User is not logged in, deactivating extension
                // CRITICAL FIX: If user is not logged in, force deactivation
                this.deactivate();
            }
        } catch (error) {
            // Don't log extension context errors - they're normal
            if (!error.message || !error.message.includes('Extension context invalidated')) {
                // Error checking login status
            }
            // On error, assume not logged in and deactivate
            this.deactivate();
        }
    }

    // CRITICAL FIX: Periodic check to ensure P button disappears on logout
    startPeriodicLoginCheck() {
        // Check every 2 seconds if user is still logged in
        setInterval(async () => {
            if (this.isActive) {
                const result = await new Promise((resolve) => {
                    chrome.storage.local.get(['user_info'], resolve);
                });
                
                if (!result.user_info || !result.user_info.email) {
                    // User logged out detected, deactivating extension
                    this.deactivate();
                }
            }
        }, 2000);
    }

    makePopupDraggable(popup) {
        const content = popup.querySelector('.ce-content');
        let isDragging = false, startX, startY, startLeft, startTop;
        content.style.cursor = 'move';

        content.onmousedown = (e) => {
            // Don't drag if clicking on buttons
            if (e.target.closest('.ce-close-btn') || e.target.closest('.ce-insert-btn')) {
                return;
            }

            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = popup.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;

            document.onmousemove = (e2) => {
                if (!isDragging) return;
                let newLeft = startLeft + (e2.clientX - startX);
                let newTop = startTop + (e2.clientY - startY);

                const popupWidth = popup.offsetWidth;
                const popupHeight = popup.offsetHeight;
                newLeft = Math.max(8, Math.min(window.innerWidth - popupWidth - 8, newLeft));
                newTop = Math.max(8, Math.min(window.innerHeight - popupHeight - 8, newTop));

                popup.style.left = `${newLeft}px`;
                popup.style.top = `${newTop}px`;
            };

            document.onmouseup = () => {
                isDragging = false;
                document.onmousemove = null;
                document.onmouseup = null;
            };
        };
    }
}

// Initialize the enhancer
if (!window.magicalEnhancer) {
    window.magicalEnhancer = new MagicalEnhancer();
}






