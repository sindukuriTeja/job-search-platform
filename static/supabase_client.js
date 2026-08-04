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

        // Use the live site as redirect target for reliability
        const redirectUri = 'https://nexjobs.in/auth_callback.html';
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

    // ---- Auth namespace (compatible with Supabase JS client API) ----
    // This lets auth.html call supabase.auth.signInWithOAuth(), etc.

    get auth() {
        const self = this;
        return {
            async signInWithOAuth({ provider, options: { redirectTo } = {} } = {}) {
                const width = 500;
                const height = 600;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;
                const redirectUri = redirectTo || (typeof window !== 'undefined'
                    ? window.location.origin + '/index.html'
                    : 'https://nexjobs.in/index.html');

                const authUrl = `${self.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile`;

                const popup = window.open(
                    authUrl,
                    'google-signin',
                    `width=${width},height=${height},left=${left},top=${top},popup=yes`
                );

                if (!popup) {
                    return { error: { message: 'Please allow popups for this site to sign in.' } };
                }

                return new Promise((resolve) => {
                    const checkPopup = setInterval(() => {
                        if (popup.closed) {
                            clearInterval(checkPopup);
                            const token = localStorage.getItem('supabase_token');
                            if (token) {
                                resolve({ data: { user: null }, error: null });
                            } else {
                                resolve({ data: null, error: { message: 'Sign-in was cancelled.' } });
                            }
                        }
                    }, 500);

                    window.addEventListener('message', function handler(event) {
                        if (event.data && event.data.type === 'supabase-auth-token') {
                            localStorage.setItem('supabase_token', event.data.token);
                            localStorage.setItem('supabase_user', JSON.stringify(event.data.user));
                            clearInterval(checkPopup);
                            if (popup && !popup.closed) popup.close();
                            resolve({ data: { user: event.data.user }, error: null });
                        }
                    });
                });
            },

            async signInWithPassword({ email, password }) {
                const resp = await fetch(`${self.url}/auth/v1/token?grant_type=password`, {
                    method: 'POST',
                    headers: { 'apikey': self.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.message || `Sign-in failed: ${resp.status}`);
                }
                const data = await resp.json();
                self._setToken(data.access_token);
                self._session = data.user;
                return { data: { user: data.user, session: data }, error: null };
            },

            async signUp({ email, password, options: { data: metadata, emailRedirectTo } = {} } = {}) {
                const body = { email, password };
                if (metadata) body.data = metadata;
                if (emailRedirectTo) body.email_redirect_to = emailRedirectTo;

                const resp = await fetch(`${self.url}/auth/v1/signup`, {
                    method: 'POST',
                    headers: { 'apikey': self.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.message || `Sign-up failed: ${resp.status}`);
                }
                const result = await resp.json();
                if (result.access_token) {
                    self._setToken(result.access_token);
                    self._session = result.user;
                }
                return { data: result, error: null };
            },

            async resetPasswordForEmail(email, { redirectTo } = {}) {
                const resp = await fetch(`${self.url}/auth/v1/recover`, {
                    method: 'POST',
                    headers: { 'apikey': self.key, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, redirect_to: redirectTo }),
                });
                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.message || `Failed to send reset email: ${resp.status}`);
                }
                return { error: null };
            },

            async getSession() {
                const token = self._getToken();
                if (!token) return { data: { session: null }, error: null };
                try {
                    const resp = await fetch(`${self.url}/auth/v1/user`, {
                        headers: { ...self.headers, Authorization: `Bearer ${token}` },
                    });
                    if (resp.ok) {
                        const user = await resp.json();
                        self._session = user;
                        return { data: { session: { user, access_token: token } }, error: null };
                    }
                } catch (e) { /* ignore */ }
                return { data: { session: null }, error: null };
            },
        };
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