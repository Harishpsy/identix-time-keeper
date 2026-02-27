const CryptoJS = require('crypto-js');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const IS_ENCRYPTION_ENABLED = process.env.ENCRYPTION_ENABLED === 'true';

const encrypt = (data) => {
    if (!IS_ENCRYPTION_ENABLED || !ENCRYPTION_KEY) return data;

    try {
        const textToEncrypt = typeof data === 'string' ? data : JSON.stringify(data);
        const encrypted = CryptoJS.AES.encrypt(textToEncrypt, ENCRYPTION_KEY).toString();
        return encrypted;
    } catch (error) {
        console.error('Encryption error:', error);
        return data;
    }
};

const decrypt = (encryptedData) => {
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

module.exports = { encrypt, decrypt };
