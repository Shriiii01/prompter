/**
 * Secure Storage Module for Chrome Extension
 * Encrypts sensitive data before storing in Chrome storage
 */

class SecureStorage {
    constructor() {
        this.algorithm = {
            name: 'AES-GCM',
            length: 256
        };
        this.ivLength = 12;
        this.saltLength = 16;
    }

    /**
     * Generate a crypto key from a password
     */
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
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data
     */
    async encrypt(data, password) {
        try {
            const encoder = new TextEncoder();
            const salt = crypto.getRandomValues(new Uint8Array(this.saltLength));
            const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
            
            const key = await this.generateKey(password, salt);
            const encodedData = encoder.encode(JSON.stringify(data));
            
            const encryptedData = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                encodedData
            );

            // Combine salt, IV, and encrypted data
            const combined = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
            combined.set(salt, 0);
            combined.set(iv, salt.length);
            combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data
     */
    async decrypt(encryptedData, password) {
        try {
            const combined = new Uint8Array(
                atob(encryptedData).split('').map(char => char.charCodeAt(0))
            );

            const salt = combined.slice(0, this.saltLength);
            const iv = combined.slice(this.saltLength, this.saltLength + this.ivLength);
            const data = combined.slice(this.saltLength + this.ivLength);

            const key = await this.generateKey(password, salt);
            
            const decryptedData = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: iv },
                key,
                data
            );

            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(decryptedData));
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Get device-specific encryption key
     */
    async getEncryptionKey() {
        // Use a combination of device info for the encryption key
        const deviceInfo = await this.getDeviceInfo();
        return `prompter_${deviceInfo.userAgent}_${deviceInfo.platform}_${deviceInfo.language}`;
    }

    /**
     * Get device information for key generation
     */
    async getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };
    }

    /**
     * Store encrypted data
     */
    async setEncrypted(key, data) {
        try {
            const encryptionKey = await this.getEncryptionKey();
            const encryptedData = await this.encrypt(data, encryptionKey);
            
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: encryptedData }, resolve);
            });
        } catch (error) {
            console.error('Failed to store encrypted data:', error);
            // Fallback to plain storage if encryption fails
            return new Promise((resolve) => {
                chrome.storage.local.set({ [key]: data }, resolve);
            });
        }
    }

    /**
     * Get and decrypt data
     */
    async getEncrypted(key) {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.local.get([key], resolve);
            });

            if (!result[key]) {
                return null;
            }

            const encryptionKey = await this.getEncryptionKey();
            return await this.decrypt(result[key], encryptionKey);
        } catch (error) {
            console.error('Failed to get encrypted data:', error);
            // Fallback to plain storage if decryption fails
            const result = await new Promise((resolve) => {
                chrome.storage.local.get([key], resolve);
            });
            return result[key] || null;
        }
    }

    /**
     * Remove encrypted data
     */
    async removeEncrypted(key) {
        return new Promise((resolve) => {
            chrome.storage.local.remove([key], resolve);
        });
    }

    /**
     * Clear all encrypted data
     */
    async clearAll() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(resolve);
        });
    }
}

// Export for use in other files
window.SecureStorage = SecureStorage; 