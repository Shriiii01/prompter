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
                return {
                    userAgent: 'Chrome Extension Service Worker',
                    platform: 'Chrome Extension',
                    language: 'en-US'
                };
            }
            
            // Check if userAgent is available
            if (!navigator.userAgent) {
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
            return {
                userAgent: 'Chrome Extension',
                platform: 'Chrome Extension',
                language: 'en-US'
            };
        }
    }

    async setEncrypted(key, data) {
        try {
            const encryptionKey = await this.getEncryptionKey();
            const encrypted = await this.encrypt(data, encryptionKey);
            
            await chrome.storage.local.set({
                [key]: encrypted
            });
            
            return true;
        } catch (error) {
            // Fallback to plain storage
            try {
                await chrome.storage.local.set({ [key]: data });
                return false; // Indicate fallback was used
            } catch (fallbackError) {
                throw fallbackError;
            }
        }
    }

    async getEncrypted(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            if (!result[key]) {
                return null;
            }
            
            // Check if it's encrypted data
            if (result[key].encrypted && result[key].iv && result[key].salt) {
                const encryptionKey = await this.getEncryptionKey();
                const decrypted = await this.decrypt(result[key], encryptionKey);
                return decrypted;
            } else {
                // Plain data (fallback)
                return result[key];
            }
        } catch (error) {
            // Return plain data as fallback
            try {
                const result = await chrome.storage.local.get([key]);
                const fallbackData = result[key] || null;
                return fallbackData;
            } catch (fallbackError) {
                return null;
            }
        }
    }

    async removeEncrypted(key) {
        try {
            await chrome.storage.local.remove([key]);
        } catch (error) {
            // Try plain removal as fallback
            try {
                await chrome.storage.local.remove([key]);
            } catch (fallbackError) {
                // Even fallback removal failed
            }
        }
    }

    async clearAll() {
        try {
            await chrome.storage.local.clear();
        } catch (error) {
            // Failed to clear all data
        }
    }
} 