/**
 * API Route: Start OAuth flow for a platform
 * POST /api/oauth/start
 * 
 * Body: { platform: 'linkedin' | 'github' | 'indeed' }
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { platform } = await req.json();
        
        if (!platform) {
            return new Response(JSON.stringify({ error: 'Platform is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Platform-specific OAuth configurations
        const oauthConfigs = {
            linkedin: {
                authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
                clientId: process.env.LINKEDIN_CLIENT_ID,
                redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}/api/oauth/callback`,
                scope: 'w_member_social r_liteprofile r_emailaddress',
                state: generateState(),
            },
            github: {
                authUrl: 'https://github.com/login/oauth/authorize',
                clientId: process.env.GITHUB_CLIENT_ID,
                redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}/api/oauth/callback`,
                scope: 'read:user user:email',
                state: generateState(),
            },
            indeed: {
                // Indeed uses a different OAuth flow
                authUrl: 'https://publisher.indeed.com/api/oauth/authorize',
                clientId: process.env.INDEED_CLIENT_ID,
                redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://nexjobs.in'}/api/oauth/callback`,
                scope: 'publisher:jobs:read',
                state: generateState(),
            },
        };

        const config = oauthConfigs[platform];
        if (!config) {
            return new Response(JSON.stringify({ error: 'Platform not supported' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Build OAuth URL
        const authUrl = new URL(config.authUrl);
        authUrl.searchParams.set('client_id', config.clientId);
        authUrl.searchParams.set('redirect_uri', config.redirectUri);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('scope', config.scope);
        authUrl.searchParams.set('state', config.state);

        // Store state in Supabase for security (prevent CSRF)
        const stateResponse = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${req.headers.get('authorization')?.split(' ')[1]}`,
            },
        });

        if (stateResponse.ok) {
            const user = await stateResponse.json();
            // Store state temporarily (in production, use Redis or similar)
            await fetch(`${process.env.SUPABASE_URL}/rest/v1/oauth_states`, {
                method: 'POST',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal',
                },
                body: JSON.stringify({
                    state: config.state,
                    platform: platform,
                    user_id: user.id,
                    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
                }),
            });
        }

        return new Response(JSON.stringify({ 
            authUrl: authUrl.toString(),
            platform: platform,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('OAuth start error:', error);
        return new Response(JSON.stringify({ error: 'Failed to start OAuth flow' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

function generateState() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}