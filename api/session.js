const crypto = require('crypto');
const { JWT_SECRET } = require('./auth_config');

/**
 * Session validation endpoint.
 * GET /api/session -> returns current user info if authenticated, or { authenticated: false }
 */
module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Cookie',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const cookie = req.headers.cookie || '';
  const sessionMatch = cookie.match(/pokee_session=([^;]+)/);
  if (!sessionMatch) {
    return { statusCode: 200, headers, body: JSON.stringify({ authenticated: false }) };
  }

  try {
    const token = sessionMatch[1];
    const decoded = decodeJWT(token);
    if (!decoded || decoded.exp < Math.floor(Date.now() / 1000)) {
      return { statusCode: 200, headers, body: JSON.stringify({ authenticated: false }) };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ authenticated: true, user: { id: decoded.sub, name: decoded.name, email: decoded.email, picture: decoded.picture } }),
    };
  } catch (err) {
    return { statusCode: 200, headers, body: JSON.stringify({ authenticated: false }) };
  }
};

function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (parts[2] !== expectedSig) return null;
  return payload;
}