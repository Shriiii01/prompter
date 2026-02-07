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
        this.isInserting = false; // Flag to prevent duplicate icons during insertion
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
            /* ========================================
               P ICON - Draggable button near input
               ======================================== */
            .ce-icon {
                position: fixed !important;
                width: 38px !important;
                height: 38px !important;
                background: #2c2c2c !important;
                border: none !important;
                border-radius: 50% !important;
                cursor: grab !important;
                z-index: 999999 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
                font-size: 18px !important;
                font-weight: bold !important;
                color: white !important;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
                user-select: none !important;
                transition: transform 0.15s ease, box-shadow 0.15s ease !important;
            }
            .ce-icon:hover {
                background: #1a1a1a !important;
                transform: scale(1.1) !important;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
            }
            .ce-icon:active,
            .ce-icon.dragging {
                cursor: grabbing !important;
                transform: scale(1.05) !important;
            }
            .ce-icon.processing {
                animation: ce-pulse 1s infinite !important;
            }
            @keyframes ce-pulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.7; transform: scale(1.05); }
            }

            /* ========================================
               ENHANCEMENT POPUP - Fixed, not draggable
               ======================================== */
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
                overflow: hidden !important;
                display: flex !important;
                flex-direction: column !important;
            }
            .ce-content {
                padding: 16px !important;
                padding-bottom: 70px !important;
                flex: 1 !important;
                overflow-y: auto !important;
                font-size: 15px !important;
                line-height: 1.6 !important;
                position: relative !important;
            }
            .ce-close-btn {
                position: absolute !important;
                top: 12px !important;
                right: 12px !important;
                background: none !important;
                border: none !important;
                color: #888 !important;
                font-size: 20px !important;
                cursor: pointer !important;
                width: 28px !important;
                height: 28px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                border-radius: 4px !important;
            }
            .ce-close-btn:hover {
                background: #333 !important;
                color: #fff !important;
            }
            .ce-insert-btn {
                position: absolute !important;
                bottom: 16px !important;
                left: 16px !important;
                background: #2D9CDB !important;
                color: white !important;
                border: none !important;
                padding: 10px 20px !important;
                border-radius: 6px !important;
                cursor: pointer !important;
                font-weight: 600 !important;
                font-size: 14px !important;
                z-index: 1000001 !important;
            }
            .ce-insert-btn:hover {
                background: #1E7BB8 !important;
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
            }
        });
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
            // Skip if we are currently inserting text (prevents duplicate icons)
            if (this.isInserting) return;

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
        if (!bypassDebounce && now - this.lastScanTime < 100) { 
            return;
        }
        this.lastScanTime = now;

        // AGGRESSIVE CLEANUP: First remove ALL duplicates immediately
        // This ensures we start clean every scan
        this.removeDuplicateIcons();
        this.cleanupOrphanedIcons();

        // Optimized selectors
        const selectors = [
            'div[contenteditable="true"][data-placeholder*="Talk with Claude"]',
            'div[contenteditable="true"][aria-label*="Write a message"]',
            'div.ProseMirror[contenteditable="true"]',

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

        let newlyAdded = 0;

        // Find ALL potential inputs first
        let allInputs = [];
        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => allInputs.push(el));
        }

        // Deduplicate elements (selectors might overlap)
        const uniqueInputs = [...new Set(allInputs)];

        // Prioritize inputs: prefer visible, larger inputs
        uniqueInputs.sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            return (rectB.width * rectB.height) - (rectA.width * rectA.height);
        });

        // ONLY add icon to the SINGLE BEST input found
        for (const element of uniqueInputs) {
            // 1. Valid check
            if (!this.isValidInputFast(element)) continue;

            // 2. Check if ANY icon exists on the page for THIS input ID
            const inputId = this.getInputId(element);
            const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
            
            if (existingIcon) {
                // Verify position - if it's far away, it might be detached
                const iconRect = existingIcon.getBoundingClientRect();
                const inputRect = element.getBoundingClientRect();
                const distance = Math.sqrt(
                    Math.pow(iconRect.left - inputRect.right, 2) + 
                    Math.pow(iconRect.top - inputRect.top, 2)
                );
                
                if (distance > 200) {
                    // Icon is too far, remove it and recreate
                    existingIcon.remove();
                    this.icons.delete(element);
                    this.iconCreationLock.delete(inputId);
                } else {
                    // Icon is good, skip this input
                    continue;
                }
            }

            // 3. Check if input is already marked
            if (element.dataset.pgHasIcon === 'true' && document.querySelector(`[data-input-id="${inputId}"]`)) {
                continue;
            }

            // 4. GLOBAL SINGLETON CHECK (Strict Mode)
            // If there is ALREADY an icon on the screen that looks valid, DO NOT add another one
            // unless the new input is clearly different and far away
            const anyIcon = document.querySelector('.ce-icon');
            if (anyIcon) {
                const anyIconRect = anyIcon.getBoundingClientRect();
                const inputRect = element.getBoundingClientRect();
                // If the input is physically close to an existing icon, assume covered
                if (Math.abs(inputRect.top - anyIconRect.top) < 100) {
                    continue;
                }
            }

            // Passed checks - Add the icon
            this.addIconToInput(element);
            newlyAdded++;
            
            // CRITICAL: Break immediately after adding 1 icon. 
            // We prefer to miss a secondary input than to spam duplicate icons.
            // Most chat interfaces only have ONE main input.
            break; 
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
        
        // PRODUCTION GRADE DUPLICATE PREVENTION
        // 1. Check internal map
        if (this.icons.has(inputElement)) {
            return;
        }
        
        // 2. Check DOM marker (most robust)
        if (inputElement.dataset.pgHasIcon === 'true') {
            // Verify if icon actually exists
            const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
            if (existingIcon) {
                return;
            } else {
                // False positive marker - clean it up
                delete inputElement.dataset.pgHasIcon;
            }
        }
        
        // 3. Check creation lock
        if (this.iconCreationLock.has(inputId)) {
            return;
        }
        
        // 4. Check DOM for existing icon by ID
        const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
        if (existingIcon) {
            // Mark input as having icon since the icon exists
            inputElement.dataset.pgHasIcon = 'true';
            return;
        }
        
        // 5. Proximity check
        const rect = inputElement.getBoundingClientRect();
        const nearbyIcons = document.querySelectorAll('.ce-icon');
        for (const icon of nearbyIcons) {
            const iconRect = icon.getBoundingClientRect();
            const distance = Math.sqrt(
                Math.pow(iconRect.left - rect.right, 2) + 
                Math.pow(iconRect.top - rect.top, 2)
            );
            if (distance < 50) { // Reduced radius check
                return;
            }
        }
        
        // Lock this input to prevent duplicates during creation
        this.iconCreationLock.add(inputId);

        try {
            const icon = document.createElement('div');
            icon.className = 'ce-icon';
            icon.innerHTML = this.createPLogo();
            icon.title = 'Improve with PromptGrammerly';
            icon.setAttribute('data-input-id', inputId);
            icon.setAttribute('role', 'button');
            
            // Fast positioning - immediate placement without complex calculations
            this.positionIconFast(icon, inputElement);
            
            // Make icon draggable and clickable
            this.makeIconDraggableAndClickable(icon, inputElement);
            
            // Add to DOM immediately
            document.body.appendChild(icon);
            this.icons.set(inputElement, icon);
            
            // Mark the input element itself
            inputElement.dataset.pgHasIcon = 'true';
            
            // Store reference for positioning updates
            icon._targetElement = inputElement;
            
            //  AUTO-REPOSITIONING: Keep icon positioned relative to input on scroll/resize
            this.setupAutoRepositioning(icon, inputElement);

        } finally {
            // Always unlock after creation attempt
            setTimeout(() => {
                this.iconCreationLock.delete(inputId);
            }, 50); 
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
                if (icon._cleanup) icon._cleanup();
                icon.remove();
                this.icons.delete(inputElement);
                // Clean marker
                delete inputElement.dataset.pgHasIcon;
            }
        });
        
        // Scan specifically for inputs with markers but no icons (ghost markers)
        const markedInputs = document.querySelectorAll('[data-pg-has-icon="true"]');
        markedInputs.forEach(input => {
            if (!this.icons.has(input)) {
                // It's marked but we don't track it. Check if icon exists in DOM.
                const inputId = this.getInputId(input);
                const domIcon = document.querySelector(`[data-input-id="${inputId}"]`);
                if (!domIcon) {
                    // No icon exists, clear marker
                    delete input.dataset.pgHasIcon;
                } else {
                    // Icon exists but not in our map? Re-track it if possible, or remove icon to let it be recreated
                    domIcon.remove();
                    delete input.dataset.pgHasIcon;
                }
            }
        });
    }

    positionIconFast(icon, inputElement) {
        const rect = inputElement.getBoundingClientRect();
        const iconSize = 38;
        const spacing = 12;
        
        // Position to the RIGHT of the input box
        let left = rect.right + spacing;
        let top = rect.top + (rect.height - iconSize) / 2;
        
        // If no space on right, position on left side
        if (left + iconSize > window.innerWidth - 10) {
            left = rect.left - iconSize - spacing;
        }
        
        // Keep within viewport bounds
        left = Math.max(10, Math.min(left, window.innerWidth - iconSize - 10));
        top = Math.max(10, Math.min(top, window.innerHeight - iconSize - 10));
        
        // CRITICAL: Set position fixed for dragging to work
        icon.style.position = 'fixed';
        icon.style.left = `${left}px`;
        icon.style.top = `${top}px`;
        
        // Store for repositioning
        icon._lastPosition = { left, top };
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
        // State for drag detection
        let isDragging = false;
        let hasMoved = false;
        let startX = 0;
        let startY = 0;
        let iconStartX = 0;
        let iconStartY = 0;

        // Mouse down - start potential drag
        const onMouseDown = (e) => {
            if (e.button !== 0) return; // Only left click
            
            e.preventDefault();
            e.stopPropagation();
            
            isDragging = true;
            hasMoved = false;
            
            startX = e.clientX;
            startY = e.clientY;
            
            const rect = icon.getBoundingClientRect();
            iconStartX = rect.left;
            iconStartY = rect.top;
            
            icon.style.cursor = 'grabbing';
            icon.classList.add('dragging');
            icon._isDragging = true;
            
            // Add global listeners
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        // Mouse move - drag the icon
        const onMouseMove = (e) => {
            if (!isDragging) return;
            
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            // Only mark as moved if dragged more than 5px
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                hasMoved = true;
            }
            
            let newX = iconStartX + dx;
            let newY = iconStartY + dy;
            
            // Keep within viewport
            newX = Math.max(10, Math.min(newX, window.innerWidth - 48));
            newY = Math.max(10, Math.min(newY, window.innerHeight - 48));
            
            icon.style.left = newX + 'px';
            icon.style.top = newY + 'px';
        };

        // Mouse up - end drag or trigger click
        const onMouseUp = (e) => {
            if (!isDragging) return;
            
            isDragging = false;
            icon._isDragging = false;
            icon.style.cursor = 'grab';
            icon.classList.remove('dragging');
            
            // Remove global listeners
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            
            // If didn't move, treat as click
            if (!hasMoved) {
                icon.classList.add('processing');
                this.handleIconClick(inputElement, icon);
            } else {
                // Save dragged position
                this.saveIconPosition(inputElement, parseInt(icon.style.left), parseInt(icon.style.top));
            }
        };

        // Attach mousedown to icon
        icon.addEventListener('mousedown', onMouseDown);
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
                <div id="stream-text"></div>
            </div>
            <button class="ce-close-btn" title="Close">×</button>
            <button class="ce-insert-btn" id="insert-btn" style="display: none;">Insert</button>
        `;

        document.body.appendChild(popup);
        this.activePopup = popup;
        this.positionPopup(popup, iconElement);

        popup.querySelector('.ce-close-btn').onclick = () => {
            this.closePopup();
            iconElement.classList.remove('processing');
        };

        // Start streaming the enhanced prompt
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

        // Initialize accumulator for real-time streaming
        this.lastReceivedText = '';
        
        // Set up simple message listener for REAL-TIME streaming (no animation, no delays)
        this.streamMessageListener = (message) => {
            if (message.action === 'stream_chunk') {
                const aiText = message.chunk?.data || '';
                if (aiText) {
                    // NATURAL STREAMING: Display chunks exactly as they arrive from OpenAI API
                    // No animation, no delays, no buffering - just show what we get from API
                    this.lastReceivedText += aiText;  // Accumulate chunks
                    // Update display IMMEDIATELY - words appear naturally as OpenAI generates them
                    streamText.innerHTML = this.toHtmlWithLineBreaks(this.lastReceivedText);
                }
            } else if (message.action === 'stream_complete') {
                // Use accumulated text or final text from backend
                const finalText = message.chunk?.data || this.lastReceivedText || '';
                // Ensure we have the complete text
                if (finalText && !this.lastReceivedText) {
                    this.lastReceivedText = finalText;
                    streamText.innerHTML = this.toHtmlWithLineBreaks(finalText);
                }
                this.showInsertButton(popup, finalText || this.lastReceivedText, inputElement);
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

            // SPEED OPTIMIZATION: Skip all safety checks for faster streaming

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

            // Add timeout for message sending (optimized for speed)
            const messageTimeout = setTimeout(() => {
                // API call timeout, background script not responding
                streamText.textContent = 'Error: Background script not responding. Please refresh the page.';
            }, 30000); // 30 seconds - faster timeout

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
        const spacing = 10;
        
        // Position to the right of the icon
        let left = iconRect.right + spacing;
        let top = iconRect.top;
        
        // If no space on right, position on left
        if (left + popupWidth > window.innerWidth - 16) {
            left = iconRect.left - popupWidth - spacing;
        }
        
        // If no space on left either, center horizontally
        if (left < 16) {
            left = Math.max(16, (window.innerWidth - popupWidth) / 2);
        }
        
        // Vertical bounds
        if (top + popupHeight > window.innerHeight - 16) {
            top = window.innerHeight - popupHeight - 16;
        }
        if (top < 16) {
            top = 16;
        }
        
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
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


    insertText(text, inputElement) {
        // CRITICAL FIX: Use text EXACTLY as it appears in the small UI - NO processing!
        // The small UI shows perfect structure, so we must preserve it exactly
        
        // PREVENT DUPLICATE ICONS: Stop observer during insertion
        this.isInserting = true;
        
        // Focus the element first
        inputElement.focus();
        
        // GEMINI-SPECIFIC FIX: Detect if we're on Gemini and use special handling
        const isGemini = window.location.hostname.includes('gemini.google.com');
        const isClaude = window.location.hostname.includes('claude.ai');
        
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
                this.isInserting = false; // Re-enable observer
            }, 3000);
            
        } else if (isClaude) {
            // 1. Focus
            inputElement.focus();
            
            // 2. Select all content
            const range = document.createRange();
            range.selectNodeContents(inputElement);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            
            // 3. Execute insertText command (replaces selection)
            // This correctly handles newlines and triggers internal editor state updates
            document.execCommand('insertText', false, text);
            
            // 4. Dispatch input event to be safe
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Re-enable observer after short delay
            setTimeout(() => {
                this.isInserting = false;
            }, 500);
            
        } else {
            // STANDARD INSERTION for other platforms (ChatGPT, Perplexity, etc.)
            
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
                
                // Re-enable observer
                setTimeout(() => {
                    this.isInserting = false;
                }, 500);
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

}

// Initialize the enhancer
if (!window.magicalEnhancer) {
    window.magicalEnhancer = new MagicalEnhancer();
}