const CryptoJS = require('crypto-js');
require('dotenv').config();

const encrypt = (data) => {
    const key = process.env.ENCRYPTION_KEY;
    const enabled = String(process.env.ENCRYPTION_ENABLED).toLowerCase() === 'true';
    
    if (!enabled || !key) return data;

    try {
        const textToEncrypt = typeof data === 'string' ? data : JSON.stringify(data);
        return CryptoJS.AES.encrypt(textToEncrypt, key).toString();
    } catch (error) {
        console.error('Encryption error:', error);
        return data;
    }
};

const decrypt = (encryptedData) => {
    const key = process.env.ENCRYPTION_KEY;
    const enabled = String(process.env.ENCRYPTION_ENABLED).toLowerCase() === 'true';

    if (!enabled || !key || typeof encryptedData !== 'string') return encryptedData;

    try {
        const bytes = CryptoJS.AES.decrypt(encryptedData, key);
        const decryptedText = bytes.toString(CryptoJS.enc.Utf8);

        if (!decryptedText) {
            console.error('Decryption failed: Empty result. Possible key mismatch.');
            return encryptedData;
        }

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
