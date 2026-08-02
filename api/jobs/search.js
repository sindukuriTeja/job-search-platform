/**
 * API Route: Fetch jobs from connected platforms
 * POST /api/jobs/search
 * 
 * Body: { 
 *   query: string,
 *   location: string,
 *   platforms: ['linkedin', 'github', ...]
 * }
 * 
 * Uses stored OAuth tokens to fetch jobs from connected accounts.
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
        const { query, location, platforms, userId } = await req.json();

        if (!query || !userId) {
            return new Response(JSON.stringify({ error: 'Query and userId are required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        // Fetch user's connected platform tokens
        const tokensResponse = await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/user_tokens?user_id=eq.${userId}&platform=in.(${(platforms || ['linkedin', 'github']).join(',')})`,
            {
                headers: {
                    'apikey': process.env.SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!tokensResponse.ok) {
            throw new Error('Failed to fetch tokens');
        }

        const tokens = await tokensResponse.json();
        const allJobs = [];
        const platformsSearched = [];
        const failedPlatforms = [];

        // Fetch jobs from each connected platform
        for (const token of tokens) {
            try {
                let jobs = [];
                if (token.platform === 'linkedin') {
                    jobs = await searchLinkedInJobs(query, location, token.access_token);
                } else if (token.platform === 'github') {
                    jobs = await searchGitHubJobs(query, location, token.access_token);
                } else if (token.platform === 'indeed') {
                    jobs = await searchIndeedJobs(query, location, token.access_token);
                }

                if (jobs.length > 0) {
                    allJobs.push(...jobs);
                    platformsSearched.push(token.platform);
                } else {
                    failedPlatforms.push(token.platform);
                }
            } catch (error) {
                console.error(`Error fetching from ${token.platform}:`, error);
                failedPlatforms.push(token.platform);
            }
        }

        return new Response(JSON.stringify({
            jobs: removeDuplicates(allJobs),
            platforms_searched: platformsSearched,
            failed_platforms: failedPlatforms,
            total_jobs: allJobs.length,
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Job search error:', error);
        return new Response(JSON.stringify({ error: 'Failed to search jobs' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}

/**
 * Search LinkedIn Jobs API
 */
async function searchLinkedInJobs(query, location, accessToken) {
    const jobs = [];
    const url = `https://api.linkedin.com/v2/jobs/search?keywords=${encodeURIComponent(query)}&locationName=${encodeURIComponent(location || '')}&count=50`;

    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'LinkedIn-Version': '202312',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json();
    for (const element of (data.elements || [])) {
        jobs.push({
            title: element.title?.text || '',
            company: element.company?.localizedName || '',
            location: element.location?.name || '',
            description: element.description?.text?.substring(0, 300) || '',
            url: element.redirectUrl || element.occurrenceUrl || '',
            portal: 'LinkedIn',
            job_type: element.workingArrangement?.[0] || '',
            posted_date: element.datePosted || '',
            salary: element.salaryMin || element.salaryMax ? `${element.salaryMin || ''}-${element.salaryMax || ''}` : '',
        });
    }

    return jobs;
}

/**
 * Search GitHub Jobs (via RSS/JSON)
 */
async function searchGitHubJobs(query, location, accessToken) {
    const jobs = [];
    try {
        const response = await fetch(`https://api.github.com/jobsofficial/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
            signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        for (const job of (data.jobs || [])) {
            jobs.push({
                title: job.title || '',
                company: job.company || '',
                location: job.location || 'Remote',
                description: job.description?.substring(0, 300) || '',
                url: job.url || '',
                portal: 'GitHub',
                job_type: 'Remote',
                posted_date: job.created_at || '',
            });
        }
    } catch (error) {
        console.warn('GitHub jobs search failed:', error.message);
    }

    return jobs;
}

/**
 * Search Indeed Publisher API
 */
async function searchIndeedJobs(query, location, accessToken) {
    const jobs = [];
    try {
        const response = await fetch(
            `https://api.indeed.com/publisher/v1/jobs/search?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location || '')}&num=50`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'X-Indeed-Publisher-Key': process.env.INDEED_PUBLISHER_KEY,
                },
                signal: AbortSignal.timeout(15000),
            }
        );

        if (!response.ok) {
            throw new Error(`Indeed API error: ${response.status}`);
        }

        const data = await response.json();
        for (const job of (data.jobs || [])) {
            jobs.push({
                title: job.jobTitle || '',
                company: job.company || '',
                location: job.location || '',
                description: job.snippet?.substring(0, 300) || '',
                url: job.jobUrl || '',
                portal: 'Indeed',
                salary: job.salary || '',
                posted_date: job.date || '',
            });
        }
    } catch (error) {
        console.warn('Indeed jobs search failed:', error.message);
    }

    return jobs;
}

/**
 * Remove duplicate jobs
 */
function removeDuplicates(jobs) {
    const seen = new Set();
    const unique = [];
    for (const job of jobs) {
        const key = `${(job.title || '').toLowerCase().trim()}|${(job.company || '').toLowerCase().trim()}`;
        if (!seen.has(key) && key !== '|') {
            seen.add(key);
            unique.push(job);
        }
    }
    return unique;
}