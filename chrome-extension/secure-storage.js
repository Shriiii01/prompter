// 🔐 Secure Storage for Sensitive Data
// Uses AES-GCM encryption with device-specific keys

class SecureStorage {
    constructor() {
        this.algorithm = 'AES-GCM';
        this.keyLength = 256;
    }

    async generateKey(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );
        
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: encoder.encode(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: this.algorithm, length: this.keyLength },
            false,
            ['encrypt', 'decrypt']
        );
    }

    async encrypt(data, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const key = await this.generateKey(password, salt);
        
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(JSON.stringify(data));
        
        const encrypted = await crypto.subtle.encrypt(
            { name: this.algorithm, iv },
            key,
            encodedData
        );
        
        return {
            encrypted: Array.from(new Uint8Array(encrypted)),
            iv: Array.from(iv),
            salt: Array.from(salt)
        };
    }

    async decrypt(encryptedData, password) {
        const key = await this.generateKey(password, encryptedData.salt);
        
        const decrypted = await crypto.subtle.decrypt(
            { name: this.algorithm, iv: new Uint8Array(encryptedData.iv) },
            key,
            new Uint8Array(encryptedData.encrypted)
        );
        
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    }

    async getEncryptionKey() {
        // Use device-specific info for encryption key
        const deviceInfo = await this.getDeviceInfo();
        return `prompter_${deviceInfo.userAgent}_${deviceInfo.platform}`;
    }

    async getDeviceInfo() {
        try {
            // Handle Manifest V3 service worker context where navigator might be undefined
            if (typeof navigator === 'undefined') {
                console.log(' Navigator not available, using fallback device info');
                return {
                    userAgent: 'Chrome Extension Service Worker',
                    platform: 'Chrome Extension',
                    language: 'en-US'
                };
            }
            
            // Check if userAgent is available
            if (!navigator.userAgent) {
                console.log(' User agent not available, using fallback');
                return {
                    userAgent: 'Chrome Extension',
                    platform: navigator.platform || 'Chrome Extension',
                    language: navigator.language || 'en-US'
                };
            }
            
            return {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            };
        } catch (error) {
            console.error(' Error getting device info:', error);
            return {
                userAgent: 'Chrome Extension',
                platform: 'Chrome Extension',
                language: 'en-US'
            };
        }
    }

    async setEncrypted(key, data) {
        try {
            console.log(`🔐 Attempting to encrypt and store: ${key}`);
            const encryptionKey = await this.getEncryptionKey();
            const encrypted = await this.encrypt(data, encryptionKey);
            
            await chrome.storage.local.set({
                [key]: encrypted
            });
            
            console.log(` Securely stored: ${key}`);
            return true;
        } catch (error) {
            console.error(` Failed to store encrypted data for ${key}:`, error);
            // Fallback to plain storage
            try {
                await chrome.storage.local.set({ [key]: data });
                console.log(` Stored in plain text: ${key}`);
                return false; // Indicate fallback was used
            } catch (fallbackError) {
                console.error(` Even fallback storage failed for ${key}:`, fallbackError);
                throw fallbackError;
            }
        }
    }

    async getEncrypted(key) {
        try {
            console.log(`🔐 Attempting to retrieve encrypted data: ${key}`);
            const result = await chrome.storage.local.get([key]);
            if (!result[key]) {
                console.log(` No data found for key: ${key}`);
                return null;
            }
            
            // Check if it's encrypted data
            if (result[key].encrypted && result[key].iv && result[key].salt) {
                console.log(`🔐 Decrypting data for: ${key}`);
                const encryptionKey = await this.getEncryptionKey();
                const decrypted = await this.decrypt(result[key], encryptionKey);
                console.log(` Successfully decrypted: ${key}`);
                return decrypted;
            } else {
                console.log(`📄 Returning plain data for: ${key}`);
                // Plain data (fallback)
                return result[key];
            }
        } catch (error) {
            console.error(` Failed to decrypt data for ${key}:`, error);
            // Return plain data as fallback
            try {
                const result = await chrome.storage.local.get([key]);
                const fallbackData = result[key] || null;
                console.log(`📄 Returning fallback data for ${key}:`, !!fallbackData);
                return fallbackData;
            } catch (fallbackError) {
                console.error(` Even fallback retrieval failed for ${key}:`, fallbackError);
                return null;
            }
        }
    }

    async removeEncrypted(key) {
        try {
            console.log(` Removing encrypted data: ${key}`);
            await chrome.storage.local.remove([key]);
            console.log(` Successfully removed: ${key}`);
        } catch (error) {
            console.error(` Failed to remove encrypted data for ${key}:`, error);
            // Try plain removal as fallback
            try {
                await chrome.storage.local.remove([key]);
                console.log(` Removed using fallback: ${key}`);
            } catch (fallbackError) {
                console.error(` Even fallback removal failed for ${key}:`, fallbackError);
            }
        }
    }

    async clearAll() {
        try {
            console.log(' Clearing all encrypted data...');
            await chrome.storage.local.clear();
            console.log(' Successfully cleared all data');
        } catch (error) {
            console.error(' Failed to clear all data:', error);
        }
    }
} 