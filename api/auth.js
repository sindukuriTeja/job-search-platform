const fetch = require('node-fetch');
const crypto = require('crypto');

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_SECRET, TOKEN_EXPIRY } = require('./auth_config');

/**
 * Google OAuth authentication endpoint.
 * 
 * GET /api/auth?action=start     -> redirects to Google consent screen
 * GET /api/auth?action=callback&code=... -> exchanges code for token, returns JWT
 * GET /api/auth?action=logout    -> clears session (client-side)
 */
module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const action = req.query.action || '';

  if (action === 'start') {
    if (!CLIENT_ID || !REDIRECT_URI) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI env vars.' }) };
    }
    const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
    const state = crypto.randomBytes(16).toString('hex');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}/api/auth?action=callback&response_type=code&scope=${scope}&state=${state}`;
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.end();
    return;
  }

  if (action === 'callback') {
    const code = req.query.code;
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing authorization code' }) };

    try {
      // Exchange code for access token
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `code=${code}&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}/api/auth?action=callback&grant_type=authorization_code`,
      });
      const tokenData = await tokenResp.json();
      if (tokenData.error) throw new Error(tokenData.error_description || tokenData.error);

      // Get user info from Google
      const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const user = await userResp.json();

      // Generate JWT
      const token = generateJWT(user);

      return {
        statusCode: 200,
        headers: { ...headers, 'Set-Cookie': `pokee_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${tokenExpirySeconds(TOKEN_EXPIRY)}` },
        body: JSON.stringify({ success: true, user: { id: user.id, name: user.name, email: user.email, picture: user.picture } }),
      };
    } catch (err) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Authentication failed: ' + err.message }) };
    }
  }

  if (action === 'logout') {
    return {
      statusCode: 200,
      headers: { ...headers, 'Set-Cookie': 'pokee_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0' },
      body: JSON.stringify({ success: true }),
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid action. Use action=start, callback, or logout.' }) };
};

function generateJWT(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
    iat: now,
    exp: now + tokenExpirySeconds(TOKEN_EXPIRY),
  };
  const h = b64(JSON.stringify(header));
  const p = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function b64(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function tokenExpirySeconds(expiry) {
  const match = expiry.match(/(\d+)(h|m|s)/);
  if (!match) return 86400;
  const val = parseInt(match[1]);
  const unit = match[2];
  if (unit === 'h') return val * 3600;
  if (unit === 'm') return val * 60;
  return val;
}