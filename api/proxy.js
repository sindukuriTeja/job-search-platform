const fetch = require('node-fetch');

// Vercel / Now serverless function. Deploy this to Vercel (or Netlify with
// minor adaptions) and set `window.PROXY_URL` in the client to point to the
// deployed function URL (for example: https://your-deploy.vercel.app/api/proxy).

// Optional environment variables (set in Vercel/Netlify dashboard):
// - LINKEDIN_GUEST_KEY: the guest key / token value
// - LINKEDIN_GUEST_HEADER: header name to attach the key (default: x-api-key)
// - LINKEDIN_GUEST_QUERY_PARAM: query parameter name to attach the key instead

const LINKEDIN_GUEST_KEY = process.env.LINKEDIN_GUEST_KEY;
const LINKEDIN_GUEST_HEADER = process.env.LINKEDIN_GUEST_HEADER || 'x-api-key';
const LINKEDIN_GUEST_QUERY_PARAM = process.env.LINKEDIN_GUEST_QUERY_PARAM;

module.exports = async (req, res) => {
  const urlParam = req.query.url || (req.body && req.body.url);
  if (!urlParam) {
    res.statusCode = 400;
    res.end('Missing url parameter');
    return;
  }

  try {
    let targetUrl = urlParam;
    const headers = { Accept: '*/*', 'User-Agent': 'jobsearch-proxy/1.0' };

    // If a LinkedIn guest key is configured and the request targets linkedin,
    // attach it either as a header or a query param depending on configuration.
    try {
      const parsed = new URL(targetUrl);
      if (LINKEDIN_GUEST_KEY && parsed.hostname.includes('linkedin.com')) {
        if (LINKEDIN_GUEST_QUERY_PARAM) {
          parsed.searchParams.set(LINKEDIN_GUEST_QUERY_PARAM, LINKEDIN_GUEST_KEY);
          targetUrl = parsed.toString();
        } else if (LINKEDIN_GUEST_HEADER) {
          headers[LINKEDIN_GUEST_HEADER] = LINKEDIN_GUEST_KEY;
        }
      }
    } catch (e) {
      // ignore URL parse errors and proceed with original targetUrl
      console.warn('Proxy: URL parse failed', e && e.message);
    }

    const resp = await fetch(targetUrl, { headers });
    const contentType = resp.headers.get('content-type') || 'text/plain';
    const body = await resp.buffer();

    // Allow cross-origin requests from anywhere; for production tighten this.
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Content-Type', contentType);
    res.statusCode = resp.status || 200;
    res.end(body);
  } catch (err) {
    res.statusCode = 502;
    res.end('Proxy fetch failed: ' + String(err.message || err));
  }
};
