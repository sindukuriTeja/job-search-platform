/**
 * API Route: Get connected platforms for a user
 * GET /api/connected-platforms
 * 
 * Returns list of platforms the user has connected.
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'GET') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const userId = req.headers.get('x-user-id');
        
        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch user's connected platforms
        const response = await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/user_tokens?user_id=eq.${userId}&select=platform,expires_at,created_at`,
            {
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch connected platforms');
        }

        const platforms = await response.json();
        
        // Format response
        const connectedPlatforms = platforms.map(p => ({
            platform: p.platform,
            connected_at: p.created_at,
            expires_at: p.expires_at,
            is_active: !p.expires_at || new Date(p.expires_at) > new Date(),
        }));

        return new Response(JSON.stringify({
            platforms: connectedPlatforms,
            count: connectedPlatforms.length,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Get connected platforms error:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch connected platforms' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}