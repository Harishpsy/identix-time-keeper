const { encrypt, decrypt } = require('../utils/crypto');

const encryptionMiddleware = (req, res, next) => {
    const isEncryptionEnabled = String(process.env.ENCRYPTION_ENABLED).toLowerCase() === 'true';

    if (!isEncryptionEnabled) {
        return next();
    }

    // 1. Decrypt incoming request body if it contains encryptedData
    if (req.body && req.body.encryptedData) {
        try {
            const decryptedBody = decrypt(req.body.encryptedData);
            
            // If decryption failed or returned same string, it might be a key mismatch
            if (decryptedBody === req.body.encryptedData) {
                console.error('[Encryption] Decryption failed: Data returned unchanged. Check ENCRYPTION_KEY.');
                return res.status(400).json({ error: 'Decryption failed: Key mismatch or invalid data' });
            }

            req.body = decryptedBody;
        } catch (error) {
            console.error('[Encryption] Request decryption critical failure:', error);
            return res.status(400).json({ error: 'Invalid encrypted payload' });
        }
    }

    // 2. Wrap res.json and res.send to encrypt outgoing response
    const originalJson = res.json;
    res.json = function (data) {
        if (data && data.encryptedData) {
            return originalJson.call(this, data);
        }

        const encryptedResponse = {
            encryptedData: encrypt(data)
        };

        return originalJson.call(this, encryptedResponse);
    };

    const originalSend = res.send;
    res.send = function (data) {
        if (typeof data === 'object') {
            return res.json(data);
        }

        if (typeof data === 'string' && !data.includes('encryptedData')) {
            const encrypted = encrypt(data);
            return originalSend.call(this, JSON.stringify({ encryptedData: encrypted }));
        }

        return originalSend.call(this, data);
    };

    next();
};

module.exports = encryptionMiddleware;
