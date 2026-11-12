const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const cookie = require('cookie');
const db = require('./db');

const COOKIE_NAME = 'sea_session';
const SESSION_LIFETIME_DAYS = 7;

// In-memory rate limiter for login attempts (per IP)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);
  if (!record) return { allowed: true };

  // Clear if expired
  if (now - record.firstAttempt > LOCKOUT_WINDOW_MS) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const remainingSec = Math.ceil((LOCKOUT_WINDOW_MS - (now - record.firstAttempt)) / 1000);
    return {
      allowed: false,
      message: `ลองรหัสผ่านผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(remainingSec / 60)} นาทีแล้วลองใหม่นะ`
    };
  }

  return { allowed: true };
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, firstAttempt: now };
  record.count += 1;
  loginAttempts.set(ip, record);
}

function clearRateLimit(ip) {
  loginAttempts.delete(ip);
}

/**
 * Hash password with bcrypt
 */
async function hashPassword(plainText) {
  return bcrypt.hash(plainText, 10);
}

/**
 * Verify password against shared password in .env
 */
async function verifyPassword(plainText) {
  const sharedPassword = process.env.SHARED_PASSWORD;
  if (!sharedPassword) {
    throw new Error('SHARED_PASSWORD is not configured on server');
  }
  // Constant time string comparison or bcrypt compare
  return plainText === sharedPassword;
}

/**
 * Parse cookies from request headers
 */
function getSessionIdFromRequest(event) {
  const cookieHeader = event.headers.cookie || event.headers.Cookie || '';
  const parsed = cookie.parse(cookieHeader);
  return parsed[COOKIE_NAME] || null;
}

/**
 * Get current authenticated user from request
 */
async function getAuthUser(event) {
  const sessionId = getSessionIdFromRequest(event);
  if (!sessionId) return null;

  const now = new Date();
  const res = await db.query(
    `SELECT s.session_id, s.f_id, s.expires_at, f.name 
     FROM sessions s
     JOIN friends f ON TRIM(f.f_id) = TRIM(s.f_id)
     WHERE s.session_id = $1 AND s.expires_at > $2`,
    [sessionId, now]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    sessionId: row.session_id,
    f_id: row.f_id.trim(),
    name: row.name,
    expiresAt: row.expires_at
  };
}

/**
 * Create a new session for friend
 */
async function createSession(fId, userAgent = '', ipAddress = '') {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `INSERT INTO sessions (session_id, f_id, expires_at, user_agent, ip_address)
     VALUES ($1, $2, $3, $4, $5)`,
    [sessionId, fId.trim(), expiresAt, (userAgent || '').substring(0, 500), (ipAddress || '').substring(0, 45)]
  );

  return sessionId;
}

/**
 * Delete a session (Logout)
 */
async function destroySession(sessionId) {
  if (!sessionId) return;
  await db.query('DELETE FROM sessions WHERE session_id = $1', [sessionId]);
}

/**
 * Serialize session cookie for response
 * Note: No Max-Age or Expires is set, so the browser treats it as a Session Cookie
 * (cleared automatically when the browser closes).
 */
function createSessionCookie(sessionId, isProduction = false) {
  return cookie.serialize(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });
}

function clearSessionCookie(isProduction = false) {
  return cookie.serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });
}

module.exports = {
  checkRateLimit,
  recordFailedAttempt,
  clearRateLimit,
  hashPassword,
  verifyPassword,
  getSessionIdFromRequest,
  getAuthUser,
  createSession,
  destroySession,
  createSessionCookie,
  clearSessionCookie,
  COOKIE_NAME
};
