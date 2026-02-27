const { encrypt, decrypt } = require('../utils/crypto');

const encryptionMiddleware = (req, res, next) => {
    const isEncryptionEnabled = process.env.ENCRYPTION_ENABLED === 'true';

    if (!isEncryptionEnabled) {
        return next();
    }

    // 1. Decrypt incoming request body if it contains encryptedData
    if (req.body && req.body.encryptedData) {
        try {
            const decryptedBody = decrypt(req.body.encryptedData);
            req.body = decryptedBody;
        } catch (error) {
            console.error('Request decryption failed:', error);
            // Optionally: return res.status(400).json({ error: 'Invalid encrypted payload' });
        }
    }

    // 2. Wrap res.json and res.send to encrypt outgoing response
    const originalJson = res.json;
    res.json = function (data) {
        // Skip encryption for certain cases (like when data is already an error or special response)
        // or just encrypt everything for consistency.

        // Don't encrypt if it's already an encrypted object (prevent double encryption)
        if (data && data.encryptedData) {
            return originalJson.call(this, data);
        }

        const encryptedResponse = {
            encryptedData: encrypt(data)
        };

        return originalJson.call(this, encryptedResponse);
    };

    // Also wrap res.send for completeness (though most routes use res.json)
    const originalSend = res.send;
    res.send = function (data) {
        // If data is a string/buffer and doesn't look like JSON, we might want to handle it differently.
        // But for this API, most responses are JSON.
        if (typeof data === 'object') {
            return res.json(data);
        }

        // For strings (non-JSON), we can still encrypt
        if (typeof data === 'string' && !data.includes('encryptedData')) {
            const encrypted = encrypt(data);
            return originalSend.call(this, JSON.stringify({ encryptedData: encrypted }));
        }

        return originalSend.call(this, data);
    };

    next();
};

module.exports = encryptionMiddleware;
