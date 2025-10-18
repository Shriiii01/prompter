//  Extension Manager - Content Script Control
class ExtensionManager {
    constructor() {
        this.isActive = false;
    }

    //  Start extension
    async startExtension() {
        try {
            // Starting extension
            
            const tabs = await this.getActiveTab();
            if (!tabs[0]) {
                throw new Error('No active tab found');
            }
            
            // Found active tab
            
            // Inject content script first
            await this.injectContentScript(tabs[0]);
            
            // Wait a moment then start
            await this.delay(1000);
            
            // Send start message
            const response = await this.sendMessage(tabs[0].id, { action: 'startExtension' });
            
            if (response && response.success) {
                // Extension started successfully
                this.isActive = true;
                this.updateStorageState(true);
                
                // Add debug scan after successful start
                setTimeout(() => {
                    this.sendMessage(tabs[0].id, { action: 'debugScan' });
                }, 1000);
                
                return { success: true };
            } else {
                throw new Error('Failed to start extension - no response');
            }
            
        } catch (error) {
            // Start error
            throw error;
        }
    }

    // 🛑 Stop extension
    async stopExtension() {
        try {
            // Stopping extension
            
            const tabs = await this.getActiveTab();
            if (tabs[0]) {
                await this.sendMessage(tabs[0].id, { action: 'stopExtension' });
            }
            
            this.isActive = false;
            this.updateStorageState(false);
            
            // Extension stopped
            return { success: true };
            
        } catch (error) {
            // Stop error
            // Still update state even if message fails
            this.isActive = false;
            this.updateStorageState(false);
            throw error;
        }
    }

    // 🔄 Toggle extension state
    async toggleExtension() {
        if (this.isActive) {
            return await this.stopExtension();
        } else {
            return await this.startExtension();
        }
    }

    // 🧹 Cleanup and quit
    async cleanupAndQuit() {
        try {
            // Cleaning up before quit
            
            const tabs = await this.getActiveTab();
            if (tabs[0]) {
                await this.sendMessage(tabs[0].id, { action: 'cleanupAndQuit' });
            }
            
            // Disable the extension
            await this.disableExtension();
            
        } catch (error) {
            // Quit error
            // Still try to disable extension
            await this.disableExtension();
        }
    }

    //  Inject content script
    async injectContentScript(tab) {
        return new Promise((resolve, reject) => {
            // Injecting content script
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['magical-enhancer.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    // Failed to inject content script
                    reject(new Error('Failed to inject content script'));
                } else {
                    // Content script injected
                    resolve();
                }
            });
        });
    }

    //  Send message to content script
    async sendMessage(tabId, message) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    // Content script not available, but that's okay
                    resolve(null);
                } else {
                    resolve(response);
                }
            });
        });
    }

    // 📋 Get active tab
    async getActiveTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
    }

    //  Update storage state
    updateStorageState(isActive) {
        chrome.storage.local.set({ 'extension_active': isActive }, () => {
            // Extension state updated
        });
    }

    //  Disable extension
    async disableExtension() {
        return new Promise((resolve) => {
            chrome.management.setEnabled(chrome.runtime.id, false, () => {
                if (chrome.runtime.lastError) {
                    // Error disabling extension
                } else {
                    // Extension disabled
                }
                resolve();
            });
        });
    }

    // ⏱ Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    //  Get current state
    async getCurrentState() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['extension_active'], (result) => {
                this.isActive = result.extension_active || false;
                resolve(this.isActive);
            });
        });
    }

    // 🔄 Check if extension is active
    async checkActiveState() {
        const state = await this.getCurrentState();
        return state;
    }

    //  Notify content script
    async notifyContentScript(action, data = null) {
        try {
            const tabs = await this.getActiveTab();
            if (tabs[0]) {
                await this.sendMessage(tabs[0].id, {
                    action: action,
                    data: data
                });
            }
        } catch (error) {
            // Content script not available for notification
        }
    }
} 