/**
 * Supabase Client Configuration
 *
 * Set these environment variables in your deployment (Vercel/Netlify):
 *   SUPABASE_URL      — Your Supabase project URL
 *   SUPABASE_ANON_KEY — Your Supabase anon/public key
 *
 * For local dev, replace the placeholders below.
 */

const SUPABASE_URL    = 'https://izajwafosfpazmnpnqgz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_KvbfDXrnwMDoUBNUQyt52Q_Bbbu_2JF';

// Minimal Supabase client (no npm dependency — uses fetch)
class SupabaseClient {
    constructor(url, key) {
        this.url = url;
        this.key = key;
        this.headers = {
            'apikey': key,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
        };
        this._session = null;
    }

    // ---- AUTH ----

    async signInWithGoogle() {
        // Use popup-based OAuth for better UX (works locally and in production)
        const width = 500;
        const height = 600;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        // Use dynamic redirect URI so it works on any deployment
        const redirectUri = typeof window !== 'undefined'
            ? window.location.origin + '/auth_callback.html'
            : 'https://nexjobs.in/auth_callback.html';

        const authUrl = `${this.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile`;

        const popup = window.open(
            authUrl,
            'google-signin',
            `width=${width},height=${height},left=${left},top=${top},popup=yes`
        );

        if (!popup) {
            alert('Please allow popups for this site to sign in with Google.');
            return;
        }

        // Listen for message from popup (or poll for closure)
        const checkPopup = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkPopup);
                // Check if we got a token in localStorage (set by callback)
                const token = localStorage.getItem('supabase_token');
                if (token) {
                    window.dispatchEvent(new CustomEvent('supabase-auth-success'));
                } else {
                    // Redirect to main page to refresh auth state
                    window.location.href = '/';
                }
            }
        }, 500);

        // Also listen for postMessage from popup
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'supabase-auth-token') {
                localStorage.setItem('supabase_token', event.data.token);
                localStorage.setItem('supabase_user', JSON.stringify(event.data.user));
                clearInterval(checkPopup);
                if (popup && !popup.closed) popup.close();
                window.dispatchEvent(new CustomEvent('supabase-auth-success'));
                window.location.href = '/';
            }
        });
    }

    async getSession() {
        try {
            const resp = await fetch(`${this.url}/auth/v1/user`, {
                headers: { ...this.headers, Authorization: `Bearer ${this._getToken()}` },
            });
            if (resp.ok) {
                const user = await resp.json();
                this._session = user;
                return user;
            }
        } catch (e) { /* ignore */ }
        return null;
    }

    async signOut() {
        try {
            await fetch(`${this.url}/auth/v1/logout`, {
                method: 'POST',
                headers: { ...this.headers, Authorization: `Bearer ${this._getToken()}` },
            });
        } catch (e) { /* ignore */ }
        this._session = null;
        this._removeToken();
    }

    _getToken() {
        return localStorage.getItem('supabase_token');
    }

    _setToken(token) {
        localStorage.setItem('supabase_token', token);
    }

    _removeToken() {
        localStorage.removeItem('supabase_token');
    }

    get currentUser() {
        return this._session;
    }

    get isAuthenticated() {
        return !!this._session;
    }

    // ---- REST API helpers ----

    async query(table, options = {}) {
        const { select = '*', eq = {}, limit = 100, order = null, orderBy = 'desc' } = options;
        let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;

        for (const [key, value] of Object.entries(eq)) {
            if (value !== undefined && value !== null) {
                url += `&${key}=eq.${value}`;
            }
        }

        url += `&limit=${limit}`;
        if (order) url += `&order=${order}.${orderBy}`;

        const resp = await fetch(url, {
            headers: { ...this.headers, Authorization: `Bearer ${this._getToken()}` },
        });
        if (!resp.ok) throw new Error(`Query failed: ${resp.status}`);
        return resp.json();
    }

    async insert(table, data) {
        const resp = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: { ...this.headers, Authorization: `Bearer ${this._getToken()}` },
            body: JSON.stringify(data),
        });
        if (!resp.ok) throw new Error(`Insert failed: ${resp.status}`);
        return resp.json();
    }

    async upsert(table, data, matchColumns = ['id']) {
        const resp = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                ...this.headers,
                Authorization: `Bearer ${this._getToken()}`,
                'Prefer': `resolution=merge-duplicate:columns=${matchColumns.join(',')}`,
            },
            body: JSON.stringify(Array.isArray(data) ? data : [data]),
        });
        if (!resp.ok) throw new Error(`Upsert failed: ${resp.status}`);
        return resp.json();
    }

    async delete(table, eq = {}) {
        let url = `${this.url}/rest/v1/${table}`;
        for (const [key, value] of Object.entries(eq)) {
            url += `&${key}=eq.${value}`;
        }
        const resp = await fetch(url, {
            method: 'DELETE',
            headers: { ...this.headers, Authorization: `Bearer ${this._getToken()}` },
        });
        if (!resp.ok) throw new Error(`Delete failed: ${resp.status}`);
        return resp.json();
    }
}

// Create singleton instance
const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { supabase, SupabaseClient };
}
