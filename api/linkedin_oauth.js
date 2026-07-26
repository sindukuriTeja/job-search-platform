const fetch = require('node-fetch');

// Serverless handler for LinkedIn OAuth start/callback.
// Usage:
// - GET /api/linkedin_oauth?action=start -> redirects user to LinkedIn consent page
// - GET /api/linkedin_oauth?action=callback&code=... -> exchanges code for token and returns JSON

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI; // must match app settings

module.exports = async (req, res) => {
  const action = (req.query.action || '').toString();

  if (action === 'start') {
    if (!CLIENT_ID || !REDIRECT_URI) {
      res.statusCode = 500;
      res.end('LINKEDIN_CLIENT_ID and LINKEDIN_REDIRECT_URI must be set in env');
      return;
    }
    const state = Math.random().toString(36).substring(2, 15);
    const scope = encodeURIComponent('r_liteprofile r_emailaddress');
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${state}&scope=${scope}`;
    res.statusCode = 302;
    res.setHeader('Location', url);
    res.end();
    return;
  }

  if (action === 'callback') {
    const code = req.query.code;
    if (!code) {
      res.statusCode = 400;
      res.end('Missing code');
      return;
    }
    if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
      res.statusCode = 500;
      res.end('LinkedIn client config not set');
      return;
    }

    try {
      const tokenResp = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=authorization_code&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}`,
      });
      const data = await tokenResp.json();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    } catch (err) {
      res.statusCode = 502;
      res.end('Token exchange failed: ' + String(err.message || err));
    }
    return;
  }

  res.statusCode = 400;
  res.end('Unsupported action');
};
