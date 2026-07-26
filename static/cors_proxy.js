function proxyUrl(url) {
    const encoded = encodeURIComponent(url);
    // Allow a deploy-time or runtime override by setting `window.PROXY_URL` to
    // a proxy service that accepts `?url=` or a path like `/api/proxy?url=`.
    if (typeof window !== 'undefined' && window.PROXY_URL) {
        const base = window.PROXY_URL.replace(/\/?$/, '');
        return `${base}?url=${encoded}`;
    }
    return `https://api.allorigins.win/raw?url=${encoded}`;
}

async function fetchWithCors(url, options = {}) {
    // When running on GitHub Pages (or other remote static hosting) prefer the
    // proxy first to avoid noisy CORS errors in the browser console. Keep
    // direct fetch as a fallback for localhost/dev environments.
    const hostname = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
    const preferProxy = hostname && hostname.includes('github.io');

    if (preferProxy) {
        try {
            const proxy = proxyUrl(url);
            const resp = await fetch(proxy, options);
            if (resp.ok) return resp;
        } catch (e) {
            console.warn('Proxy fetch failed:', url, e.message);
        }

        try {
            const resp = await fetch(url, options);
            if (resp.ok) return resp;
        } catch (e) {
            console.warn('Direct fetch failed:', url, e.message);
        }
    } else {
        try {
            const resp = await fetch(url, options);
            if (resp.ok) return resp;
        } catch (e) {
            console.warn('Direct fetch failed:', url, e.message);
        }

        try {
            const proxy = proxyUrl(url);
            const resp = await fetch(proxy, options);
            if (resp.ok) return resp;
        } catch (e) {
            console.warn('Proxy fetch failed:', url, e.message);
        }
    }

    throw new Error('Fetch blocked by CORS or failed.');
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fetchWithCors, proxyUrl };
}
