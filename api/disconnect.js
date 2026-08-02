/**
 * API Route: Disconnect a platform
 * DELETE /api/disconnect
 * 
 * Body: { platform: 'linkedin' | 'github' | 'indeed' }
 */

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    if (req.method !== 'DELETE') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { platform, userId } = await req.json();

        if (!platform || !userId) {
            return new Response(JSON.stringify({ error: 'Platform and userId required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Delete the token from Supabase
        const response = await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/user_tokens?user_id=eq.${userId}&platform=eq.${platform}`,
            {
                method: 'DELETE',
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            throw new Error('Failed to disconnect platform');
        }

        return new Response(JSON.stringify({
            success: true,
            message: `${platform} disconnected successfully`,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Disconnect error:', error);
        return new Response(JSON.stringify({ error: 'Failed to disconnect platform' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}