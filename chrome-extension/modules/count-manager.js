//  Count Manager - Simplified Optimistic Updates
class CountManager {
    constructor() {
        this.apiBaseUrl = CONFIG.getApiUrl();
        this.endpoints = CONFIG.endpoints;
        this.pendingUpdates = new Map();
        this.updateCounter = 0;
    }

    //  Simplified optimistic increment
    async incrementCount(userEmail) {
        try {
            console.log(' Starting count increment for:', userEmail);
            
            // Get current count from display
            const currentCount = this.getCurrentDisplayCount();
            const newCount = currentCount + 1;
            
            // Generate unique update ID
            const updateId = `update_${Date.now()}_${++this.updateCounter}`;
            
            //  OPTIMISTIC UPDATE: Immediately update display
            this.updateDisplay(newCount);
            console.log(` Optimistic update: ${currentCount} → ${newCount}`);
            
            // Store pending update for potential rollback
            this.pendingUpdates.set(updateId, {
                originalCount: currentCount,
                timestamp: Date.now(),
                userEmail: userEmail
            });
            
            // Start backend update in background
            this.performBackendUpdate(updateId, userEmail);
            
            return { success: true, updateId };
            
        } catch (error) {
            console.error(' Error in count increment:', error);
            return { success: false, error: error.message };
        }
    }

    // 🔄 Perform backend update
    async performBackendUpdate(updateId, userEmail) {
        try {
            console.log(`🔄 Performing backend update for ${updateId}`);
            
            const response = await fetch(`${this.apiBaseUrl}${this.endpoints.incrementCount}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: userEmail })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(` Backend update successful: ${result.new_count}`);
                
                // Update display with actual backend count
                this.updateDisplay(result.new_count);
                
                // Remove from pending updates
                this.pendingUpdates.delete(updateId);
                
                // Show success indicator
                this.showSuccessIndicator();
                
            } else {
                console.log(` Backend update failed: ${response.status}`);
                this.handleBackendFailure(updateId);
            }
            
        } catch (error) {
            console.error(` Backend update error:`, error);
            this.handleBackendFailure(updateId);
        }
    }

    //  Handle backend failure - rollback
    handleBackendFailure(updateId) {
        const pendingUpdate = this.pendingUpdates.get(updateId);
        if (!pendingUpdate) {
            console.log(' No pending update found for rollback');
            return;
        }
        
        //  ROLLBACK: Restore original count
        this.updateDisplay(pendingUpdate.originalCount);
        console.log(`🔄 Rollback complete: ${pendingUpdate.originalCount}`);
        
        // Remove from pending updates
        this.pendingUpdates.delete(updateId);
        
        // Show error indicator
        this.showErrorIndicator();
        
        //  OPTIONAL: Retry after delay
        setTimeout(() => {
            this.retryBackendUpdate(updateId, pendingUpdate.userEmail);
        }, 3000);
    }

    // 🔄 Retry failed backend update
    async retryBackendUpdate(updateId, userEmail) {
        try {
            console.log(`🔄 Retrying backend update for ${updateId}`);
            
            const response = await fetch(`${this.apiBaseUrl}${this.endpoints.incrementCount}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_email: userEmail })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log(` Retry successful: ${result.new_count}`);
                this.updateDisplay(result.new_count);
                this.showSuccessIndicator();
            } else {
                console.log(` Retry failed: ${response.status}`);
                this.showErrorIndicator();
            }
            
        } catch (error) {
            console.error(` Retry error:`, error);
            this.showErrorIndicator();
        }
    }

    //  Load count from backend
    async loadCount(userEmail) {
        try {
            console.log('🔄 Loading count from backend...');
            
            // Quick health check
            const healthCheck = await fetch(`${this.apiBaseUrl}${this.endpoints.health}`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            
            if (!healthCheck.ok) {
                throw new Error('Backend unavailable');
            }
            
            // Fetch user count
            const response = await fetch(`${this.apiBaseUrl}${this.endpoints.userCount}/${encodeURIComponent(userEmail)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });
            
            if (response.ok) {
                const userData = await response.json();
                const count = userData.count || 0;
                
                this.updateDisplay(count);
                this.cacheCount(count);
                
                console.log(' Loaded count from backend:', count);
                return count;
            } else {
                throw new Error(`Backend returned ${response.status}`);
            }
            
        } catch (error) {
            console.log(' Backend unavailable, using cached count');
            const cachedCount = this.getCachedCount();
            this.updateDisplay(cachedCount);
            return cachedCount;
        }
    }

    //  Get current count from display
    getCurrentDisplayCount() {
        const element = document.getElementById('enhanced-count');
        if (!element) {
            console.log(' Enhanced count element not found');
            return 0;
        }
        
        const count = parseInt(element.textContent) || 0;
        return count;
    }

    //  Update display with count
    updateDisplay(count) {
        const element = document.getElementById('enhanced-count');
        if (!element) {
            console.log(' Enhanced count element not found');
            return;
        }
        
        element.textContent = count.toString();
        console.log(` Updated display: ${count}`);
        
        // Show visual indicator for pending updates
        if (this.pendingUpdates.size > 0) {
            element.style.color = '#ffa500'; // Orange for pending
            element.title = `${this.pendingUpdates.size} pending update(s)`;
        } else {
            element.style.color = ''; // Reset to default
            element.title = '';
        }
        
        // Cache the count
        this.cacheCount(count);
    }

    //  Cache count locally
    cacheCount(count) {
        chrome.storage.local.set({ 'cached_prompt_count': count }, () => {
            console.log(` Cached count: ${count}`);
        });
    }

    // 📥 Get cached count
    getCachedCount() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['cached_prompt_count'], (result) => {
                resolve(result.cached_prompt_count || 0);
            });
        });
    }

    //  Show success indicator
    showSuccessIndicator() {
        const element = document.getElementById('enhanced-count');
        if (element) {
            element.style.color = '#34C759'; // Green for success
            setTimeout(() => {
                element.style.color = '';
            }, 1000);
        }
    }

    //  Show error indicator
    showErrorIndicator() {
        const element = document.getElementById('enhanced-count');
        if (element) {
            element.style.color = '#FF453A'; // Red for error
            setTimeout(() => {
                element.style.color = '';
            }, 2000);
        }
    }

    // 🧹 Clean up stale pending updates
    cleanupStaleUpdates() {
        const now = Date.now();
        const staleThreshold = 30000; // 30 seconds
        
        for (const [updateId, update] of this.pendingUpdates.entries()) {
            if (now - update.timestamp > staleThreshold) {
                console.log(`🧹 Cleaning up stale update: ${updateId}`);
                this.pendingUpdates.delete(updateId);
            }
        }
    }

    //  Start cleanup interval
    startCleanupInterval() {
        setInterval(() => {
            this.cleanupStaleUpdates();
        }, 30000); // Every 30 seconds
    }

    // 🧹 Clear all pending updates (e.g., on logout)
    clearAllPendingUpdates() {
        this.pendingUpdates.clear();
        console.log('🧹 Cleared all pending updates');
    }

    //  Debug pending updates
    debugPendingUpdates() {
        console.log(' Pending Updates Status:');
        console.log(`Total pending updates: ${this.pendingUpdates.size}`);
        
        for (const [updateId, update] of this.pendingUpdates.entries()) {
            const age = Date.now() - update.timestamp;
            console.log(`- ${updateId}: ${update.originalCount} → ${update.originalCount + 1} (${age}ms old)`);
        }
    }
} 