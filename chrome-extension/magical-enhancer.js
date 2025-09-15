// 🪄 AI Magic - Prompt Enhancer Content Script (RESTORED ORIGINAL)
// ✅ FIXED: Extension context invalidated error with safe storage handling
console.log('🚀 AI Magic Content Script Loaded');

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

    init() {
        // Clean up any existing icons from previous instances
        this.cleanupExistingIcons();
        
        this.injectStyles();
        this.listenForMessages();
        this.setupGlobalListeners();
        this.checkLoginStatus();
        
        // Check if extension was already active before page reload
        this.checkAndRestoreActiveState();
        
        // Don't auto-activate - wait for toggle button (unless already active)
        console.log('✨ AI Magic ready - checking previous state');
        
        console.log('✨ AI Magic initialized');
    }

    // Safe storage utility methods
    safeStorageGet(keys, callback) {
        try {
            if (this.isStorageAvailable()) {
                chrome.storage.local.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        console.warn('⚠️ Storage get error:', chrome.runtime.lastError.message);
                        callback(null);
                        return;
                    }
                    callback(result);
                });
            } else {
                console.warn('⚠️ Chrome storage not available');
                callback(null);
            }
        } catch (error) {
            console.warn('⚠️ Storage operation failed:', error.message);
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
                        console.warn('⚠️ Storage set error:', chrome.runtime.lastError.message);
                    } else {
                        console.log('✅ Storage operation successful');
                    }
                    callback();
                });
            } else {
                console.warn('⚠️ Chrome storage not available');
                callback();
            }
        } catch (error) {
            console.warn('⚠️ Storage operation failed:', error.message);
            callback();
        }
    }

    cleanupExistingIcons() {
        // Remove any existing icons from previous instances
        const existingIcons = document.querySelectorAll('.ce-icon');
        if (existingIcons.length > 0) {
            console.log(`🧹 Cleaning up ${existingIcons.length} existing icons from previous instance`);
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
                console.log(`🧹 Removing ${icons.length - 1} duplicate icons for input ${inputId}`);
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
            
            console.log('🔍 Checking previous extension state:', result);
            
            if (result.extension_active) {
                console.log('🔄 Extension was active before reload - restoring icons');
                this.isActive = true;
                
                // Immediate attempt for instant results
                    this.scanForInputs(true); // Bypass debounce
                
                // Faster restore attempts with minimal delays
                const restoreAttempts = [100, 300, 600, 1000]; // Reduced delays
                
                restoreAttempts.forEach((delay, index) => {
                    setTimeout(() => {
                        console.log(`🔄 Restore attempt ${index + 1}: scanning for inputs`);
                        
                        // Force scan even with debouncing during restore
                        this.scanForInputs(true); // Bypass debounce
                        
                        // Check if we found any inputs
                        if (this.icons.size > 0) {
                            console.log(`✅ Successfully restored ${this.icons.size} icons on attempt ${index + 1}`);
                        } else {
                            console.log(`⏳ No inputs found yet on attempt ${index + 1} - will keep trying`);
                            
                            // If this is the last attempt and we still haven't found anything,
                            // try a less restrictive scan
                            if (index === restoreAttempts.length - 1) {
                                console.log('🔄 Final attempt with relaxed validation');
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
                        console.log('📄 DOMContentLoaded - scanning again');
                        this.scanForInputs(true); // Bypass debounce
                    });
                    
                    window.addEventListener('load', () => {
                        console.log('🌐 Window loaded - final scan');
                        this.scanForInputs(true); // Bypass debounce
                    });
                }
                
                // Monitor for dynamic content changes more aggressively during restore
                const restoreObserver = new MutationObserver(() => {
                    if (this.isActive && this.icons.size === 0) {
                        console.log('🔄 DOM change detected during restore - scanning');
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
                    console.log('🔄 Stopped aggressive restore monitoring');
                }, 5000);
                
            } else {
                console.log('💤 Extension was inactive before reload');
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
                    console.log(`🔍 Periodic check found ${afterCount - beforeCount} new inputs`);
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
            console.log('🔄 Transferred icon to new input element');
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
            }
        });
    }

    activate() {
        if (this.isActive) {
            console.log('✨ AI Magic already active');
            return;
        }
        
        this.isActive = true;
        console.log('✨ AI Magic activated - scanning for inputs');
        
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
        console.log('🛑 AI Magic deactivated');
    }

    scanForInputs(bypassDebounce = false) {
        // Reduced debouncing for faster response
        const now = Date.now();
        if (!bypassDebounce && now - this.lastScanTime < 100) { // Reduced from 500ms to 100ms
            console.log('🚫 Scan blocked - too frequent (debounced)');
            return;
        }
        this.lastScanTime = now;

        // Clean up any orphaned icons before scanning
        this.cleanupOrphanedIcons();

        // Optimized selectors for faster detection - focus on main chat inputs only
        const selectors = [
            // ChatGPT main input - most common
            'textarea[placeholder*="Ask anything"]',
            'textarea[placeholder*="Message ChatGPT"]',
            'div[contenteditable="true"][data-id*="root"]',
            // Claude main input
            'div[contenteditable="true"][data-placeholder*="Talk with Claude"]',
            // Gemini main input  
            'textarea[placeholder*="Enter a prompt here"]',
            // Perplexity main input
            'textarea[placeholder*="Ask anything"]',
            // Generic main chat inputs (as fallback)
            'textarea[data-testid*="composer"]',
            'div[contenteditable="true"]:not([role="textbox"]):not([aria-label*="search"])'
        ];

        console.log('🔍 Fast scanning for inputs...', { 
            isActive: this.isActive, 
            currentIcons: this.icons.size,
            readyState: document.readyState
        });

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
                    console.log('🚫 Input element already has icon - skipping');
                    continue;
                }
                
                if (this.iconCreationLock.has(inputId)) {
                    console.log('🚫 Icon creation already in progress - skipping');
                    continue;
                }
                
                // Check if there's already an icon in the DOM for this input
                const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
                if (existingIcon) {
                    console.log('🚫 Found existing icon in DOM - skipping duplicate creation');
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
                        console.log('🚫 Found nearby icon - preventing duplicate');
                        hasNearbyIcon = true;
                        break;
                    }
                }
                
                if (hasNearbyIcon) {
                    continue;
                }
                
                if (this.isValidInputFast(element)) { // Use fast validation
                    console.log('✅ Adding icon to new input:', selector, inputId);
                    this.addIconToInput(element);
                    newlyAdded++;
                    
                    // Early exit if we found enough inputs (performance optimization)
                    if (newlyAdded >= 3) {
                        console.log('🚀 Found sufficient inputs, stopping scan for performance');
                        break;
                    }
                }
            }
            
            // Early exit if we found inputs from high-priority selectors
            if (newlyAdded > 0) break;
        }

        console.log(`🔍 Fast scan complete: ${totalFound} total inputs found, ${newlyAdded} new icons added, ${this.icons.size} total icons`);
    }

    scanForInputsRelaxed() {
        // Fast relaxed scanning for restore attempts
        console.log('🔄 Fast relaxed scan for restore attempt');
        
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
                    
                    console.log('✅ Adding icon to input (relaxed validation):', selector, element);
                    this.addIconToInput(element);
                    newlyAdded++;
                    
                    // Early exit for performance
                    if (newlyAdded >= 2) break;
                }
            }

            // Early exit if we found inputs
            if (newlyAdded > 0) break;
    }

        console.log(`🔄 Fast relaxed scan complete: ${totalFound} total inputs found, ${newlyAdded} new icons added`);
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
            console.log('🚫 Icon already exists for this input element - skipping');
            return;
        }
        
        if (this.iconCreationLock.has(inputId)) {
            console.log('🚫 Icon creation already in progress - skipping');
            return;
        }
        
        // Check if there's already an icon in the DOM for this input
        const existingIcon = document.querySelector(`[data-input-id="${inputId}"]`);
        if (existingIcon) {
            console.log('🚫 Found existing icon in DOM - skipping duplicate creation');
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
                console.log('🚫 Found nearby icon - preventing duplicate');
                return;
            }
        }
        
        // Lock this input to prevent duplicates during creation
        this.iconCreationLock.add(inputId);
        console.log(`🔒 Locked input ${inputId} for icon creation`);
        
        try {
            const icon = document.createElement('button');
            icon.className = 'ce-icon';
            icon.innerHTML = this.createPLogo();
            icon.title = 'Enhance with AI Magic';
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
            
            console.log('✅ Icon added and positioned immediately');
            
        } finally {
            // Always unlock after creation attempt
            setTimeout(() => {
                this.iconCreationLock.delete(inputId);
                console.log(`🔓 Unlocked input ${inputId}`);
            }, 50); // Reduced from 100ms to 50ms
        }
    }

    cleanupOrphanedIcons() {
        // Remove any icons that are no longer associated with valid inputs
        const iconsToRemove = [];
        
        this.icons.forEach((icon, inputElement) => {
            // Check if the input element still exists in the DOM
            if (!document.contains(inputElement)) {
                console.log('🧹 Removing icon for non-existent input element');
                iconsToRemove.push(inputElement);
                return;
            }
            
            // Check if the input element is still visible and valid
            const rect = inputElement.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0 ||
                inputElement.hasAttribute('readonly') ||
                inputElement.disabled) {
                console.log('🧹 Removing icon for invalid/disabled input');
                iconsToRemove.push(inputElement);
                return;
            }
            
            // Check if there are multiple icons for the same input
            const inputId = icon.getAttribute('data-input-id');
            const allIconsForInput = document.querySelectorAll(`[data-input-id="${inputId}"]`);
            if (allIconsForInput.length > 1) {
                console.log(`🧹 Found ${allIconsForInput.length} icons for same input, removing duplicates`);
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
                icon.remove();
                this.icons.delete(inputElement);
            }
        });
        
        if (iconsToRemove.length > 0) {
            console.log(`🧹 Cleaned up ${iconsToRemove.length} orphaned icons`);
        }
    }

    positionIconFast(icon, inputElement) {
        const rect = inputElement.getBoundingClientRect();
        
        // Simplified fast positioning - just place it to the right of input
        const iconSize = 40; // Updated to match new size
        const spacing = 8; // Reduced spacing for faster positioning
        
        let left = rect.right + spacing;
        let top = rect.top + (rect.height - iconSize) / 2;
        
        // Basic bounds checking
        if (left + iconSize > window.innerWidth - 5) {
            left = rect.left - iconSize - spacing; // Place to the left if no space on right
        }
        
        if (top < 5) top = 5;
        if (top + iconSize > window.innerHeight - 5) top = window.innerHeight - iconSize - 5;
        
        // Apply position immediately
        icon.style.position = 'fixed';
        icon.style.left = `${left}px`;
        icon.style.top = `${top}px`;
        icon.style.zIndex = '999999';
        icon.style.width = `${iconSize}px`;
        icon.style.height = `${iconSize}px`;
        icon.style.pointerEvents = 'auto';
    }

    makeIconDraggableAndClickable(icon, inputElement) {
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        let dragStartTime = 0;
        
        icon.draggable = false;
        icon.style.cursor = 'grab';
        icon.style.userSelect = 'none';

        icon.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            
            dragStartTime = Date.now();
            isDragging = true;
            
            startX = e.clientX;
            startY = e.clientY;
            
            // Get ACTUAL current position from computed style, not style attribute
            const rect = icon.getBoundingClientRect();
            startLeft = rect.left;
            startTop = rect.top;
            
            console.log(`�� Starting drag from actual position: ${startLeft}, ${startTop}`);
            
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
            icon.style.cursor = 'grab';
            
            // If it was a quick click with minimal movement, treat as click
            if (dragDuration < 200 && totalMovement < 10) {
                console.log('🎯 Quick click detected - starting enhancement');
                icon.classList.add('processing');
                this.handleIconClick(inputElement, icon);
            } else {
                console.log('🎯 Icon dragged - saving final position');
                const finalLeft = parseInt(icon.style.left);
                const finalTop = parseInt(icon.style.top);
                console.log(`💾 Saving position: ${finalLeft}, ${finalTop}`);
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
            console.warn('⚠️ Error saving icon position:', error.message);
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
            console.warn('⚠️ Error loading icon position:', error.message);
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
            console.log('🚫 Already processing, ignoring click');
            return;
        }

        const text = this.getInputText(inputElement);
        if (!text.trim()) {
            console.log('🚫 No text to enhance');
            icon.classList.remove('processing');
            return;
        }

        if (this.activePopup) {
            this.closePopup();
        }

        this.isProcessing = true;
        icon.isProcessing = true;
        
        console.log('🚀 Processing enhancement');
        
        try {
            await this.showEnhancementPopup(inputElement, icon, text);
        } finally {
            this.isProcessing = false;
            icon.isProcessing = false;
            // Stop processing animation
            icon.classList.remove('processing');
            console.log('🛑 Enhancement complete');
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

            // Simple click handler - increment count when inserting
            insertBtn.onclick = async () => {
                // Insert the text
                this.insertText(finalText, inputElement);
                this.closePopup();
                
                // Increment count by making a simple API call
                try {
                    console.log('📊 Incrementing count after insert...');
                    
                    // Get user email
                    const userData = await new Promise((resolve) => {
                        chrome.storage.local.get(['user_info'], resolve);
                    });
                    const userEmail = userData.user_info?.email || '';
                    
                    if (userEmail) {
                        // Send message to background to increment count
                        chrome.runtime.sendMessage({
                            action: 'increment_count',
                            userEmail: userEmail
                        });
                    }
                } catch (e) {
                    console.error('❌ Failed to increment count:', e);
                }
            };

            console.log('✅ Insert button ready');
        }
    }

    async startStreaming(inputElement, iconElement, inputText, popup) {
        console.log('🚀 SIMPLE: Starting API call for:', inputText.substring(0, 50) + '...');

        const streamText = popup.querySelector('#stream-text');
        if (!streamText) {
            console.error('❌ Stream text container not found!');
            return;
        }

        // Show loading
        streamText.textContent = 'Enhancing your prompt...';

        // Set up simple message listener
        this.streamMessageListener = (message) => {
            if (message.action === 'stream_chunk') {
                const aiText = message.chunk?.data || '';
                if (aiText) {
                    streamText.textContent = aiText;
                }
            } else if (message.action === 'stream_complete') {
                this.showInsertButton(popup, streamText.textContent, inputElement);
            } else if (message.action === 'limit_reached') {
                // User has reached daily limit - show upgrade modal
                this.showUpgradeModal(popup, message.details);
            } else if (message.action === 'stream_error') {
                streamText.textContent = `Error: ${message.error}`;
            }
        };

        // Add listener and make API call
        chrome.runtime.onMessage.addListener(this.streamMessageListener);

        try {
            const targetModel = this.detectTargetModel();
            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
            
            // Get user email from popup display (most reliable method)
            let userEmail = '';
            
            try {
                // Get email from popup display by reading the user email span
                const popupEmail = await new Promise((resolve) => {
                    chrome.runtime.sendMessage({action: 'get_user_email'}, (response) => {
                        resolve(response?.email || '');
                    });
                });
                userEmail = popupEmail;
                console.log('📧 User email from popup:', userEmail);
                console.log('🔍 DEBUGGING EMAIL FLOW:');
                console.log('  - Email received:', userEmail);
                console.log('  - Email length:', userEmail?.length);
                console.log('  - Email type:', typeof userEmail);
                console.log('  - Email is empty?', !userEmail);
            } catch (popupError) {
                console.warn('⚠️ Could not get email from popup:', popupError);
                console.error('❌ EMAIL RETRIEVAL FAILED FROM POPUP!');
            }
            
            // Fallback: try storage
            if (!userEmail) {
                try {
                    const userData = await new Promise((resolve) => {
                        chrome.storage.local.get(['user_info'], resolve);
                    });
                    userEmail = userData.user_info?.email || '';
                    console.log('📧 User email from storage:', userEmail);
                } catch (storageError) {
                    console.warn('⚠️ Chrome storage not available:', storageError);
                }
            }
            
            if (!userEmail) {
                console.error('❌ NO USER EMAIL FOUND! Enhancement will not be counted!');
                console.error('🔍 DEBUGGING: Failed to get user email from any source');
                console.error('🔍 DEBUGGING: This is the ROOT CAUSE of count not incrementing!');
                // Don't proceed without user email
                streamText.textContent = 'Error: User not logged in. Please refresh and try again.';
                return;
            }

            console.log('✅ USER EMAIL FOUND! Proceeding with enhancement...');
            console.log('🚀 CONTENT SCRIPT: About to send message to background');

            // Check if background script is available
            if (!chrome.runtime) {
                console.error('❌ Chrome runtime not available');
                streamText.textContent = 'Error: Extension not properly loaded. Please refresh the page.';
                return;
            }

            // Test background script connectivity first
            console.log('🏓 Testing background script connectivity...');
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('❌ Background script not responding to ping:', chrome.runtime.lastError);
                    streamText.textContent = 'Error: Background script not running. Please refresh the page.';
                    return;
                }
                console.log('✅ Background script is responsive:', response);
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

            console.log('📤 CONTENT SCRIPT: SENDING message:', {
                action: messageData.action,
                prompt: inputText.substring(0, 50) + '...',
                userEmail: userEmail,
                apiUrl: apiUrl
            });
            
            // Add timeout for message sending
            const messageTimeout = setTimeout(() => {
                console.error('❌ CONTENT SCRIPT: Message timeout - background script not responding');
                streamText.textContent = 'Error: Background script not responding. Please refresh the page.';
            }, 5000);

            chrome.runtime.sendMessage(messageData, (response) => {
                clearTimeout(messageTimeout);
                
                if (chrome.runtime.lastError) {
                    console.error('❌ CONTENT SCRIPT: Failed to send message:', chrome.runtime.lastError);
                    console.error('❌ Error details:', chrome.runtime.lastError.message);
                    streamText.textContent = 'Error: Failed to send request. Please try again.';
                    return;
                }

                console.log('✅ CONTENT SCRIPT: Message sent successfully to background');
                console.log('📨 CONTENT SCRIPT: Background response:', response);
            });

        } catch (error) {
            console.error('❌ API call failed:', error);
            streamText.textContent = 'Enhancement failed. Please try again.';
        }
    }



    abortStreaming() {
        if (this.isStreaming && this.currentStreamAbortController) {
            console.log('🛑 Aborting stream...');
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
                console.log('📍 Positioning popup to LEFT of icon (staying close)');
            } else {
                console.log('📍 Shifting popup left by', overflowAmount, 'pixels (staying close)');
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
                console.log('📍 Positioning popup ABOVE icon (close positioning)');
            } else {
                // If no space above, position at top but keep horizontal position close to icon
                top = 8;
                console.log('📍 Positioning popup at TOP of viewport (staying horizontally close to icon)');
            }
        }
        if (top < 8) {
            top = 8;
        }
        
        popup.style.position = 'fixed';
        popup.style.left = `${left}px`;
        popup.style.top = `${top}px`;
        popup.style.zIndex = '1000000';
        
        console.log(`📍 Popup positioned CLOSE to icon - Icon center: ${(iconRect.left + iconRect.right)/2}, ${(iconRect.top + iconRect.bottom)/2} | Popup: ${left}, ${top}`);
    }

    // This method is now deprecated - we use showFinalResult instead
    showUpgradeModal(popup, details) {
        console.log('🚫 Daily limit reached - showing upgrade modal');
        
        const content = popup.querySelector('.ce-content');
        content.innerHTML = `
            <div class="ce-upgrade-modal">
                <div class="ce-upgrade-header">
                    <h3>🎯 Daily Limit Reached!</h3>
                </div>
                <div class="ce-upgrade-body">
                    <p>You've used all <strong>10 free prompts</strong> today.</p>
                    <p>Upgrade to Pro for <strong>unlimited prompts</strong>!</p>
                    <div class="ce-upgrade-features">
                        <div class="ce-feature">✅ Unlimited daily prompts</div>
                        <div class="ce-feature">✅ Priority processing</div>
                        <div class="ce-feature">✅ Advanced AI models</div>
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
                    <div style="color: #dc3545; font-size: 16px; margin-bottom: 10px;">⚠️ Authentication Required</div>
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
        console.log('🎬 Starting ultra-fast word-by-word animation for text:', text.substring(0, 50) + '...');

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
                console.log('✅ Word-by-word animation completed');
                onComplete();
            }
        };

        // Start animation immediately
        console.log(`🎬 Animating ${words.length} words at lightning speed`);
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
        console.log('🎯 Showing final result with insert button');

        // Create text container for final result
        const textContainer = document.createElement('div');
        textContainer.id = 'final-text';
        textContainer.style.cssText = 'font-size:15px;line-height:1.6;color:#f0f0f0;font-weight:500;margin:0;padding:0;';
        textContainer.textContent = finalText;
        container.appendChild(textContainer);

        // Show insert button
        const insertBtn = popup.querySelector('#insert-btn');
        if (insertBtn) {
            insertBtn.style.display = 'block';
            insertBtn.disabled = false;
            insertBtn.textContent = 'Insert';

            // Remove any existing click handler
            const newInsertBtn = insertBtn.cloneNode(true);
            insertBtn.parentNode.replaceChild(newInsertBtn, insertBtn);

            newInsertBtn.onclick = () => {
                // Start API generation immediately when insert is clicked
                this.startApiGenerationOnInsert();
            };

            console.log('✅ Insert button ready for final text - will start API generation on click');
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
                console.warn('⚠️ No auth token found - user needs to sign in');
                return null; // This will trigger auth required message
            }

            // Detect target model based on current site
            const targetModel = this.detectTargetModel();
            
            console.log('🚀 Enhancing with API:', { model: targetModel, promptLength: text.length });

            const apiUrl = window.CONFIG ? window.CONFIG.getApiUrl() : 'http://localhost:8000';
            const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const platform = this.detectTargetModel();

            // Get user email directly from storage to ensure it's current
            const userData = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            const userEmail = userData.user_info?.email || '';
            console.log('📧 User email for enhance_prompt:', userEmail);
            console.log('📧 Full user data:', userData.user_info);
            
            if (!userEmail) {
                console.error('❌ NO USER EMAIL FOUND! This will cause count issues!');
                console.log('🔍 Available storage keys:', Object.keys(userData));
            }
            
            console.log('🚀 CONTENT SCRIPT: Sending enhance_prompt message to background');
            
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
                
                console.log('📤 CONTENT SCRIPT: Message data:', {
                    action: messageData.action,
                    userEmail: messageData.userEmail,
                    promptLength: messageData.prompt?.length,
                    apiUrl: messageData.apiUrl
                });
                
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
            console.log('✅ Enhancement successful:', data.enhanced_prompt.substring(0, 100) + '...');
            // Update local last-known count immediately (no popup blink)
            if (typeof data.user_prompt_count === 'number') {
                try {
                    chrome.storage.local.set({ last_known_prompt_count: data.user_prompt_count });
                } catch (e) { /* ignore */ }
            }
            return data.enhanced_prompt;
            
        } catch (error) {
            console.error('❌ Enhancement error:', error);
            return this.getFallbackEnhancement(text);
        }
    }

    detectTargetModel() {
        const hostname = window.location.hostname;
        
        if (hostname.includes('openai.com') || hostname.includes('chatgpt.com')) {
            return 'gpt-4o-mini';
        } else if (hostname.includes('claude.ai')) {
            return 'claude-3-5-sonnet';
        } else if (hostname.includes('gemini.google.com')) {
            return 'gemini-1.5-pro';
        } else if (hostname.includes('perplexity.ai')) {
            return 'perplexity-sonar';
        } else if (hostname.includes('meta.ai')) {
            return 'meta-llama-3';
        } else if (hostname.includes('poe.com')) {
            return 'gpt-4o-mini';
        }
        
        return 'gpt-4o-mini'; // Default fallback for ChatGPT
    }

    getFallbackEnhancement(text) {
        return `Please provide a comprehensive and detailed response to the following query, ensuring accuracy and clarity:

${text}

Additional context: Please structure your response in a clear, organized manner with relevant examples where appropriate.`;
    }

    formatText(text) {
        // Clean and format the enhanced prompt for better readability
        let formatted = text.trim();
        
        // Remove excessive whitespace and normalize line breaks
        formatted = formatted.replace(/\s+/g, ' ');
        formatted = formatted.replace(/\n\s*\n/g, '\n\n');
        
        // Add proper spacing around common formatting elements
        formatted = formatted.replace(/([.!?])\s*([A-Z])/g, '$1 $2');
        formatted = formatted.replace(/:\s*/g, ': ');
        formatted = formatted.replace(/,\s*/g, ', ');
        
        // Handle numbered lists
        formatted = formatted.replace(/(\d+\.)\s*/g, '\n$1 ');
        
        // Handle bullet points
        formatted = formatted.replace(/(\*|-|\•)\s*/g, '\n• ');
        
        // Handle section headers (words ending with colon)
        formatted = formatted.replace(/\n([A-Z][^:\n]*:)/g, '\n\n$1');
        
        // Clean up multiple consecutive newlines
        formatted = formatted.replace(/\n{3,}/g, '\n\n');
        
        // Ensure the text starts cleanly
        formatted = formatted.replace(/^\n+/, '');
        
        return formatted;
    }

    insertText(text, inputElement) {
        // Format the text for clean, structured insertion
        const formattedText = this.formatText(text);
        
        if (inputElement.tagName === 'TEXTAREA' || inputElement.tagName === 'INPUT') {
            inputElement.value = formattedText;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (inputElement.contentEditable === 'true') {
            // For contentEditable elements, preserve formatting better
            const lines = formattedText.split('\n');
            const formattedHTML = lines.map(line => {
                if (line.trim() === '') return '<br>';
                if (line.startsWith('• ')) {
                    return `<div style="margin: 4px 0;">• ${line.substring(2)}</div>`;
                }
                if (/^\d+\.\s/.test(line)) {
                    return `<div style="margin: 4px 0;">${line}</div>`;
                }
                if (line.includes(':') && line.split(':')[0].length < 50) {
                    return `<div style="margin: 8px 0; font-weight: 500;">${line}</div>`;
                }
                return `<div style="margin: 4px 0;">${line}</div>`;
            }).join('');
            
            inputElement.innerHTML = formattedHTML;
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
        }
        
        inputElement.focus();
        console.log('✅ Text insertion completed with formatting');
    }

    closePopup() {
        if (this.activePopup) {
            this.activePopup.remove();
            this.activePopup = null;
        }
    }

    removeAllIcons() {
        console.log(`🧹 Removing ${this.icons.size} icons`);
        
        this.icons.forEach((icon, inputElement) => {
            if (icon.intervalUpdate) {
                clearInterval(icon.intervalUpdate);
            }
            if (icon.updatePosition) {
                window.removeEventListener('scroll', icon.updatePosition);
                window.removeEventListener('resize', icon.updatePosition);
            }
            icon.remove();
        });
        this.icons.clear();
        
        // Clear all creation locks
        this.iconCreationLock.clear();
        console.log('🔓 Cleared all creation locks');
        
        // Also clean up any orphaned icons in the DOM
        const orphanedIcons = document.querySelectorAll('.ce-icon');
        orphanedIcons.forEach(icon => {
            console.log('🧹 Removing orphaned icon');
            icon.remove();
        });
        
        // Clean up any remaining duplicate icons
        this.cleanupOrphanedIcons();
        
        console.log('✅ All icons cleaned up');
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
                console.log('🔄 URL or chat changed - AGGRESSIVE cleanup of all icons');
                currentUrl = newUrl;
                currentChatId = newChatId;
                
                // AGGRESSIVE cleanup - remove ALL icons immediately
                this.aggressiveCleanup();
                
                // Wait for new chat to load, then scan for new inputs
                setTimeout(() => {
                    if (this.isActive) {
                        console.log('🔄 Scanning for inputs in new chat');
                        this.scanForInputs(true);
                    }
                }, 200); // Reduced delay for faster response
            }
        }, 200); // More frequent checking
        
        // Also listen for navigation events
        window.addEventListener('popstate', () => {
            console.log('🔄 Navigation detected - AGGRESSIVE cleanup');
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
        console.log('🧹 AGGRESSIVE cleanup - removing ALL icons and clearing state');
        
        // Clear all internal state
        this.icons.clear();
        this.iconCreationLock.clear();
        
        // Remove ALL icons from DOM (including any hidden or orphaned ones)
        const allIcons = document.querySelectorAll('.ce-icon');
        allIcons.forEach(icon => {
            console.log('🧹 Removing icon during aggressive cleanup');
            icon.remove();
        });
        
        // Also remove any icons that might be in the body
        const bodyIcons = document.body.querySelectorAll('.ce-icon');
        bodyIcons.forEach(icon => {
            console.log('🧹 Removing body icon during aggressive cleanup');
            icon.remove();
        });
        
        console.log(`🧹 Aggressive cleanup complete - removed ${allIcons.length + bodyIcons.length} icons`);
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
                        console.log('🔄 ChatGPT chat switch detected - cleaning up icons');
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
            const result = await new Promise((resolve) => {
                chrome.storage.local.get(['user_info'], resolve);
            });
            
            this.userInfo = result.user_info;
            if (this.userInfo) {
                console.log('✅ User is logged in:', this.userInfo.name || this.userInfo.email);
            } else {
                console.log('❌ No user logged in');
            }
        } catch (error) {
            console.error('❌ Error checking login status:', error);
        }
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
