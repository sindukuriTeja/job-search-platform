const crypto = require('crypto');
const { JWT_SECRET } = require('./auth_config');

// In-memory store for demo. In production, use Redis, PostgreSQL, or a database.
// Key: userId, Value: { searches: [...], resumes: [...] }
const userDataStore = {};

/**
 * User data storage endpoint.
 * GET  /api/user_data -> returns user's saved data
 * POST /api/user_data -> saves user's search data
 * 
 * Requires Authorization: Bearer <JWT> header
 */
module.exports = async (req, res) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  const user = verifyToken(req.headers.authorization);
  if (!user) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized. Please log in.' }) };
  }

  if (req.method === 'GET') {
    const data = userDataStore[user.id] || { searches: [], resumes: [] };
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  }

  if (req.method === 'POST') {
    try {
      const body = JSON.parse(req.body);
      if (!userDataStore[user.id]) {
        userDataStore[user.id] = { searches: [], resumes: [] };
      }
      if (body.search) {
        userDataStore[user.id].searches.unshift({
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          skills: body.search.skills || [],
          location: body.search.location || '',
          categories: body.search.categories || [],
          results_count: body.search.results_count || 0,
        });
        // Keep only last 20 searches
        if (userDataStore[user.id].searches.length > 20) {
          userDataStore[user.id].searches = userDataStore[user.id].searches.slice(0, 20);
        }
      }
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    } catch (err) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body' }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (parts[2] !== expectedSig) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { id: payload.sub, name: payload.name, email: payload.email, picture: payload.picture };
  } catch (e) {
    return null;
  }
}