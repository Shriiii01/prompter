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
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language
        };
    }

    async setEncrypted(key, data) {
        try {
            const encryptionKey = await this.getEncryptionKey();
            const encrypted = await this.encrypt(data, encryptionKey);
            
            await chrome.storage.local.set({
                [key]: encrypted
            });
            
            console.log(`🔐 Securely stored: ${key}`);
            return true;
        } catch (error) {
            console.error(`❌ Failed to store encrypted data: ${error}`);
            // Fallback to plain storage
            await chrome.storage.local.set({ [key]: data });
            return false;
        }
    }

    async getEncrypted(key) {
        try {
            const result = await chrome.storage.local.get([key]);
            if (!result[key]) return null;
            
            // Check if it's encrypted data
            if (result[key].encrypted && result[key].iv && result[key].salt) {
                const encryptionKey = await this.getEncryptionKey();
                return await this.decrypt(result[key], encryptionKey);
            } else {
                // Plain data (fallback)
                return result[key];
            }
        } catch (error) {
            console.error(`❌ Failed to decrypt data: ${error}`);
            // Return plain data as fallback
            const result = await chrome.storage.local.get([key]);
            return result[key] || null;
        }
    }

    async removeEncrypted(key) {
        await chrome.storage.local.remove([key]);
        console.log(`🗑️ Removed encrypted data: ${key}`);
    }

    async clearAll() {
        await chrome.storage.local.clear();
        console.log(`🗑️ Cleared all encrypted data`);
    }
}

// Make it globally available
window.SecureStorage = SecureStorage; 