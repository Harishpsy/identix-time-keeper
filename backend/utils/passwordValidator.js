/**
 * Utility to validate password strength.
 * Requirements:
 * - Minimum 8 characters
 * - At least 1 number
 * - At least 1 special character
 */

const validatePassword = (password) => {
    if (!password) return { isValid: false, error: 'Password is required.' };

    if (password.length < 8) {
        return { isValid: false, error: 'Password must be at least 8 characters long.' };
    }

    const hasNumber = /\d/.test(password);
    if (!hasNumber) {
        return { isValid: false, error: 'Password must contain at least one number.' };
    }

    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasSpecialChar) {
        return { isValid: false, error: 'Password must contain at least one special character.' };
    }

    return { isValid: true };
};

module.exports = {
    validatePassword
};
