/**
 * API Route: OAuth Callback Handler
 * GET /api/oauth/callback
 * 
 * Handles OAuth redirects from LinkedIn, GitHub, etc.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
        return new Response(`OAuth Error: ${error}`, {
            status: 400,
            headers: { 'Content-Type': 'text/html' },
        });
    }

    if (!code || !state) {
        return new Response('Missing code or state parameter', {
            status: 400,
            headers: { 'Content-Type': 'text/html' },
        });
    }

    try {
        // Get platform from state (stored in oauth_states table)
        const stateResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/oauth_states?state=eq.${state}`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
        });

        if (!stateResponse.ok) {
            throw new Error('Failed to fetch state');
        }

        const stateData = await stateResponse.json();
        if (!stateData || stateData.length === 0) {
            throw new Error('Invalid or expired state');
        }

        const platform = stateData[0].platform;
        const userId = stateData[0].user_id;

        // Exchange code for tokens based on platform
        let tokens;
        if (platform === 'linkedin') {
            tokens = await exchangeLinkedInCode(code);
        } else if (platform === 'github') {
            tokens = await exchangeGitHubCode(code);
        } else if (platform === 'indeed') {
            tokens = await exchangeIndeedCode(code);
        } else {
            throw new Error('Unsupported platform');
        }

        // Store tokens in Supabase
        await storeTokens(userId, platform, tokens);

        // Clean up state
        await fetch(`${process.env.SUPABASE_URL}/rest/v1/oauth_states?state=eq.${state}`, {
            method: 'DELETE',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Content-Type': 'application/json',
            },
        });

        // Redirect back to app with success
        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}?connected=${platform}&success=true`;
        return new Response(`
            <html>
                <head><title>Connected!</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2>✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} Connected!</h2>
                    <p>You will be redirected back to NexJobs...</p>
                    <script>window.location.href = '${redirectUrl}';</script>
                </body>
            </html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html' },
        });

    } catch (error) {
        console.error('OAuth callback error:', error);
        return new Response(`
            <html>
                <head><title>Error</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                    <h2>❌ Connection Failed</h2>
                    <p>${error.message}</p>
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}">Return to NexJobs</a>
                </body>
            </html>
        `, {
            status: 500,
            headers: { 'Content-Type': 'text/html' },
        });
    }
}

async function exchangeLinkedInCode(code) {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}/api/oauth/callback`,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`LinkedIn OAuth failed: ${error}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
}

async function exchangeGitHubCode(code) {
    const response = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code: code,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`GitHub OAuth failed: ${error}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        token_type: data.token_type,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // GitHub tokens don't expire
    };
}

async function exchangeIndeedCode(code) {
    // Indeed OAuth flow (placeholder - needs Indeed API credentials)
    const response = await fetch('https://api.indeed.com/v1/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            grant_type: 'authorization_code',
            code: code,
            client_id: process.env.INDEED_CLIENT_ID,
            client_secret: process.env.INDEED_CLIENT_SECRET,
            redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}/api/oauth/callback`,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Indeed OAuth failed: ${error}`);
    }

    const data = await response.json();
    return {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    };
}

async function storeTokens(userId, platform, tokens) {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/user_tokens`, {
        method: 'POST',
        headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
            user_id: userId,
            platform: platform,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_at: tokens.expires_at,
        }),
    });
}