/**
 * HTTP helpers shared by every route:
 *   - HttpError + shortcuts (badRequest, notFound…) to fail with a status;
 *   - route(): async handler whose errors reach the central error middleware;
 *   - id(): validated integer from a route/query parameter.
 * Error responses always look like { success: false, error, code? }.
 */

class HttpError extends Error {
    constructor(status, message, code) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

const badRequest = (message, code) => new HttpError(400, message, code);
const unauthorized = (message = 'Access token required', code) => new HttpError(401, message, code);
const forbidden = (message = 'Access denied', code) => new HttpError(403, message, code);
const notFound = (message = 'Not found', code) => new HttpError(404, message, code);
const conflict = (message, code) => new HttpError(409, message, code);

/** Wraps an async (req, res) handler: a thrown error or rejection goes to next(). */
const route = (handler) => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
};

/** Positive integer from a parameter, or a 400. */
function id(value, name = 'id') {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw badRequest(`Valid ${name} is required`);
    return n;
}

/** Content-Disposition for a download, safe with quotes and accents in the file name. */
function attachment(fileName) {
    const ascii = String(fileName).replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/** True for a UNIQUE constraint failure (libsql and sqlite3 wording). */
const isUniqueViolation = (err) => /unique/i.test(`${err && err.code} ${err && err.message}`);

/** Last middleware: turns any error into the JSON error shape. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
    // multer: file too large / wrong type
    if (err && err.name === 'MulterError') err = badRequest(err.message, err.code);

    const status = err.status || err.statusCode || 500;
    if (status >= 500) console.error(`${req.method} ${req.originalUrl}:`, err);

    const message = status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    res.status(status).json({ success: false, error: message, ...(err.code && status < 500 ? { code: err.code } : {}) });
}

module.exports = { HttpError, badRequest, unauthorized, forbidden, notFound, conflict, route, id, attachment, isUniqueViolation, errorHandler };
