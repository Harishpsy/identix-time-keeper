/**
 * Utility to validate if an email belongs to an "official" domain.
 * Blocks common public email providers.
 */

const PUBLIC_DOMAINS = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'icloud.com',
    'aol.com',
    'zoho.com',
    'protonmail.com',
    'gmx.com',
    'yandex.com',
    'mail.com'
];

/**
 * Checks if the email domain is NOT in the public domains list.
 * @param {string} email 
 * @returns {boolean}
 */
const isOfficialEmail = (email) => {
    if (!email || !email.includes('@')) return false;

    const domain = email.split('@')[1].toLowerCase();
    return !PUBLIC_DOMAINS.includes(domain);
};

module.exports = {
    isOfficialEmail,
    PUBLIC_DOMAINS
};
