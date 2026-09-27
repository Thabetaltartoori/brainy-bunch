/** Small helpers shared by all routes. */

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (msg, code) => new HttpError(400, msg, code);
export const unauthorized = (msg = 'Not signed in') => new HttpError(401, msg);
export const forbidden = (msg = 'You do not have access to this record') => new HttpError(403, msg);
export const notFound = (msg = 'Not found') => new HttpError(404, msg);
export const conflict = (msg) => new HttpError(409, msg);

/** Wrap an async handler so rejections reach the error middleware. */
export const route = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

const str = (v, field, { max = 500, required = true, fallback = '' } = {}) => {
  if (v === undefined || v === null) {
    if (required) throw badRequest(`"${field}" is required`);
    return fallback;
  }
  const s = String(v).trim();
  if (required && !s) throw badRequest(`"${field}" is required`);
  if (s.length > max) throw badRequest(`"${field}" must be under ${max} characters`);
  return s;
};

const num = (v, field, { min = 0, max = 1_000_000 } = {}) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw badRequest(`"${field}" must be a number`);
  if (n < min || n > max) throw badRequest(`"${field}" must be between ${min} and ${max}`);
  return Math.round(n * 100) / 100;
};

const oneOf = (v, field, allowed, { required = true, fallback } = {}) => {
  if (v === undefined || v === null) {
    if (required) throw badRequest(`"${field}" is required`);
    return fallback;
  }
  const s = String(v);
  if (!allowed.includes(s)) {
    throw badRequest(`"${field}" must be one of: ${allowed.join(', ')}`);
  }
  return s;
};

const bool = (v, fallback = true) => (v === undefined ? fallback : Boolean(v));

export const v = { str, num, oneOf, bool };
