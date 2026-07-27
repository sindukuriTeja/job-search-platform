// Shared authentication configuration

// Google OAuth 2.0 credentials — set these as Vercel env vars
// GOOGLE_CLIENT_ID: Your Google OAuth client ID
// GOOGLE_CLIENT_SECRET: Your Google OAuth client secret
// GOOGLE_REDIRECT_URI: e.g. https://your-app.vercel.app
// JWT_SECRET: A random 32+ character string for signing tokens

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

// Token expiry (24 hours)
const TOKEN_EXPIRY = '24h';

module.exports = { CLIENT_ID, CLIENT_SECRET, REDIRECT_URI, JWT_SECRET, TOKEN_EXPIRY };