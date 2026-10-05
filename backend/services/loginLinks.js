const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * A client's personal dashboard link (/dashboard/<token>): opening it logs the
 * client in (POST /api/auth/login-link swaps it for a session). The token has no
 * expiry, since links already sent to clients must keep working; access still
 * ends with the plan (see utils/userRetention).
 *
 * @param {{ id, username, email }} user
 */
function loginLink(user) {
    const loginToken = jwt.sign(
        { userId: user.id, username: user.username, email: user.email || null, type: 'login_link' },
        config.jwtSecret
    );
    return { loginToken, loginUrl: `${config.appUrl}/dashboard/${loginToken}` };
}

module.exports = { loginLink };
