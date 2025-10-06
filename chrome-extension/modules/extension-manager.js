//  Extension Manager - Content Script Control
class ExtensionManager {
    constructor() {
        this.isActive = false;
    }

    //  Start extension
    async startExtension() {
        try {
            console.log(' Starting extension...');
            
            const tabs = await this.getActiveTab();
            if (!tabs[0]) {
                throw new Error('No active tab found');
            }
            
            console.log(' Found active tab:', tabs[0].id, tabs[0].url);
            
            // Inject content script first
            await this.injectContentScript(tabs[0]);
            
            // Wait a moment then start
            await this.delay(1000);
            
            // Send start message
            const response = await this.sendMessage(tabs[0].id, { action: 'startExtension' });
            
            if (response && response.success) {
                console.log(' Extension started successfully');
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
            console.error(' Start error:', error);
            throw error;
        }
    }

    // 🛑 Stop extension
    async stopExtension() {
        try {
            console.log('🛑 Stopping extension...');
            
            const tabs = await this.getActiveTab();
            if (tabs[0]) {
                await this.sendMessage(tabs[0].id, { action: 'stopExtension' });
            }
            
            this.isActive = false;
            this.updateStorageState(false);
            
            console.log(' Extension stopped');
            return { success: true };
            
        } catch (error) {
            console.error(' Stop error:', error);
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
            console.log('🧹 Cleaning up before quit...');
            
            const tabs = await this.getActiveTab();
            if (tabs[0]) {
                await this.sendMessage(tabs[0].id, { action: 'cleanupAndQuit' });
            }
            
            // Disable the extension
            await this.disableExtension();
            
        } catch (error) {
            console.error(' Quit error:', error);
            // Still try to disable extension
            await this.disableExtension();
        }
    }

    //  Inject content script
    async injectContentScript(tab) {
        return new Promise((resolve, reject) => {
            console.log('🔄 Injecting content script...');
            
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['magical-enhancer.js']
            }, () => {
                if (chrome.runtime.lastError) {
                    console.error(' Failed to inject content script:', chrome.runtime.lastError);
                    reject(new Error('Failed to inject content script'));
                } else {
                    console.log(' Content script injected');
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
                    console.log('Content script not available, but that\'s okay');
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
            console.log(` Extension state updated: ${isActive}`);
        });
    }

    //  Disable extension
    async disableExtension() {
        return new Promise((resolve) => {
            chrome.management.setEnabled(chrome.runtime.id, false, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error disabling extension:', chrome.runtime.lastError);
                } else {
                    console.log(' Extension disabled');
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
            console.log('Content script not available for notification');
        }
    }
} 