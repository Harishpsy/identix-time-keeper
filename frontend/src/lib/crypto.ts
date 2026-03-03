import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY;
const IS_ENCRYPTION_ENABLED = import.meta.env.VITE_ENCRYPTION_ENABLED === 'true';

export const encrypt = (data: any): string => {
    if (!IS_ENCRYPTION_ENABLED || !ENCRYPTION_KEY) return data;

    try {
        const textToEncrypt = typeof data === 'string' ? data : JSON.stringify(data);
        // Use AES-256-CBC (crypto-js uses it by default with a passphrase, 
        // but we can specify the key and IV for better compatibility with Node's crypto)
        // For simplicity and compatibility, we'll use a fixed salt/IV derived from key for now, 
        // OR just use standard CryptoJS encryption which uses OpenSSL compatible format.

        const encrypted = CryptoJS.AES.encrypt(textToEncrypt, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return data;
    }
};

export const decrypt = (encryptedData: string): any => {
    if (!IS_ENCRYPTION_ENABLED || !ENCRYPTION_KEY || typeof encryptedData !== 'string') return encryptedData;

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        try {
            return JSON.parse(decryptedText);
        } catch {
            return decryptedText;
        }
    } catch (error) {
        console.error('Decryption error:', error);
        return encryptedData;
    }
};
