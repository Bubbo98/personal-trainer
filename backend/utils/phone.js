/**
 * A phone number reduced to its digits, without the Italian prefix, so that
 * "+39 333 123 4567", "0039 3331234567" and "333-1234567" compare equal.
 * null when there are no digits.
 */
function normalizePhone(phone) {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.startsWith('0039')) digits = digits.slice(4);
    else if (digits.startsWith('39') && digits.length === 12) digits = digits.slice(2);
    return digits || null;
}

module.exports = { normalizePhone };
