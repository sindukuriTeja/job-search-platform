/**
 * Client-side Job Search Engine
 * Searches across multiple job platforms using fetch API
 * All searches run concurrently with Promise.allSettled
 */

const HEADERS = {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Optional: set your free Jooble API key here (get one free at jooble.org/api)
const JOOBLE_API_KEY = '';

/**
 * Build multiple focused search queries from skills
 */
function buildQueries(skills, keywords, experienceLevel) {
    const generic = new Set([
        'communication', 'teamwork', 'leadership', 'problem solving',
        'critical thinking', 'time management', 'adaptability', 'creativity',
        'agile', 'scrum', 'git', 'linux', 'windows',
    ]);
    const techSkills = skills.filter(s => !generic.has(s.toLowerCase()));

    const levelSuffix = {
        fresher: 'fresher',
        entry: 'junior',
        mid: '',
        senior: 'senior',
    }[experienceLevel] || '';

    const queries = [];

    // Query 1: top 3 technical skills combined
    if (techSkills.length > 0) {
        let q1 = techSkills.slice(0, 3).join(' ');
        if (levelSuffix) q1 = `${levelSuffix} ${q1}`;
        queries.push(q1.trim());
    }

    // Query 2: next 2-3 skills
    if (techSkills.length > 3) {
        let q2 = techSkills.slice(3, 6).join(' ');
        if (levelSuffix) q2 = `${levelSuffix} ${q2}`;
        queries.push(q2.trim());
    }

    // Query 3: top keyword if different from skills
    const kw = keywords.filter(k => !techSkills.slice(0, 6).join(' ').toLowerCase().includes(k.toLowerCase()));
    if (kw.length > 0) {
        let q3 = kw[0];
        if (levelSuffix) q3 = `${levelSuffix} ${q3}`;
        queries.push(q3.trim());
    }

    return queries.length > 0 ? queries : ['software developer'];
}

/**
 * Search LinkedIn via guest API (no login required)
 */
async function searchLinkedIn(query, location) {
    const jobs = [];
    const q = encodeURIComponent(query);
    const loc = encodeURIComponent(location || '');

    const endpoints = [
        `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${q}&location=${loc}&start=0`,
        `https://www.linkedin.com/jobs/search?keywords=${q}&location=${loc}&position=1&pageNum=0`,
    ];

    for (const url of endpoints) {
        try {
            const resp = await fetchWithCors(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
            if (resp.status !== 200) continue;
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const cards = [...doc.querySelectorAll('li')].filter(li =>
                li.querySelector('.base-search-card__title, h3.base-search-card__title')
            );

            for (const card of cards.slice(0, 50)) {
                const titleEl = card.querySelector('.base-search-card__title, h3');
                const companyEl = card.querySelector('.base-search-card__subtitle, h4');
                const locEl = card.querySelector('.job-search-card__location, .base-search-card__metadata span');
                const linkEl = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');
                const dateEl = card.querySelector('time');

                const title = titleEl ? titleEl.textContent.trim() : '';
                const company = companyEl ? companyEl.textContent.trim() : '';
                if (!title || !company) continue;

                let href = linkEl ? linkEl.href : '';
                href = href.split('?')[0] || 'https://www.linkedin.com/jobs';

                jobs.push({
                    title,
                    company,
                    location: locEl ? locEl.textContent.trim() : location,
                    description: '',
                    url: href,
                    portal: 'LinkedIn',
                    posted_date: dateEl ? dateEl.getAttribute('datetime') || '' : '',
                });
            }
            if (jobs.length > 0) break;
        } catch (e) {
            console.warn('LinkedIn endpoint error:', e.message);
        }
    }
    return { platform: 'LinkedIn', jobs, error: jobs.length === 0 ? 'No results or blocked' : null };
}

/**
 * Search Freshersworld (covers India fresher/junior roles)
 */
async function searchFreshersworld(query, location) {
    const jobs = [];
    try {
        const slug = encodeURIComponent(query.replace(/ /g, '-'));
        for (let page = 1; page <= 2; page++) {
            const url = `https://www.freshersworld.com/jobs/jobsearch/${slug}-jobs?page=${page}`;
            const resp = await fetchWithCors(url, { signal: AbortSignal.timeout(15000) });
            if (resp.status !== 200) break;
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const cards = doc.querySelectorAll('.job-container');
            if (cards.length === 0) break;

            for (const card of cards) {
                const titleEl = card.querySelector('.wrap-title, .seo_title, .job-new-title');
                const companyEl = card.querySelector('.company-name, h3.latest-jobs-title');
                const locEl = card.querySelector('.job-location');
                const expEl = card.querySelector('.experience');
                const salEl = card.querySelector('.qualifications');

                let title = titleEl ? titleEl.textContent.trim().replace('More', '').replace('Less', '').trim() : '';
                const company = companyEl ? companyEl.textContent.trim() : '';
                if (!title || !company) continue;

                const href = card.getAttribute('job_display_url') || '';

                jobs.push({
                    title,
                    company,
                    location: locEl ? locEl.textContent.trim() : location,
                    description: '',
                    url: href || `https://www.freshersworld.com/jobs/jobsearch/${slug}-jobs`,
                    portal: 'Freshersworld',
                    experience_required: expEl ? expEl.textContent.trim() : '',
                    salary: salEl ? salEl.textContent.trim() : '',
                });
            }
            if (jobs.length >= 50) break;
        }
    } catch (e) {
        console.warn('Freshersworld error:', e.message);
    }
    return { platform: 'Naukri', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Internshala (India internships/jobs)
 */
async function searchInternshala(query, location) {
    const jobs = [];
    try {
        const slug = encodeURIComponent(query.replace(/ /g, '-'));
        for (let page = 1; page <= 2; page++) {
            const url = `https://internshala.com/jobs/keyword-${slug}/page-${page}/`;
            const resp = await fetchWithCors(url, { signal: AbortSignal.timeout(15000) });
            if (resp.status !== 200) break;
            const html = await resp.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');

            const cards = doc.querySelectorAll('.individual_internship');
            if (cards.length === 0) break;

            for (const card of cards) {
                const href = card.getAttribute('data-href') || '';
                const titleEl = card.querySelector('.job-internship-name');
                const coEl = card.querySelector('.company-name p, .company_name p');
                const locEl = card.querySelector('.locations span, .location_link');

                const title = titleEl ? titleEl.textContent.trim() : '';
                const company = coEl ? coEl.textContent.trim() : '';
                if (!title) continue;

                const fullUrl = href ? 'https://internshala.com' + href : 'https://internshala.com/jobs';

                jobs.push({
                    title,
                    company,
                    location: locEl ? locEl.textContent.trim() : location,
                    description: '',
                    url: fullUrl,
                    portal: 'Internshala',
                });
            }
            if (jobs.length >= 50) break;
        }
    } catch (e) {
        console.warn('Internshala error:', e.message);
    }
    return { platform: 'Internshala', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Shine.com (India)
 */
async function searchShine(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        const url = `https://www.shine.com/job-search/${q}-jobs${loc ? '/' + loc : ''}`;
        const resp = await fetchWithCors(url, { signal: AbortSignal.timeout(15000) });
        if (resp.status !== 200) return { platform: 'Shine', jobs: [], error: 'Blocked' };
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        for (const card of doc.querySelectorAll('.job-card, .joblist').slice(0, 50)) {
            const titleEl = card.querySelector('.job-title, h2, h3');
            const coEl = card.querySelector('.company-name, .company');
            const locEl = card.querySelector('.location, .job-location');
            const title = titleEl ? titleEl.textContent.trim() : '';
            const company = coEl ? coEl.textContent.trim() : '';
            if (!title) continue;

            const hrefEl = card.querySelector('a[href*="/job/"]');
            let href = hrefEl ? hrefEl.getAttribute('href') || '' : '';
            if (href && !href.startsWith('http')) href = 'https://www.shine.com' + href;

            jobs.push({
                title,
                company,
                location: locEl ? locEl.textContent.trim() : location,
                description: '',
                url: href || `https://www.shine.com/job-search/${q}-jobs`,
                portal: 'Shine',
            });
        }
    } catch (e) {
        console.warn('Shine error:', e.message);
    }
    return { platform: 'Shine', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Arbeitnow (free REST API — remote/international)
 */
async function searchArbeitnow(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        for (let page = 1; page <= 3; page++) {
            const url = `https://www.arbeitnow.com/api/job-board-api?search=${q}&page=${page}`;
            const resp = await fetchWithCors(url, { headers: HEADERS, signal: AbortSignal.timeout(15000) });
            if (!resp.ok) break;
            const data = await resp.json();
            const items = data.data || [];
            if (items.length === 0) break;

            for (const item of items) {
                const desc = stripHtml(item.description || '');
                jobs.push({
                    title: item.title || '',
                    company: item.company_name || '',
                    location: item.location || '',
                    description: desc.substring(0, 300),
                    url: item.url || 'https://www.arbeitnow.com',
                    portal: 'Arbeitnow',
                    job_type: item.remote ? 'Remote' : '',
                    posted_date: item.created_at || '',
                });
            }
            if (jobs.length >= 60) break;
        }
    } catch (e) {
        console.warn('Arbeitnow error:', e.message);
    }
    return { platform: 'Arbeitnow', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search RemoteOK (free JSON API — remote tech jobs)
 */
async function searchRemoteOK(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetchWithCors(`https://remoteok.com/remote-software-dev-jobs?page=1&search=${q}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { platform: 'RemoteOK', jobs: [], error: 'Blocked' };
        const data = await resp.json();

        for (const item of data.slice(0, 50)) {
            const desc = stripHtml(item.description || '');
            jobs.push({
                title: item.title || '',
                company: item.company || '',
                location: item.location || 'Remote',
                description: desc.substring(0, 300),
                url: item.url || 'https://remoteok.com',
                portal: 'RemoteOK',
                job_type: 'Remote',
                posted_date: item.published_date || '',
            });
        }
    } catch (e) {
        console.warn('RemoteOK error:', e.message);
    }
    return { platform: 'RemoteOK', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Remotive (free JSON API — remote jobs, multiple categories)
 */
async function searchRemotive(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const categories = ['software-dev', 'marketing', 'sales', 'design', 'customer-support', 'data-science', 'devops-sre'];
        for (const cat of categories) {
            const url = `https://remotive.com/api/remote-jobs?category=${cat}&search=${q}&limit=20`;
            const resp = await fetchWithCors(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
            if (!resp.ok) continue;
            const data = await resp.json();
            for (const item of (data.jobs || []).slice(0, 20)) {
                const desc = stripHtml(item.description || '');
                jobs.push({
                    title: item.title || '',
                    company: item.company_name || '',
                    location: item.candidate_required_location || 'Remote',
                    description: desc.substring(0, 300),
                    url: item.url || 'https://remotive.com',
                    portal: 'Remotive',
                    salary: item.salary || '',
                    job_type: 'Remote',
                    posted_date: item.publication_date || '',
                });
            }
            if (jobs.length >= 100) break;
        }
    } catch (e) {
        console.warn('Remotive error:', e.message);
    }
    return { platform: 'Remotive', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Himalayas (free JSON API — remote jobs)
 */
async function searchHimalayas(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetchWithCors(`https://himalayas.app/api/v1/jobs?q=${q}`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { platform: 'Himalayas', jobs: [], error: 'Blocked' };
        const data = await resp.json();

        for (const item of (data.results || []).slice(0, 50)) {
            const desc = stripHtml(item.description || '');
            jobs.push({
                title: item.title || '',
                company: item.company || '',
                location: item.locations && item.locations.length > 0 ? item.locations[0].name : 'Remote',
                description: desc.substring(0, 300),
                url: item.website || 'https://himalayas.app',
                portal: 'Himalayas',
                job_type: 'Remote',
                posted_date: item.created_at || '',
            });
        }
    } catch (e) {
        console.warn('Himalayas error:', e.message);
    }
    return { platform: 'Himalayas', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search We Work Remotely via RSS feed
 */
async function searchWeWorkRemotely(query, location) {
    const jobs = [];
    const feeds = [
        'https://weworkremotely.com/categories/remote-programming-jobs.rss',
        'https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss',
        'https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss',
    ];
    const terms = query.toLowerCase().split(' ');

    try {
        for (const feedUrl of feeds) {
            const resp = await fetchWithCors(feedUrl, { signal: AbortSignal.timeout(15000) });
            const xml = await resp.text();
            const doc = new DOMParser().parseFromString(xml, 'text/xml');

            for (const item of doc.querySelectorAll('item')) {
                const title = (item.querySelector('title')?.textContent || '').trim();
                const link = (item.querySelector('link')?.textContent || '').trim();
                const desc = stripHtml(item.querySelector('description')?.textContent || '');
                const pubDate = (item.querySelector('pubDate')?.textContent || '').trim();

                const parts = title.split(':');
                const company = parts[0].trim();
                const jobTitle = parts.length > 1 ? parts.slice(1).join(':').trim() : title;

                const text = (title + ' ' + desc).toLowerCase();
                if (terms.some(t => text.includes(t))) {
                    jobs.push({
                        title: jobTitle,
                        company,
                        location: 'Remote',
                        description: desc.substring(0, 300),
                        url: link,
                        portal: 'We Work Remotely',
                        job_type: 'Remote',
                        posted_date: pubDate,
                    });
                }
                if (jobs.length >= 100) break;
            }
            if (jobs.length >= 100) break;
        }
    } catch (e) {
        console.warn('WeWorkRemotely error:', e.message);
    }
    return { platform: 'We Work Remotely', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Indeed India (scrape)
 */
async function searchIndeed(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        const url = `https://in.indeed.com/jobs?q=${q}&l=${loc}`;
        const resp = await fetchWithCors(url, { signal: AbortSignal.timeout(15000) });
        const html = await resp.text();
        const doc = new DOMParser().parseFromString(html, 'text/html');

        for (const card of doc.querySelectorAll('div.job_seen_beacon, div[data-jk]')) {
            const titleEl = card.querySelector('a[data-testid="jobTitle-link"]') || card.querySelector('h2 a');
            const coEl = card.querySelector('span.companyName') || card.querySelector('a[data-testid="company-link"]');
            const locEl = card.querySelector('div[data-testid="text-location"]') || card.querySelector('.job-location');
            const salEl = card.querySelector('span.salary-snippet-text') || card.querySelector('.salary-snippet');

            const title = titleEl ? titleEl.textContent.trim() : '';
            const company = coEl ? coEl.textContent.trim() : '';
            if (!title) continue;

            let href = titleEl ? titleEl.getAttribute('href') || '' : '';
            if (href && !href.startsWith('http')) href = 'https://in.indeed.com' + href;

            jobs.push({
                title,
                company,
                location: locEl ? locEl.textContent.trim() : location,
                description: '',
                url: href || `https://in.indeed.com/jobs?q=${q}`,
                portal: 'Indeed',
                salary: salEl ? salEl.textContent.trim() : '',
            });
        }
    } catch (e) {
        console.warn('Indeed error:', e.message);
    }
    return { platform: 'Indeed', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Jooble (free API — requires API key, skip if missing)
 */
async function searchJooble(query, location) {
    if (!JOOBLE_API_KEY) return { platform: 'Jooble', jobs: [], error: 'No API key' };
    const jobs = [];
    try {
        const resp = await fetchWithCors(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ keywords: query, location: location }),
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { platform: 'Jooble', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.jobs || []).slice(0, 20)) {
            jobs.push({
                title: item.title || '',
                company: item.company || '',
                location: item.location || '',
                description: stripHtml(item.snippet || '').substring(0, 300),
                url: item.link || 'https://jooble.org',
                portal: 'Jooble',
                salary: item.salary || '',
                posted_date: item.updated || '',
            });
        }
    } catch (e) {
        console.warn('Jooble error:', e.message);
    }
    return { platform: 'Jooble', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search AI/ML jobs via Remotive category filter
 */
async function searchAIJobs(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetchWithCors(`https://remotive.com/api/remote-jobs?category=software-dev&search=${q}&limit=20`, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { platform: 'AI Jobs (via Remotive)', jobs: [], error: 'Blocked' };
        const data = await resp.json();
        for (const item of (data.jobs || []).slice(0, 20)) {
            const desc = stripHtml(item.description || '');
            jobs.push({
                title: item.title || '',
                company: item.company_name || '',
                location: item.candidate_required_location || 'Remote',
                description: desc.substring(0, 300),
                url: item.url || 'https://remotive.com',
                portal: 'AI Jobs (via Remotive)',
                salary: item.salary || '',
                job_type: 'Remote',
                posted_date: item.publication_date || '',
            });
        }
    } catch (e) {
        console.warn('AIJobs error:', e.message);
    }
    return { platform: 'AI Jobs (via Remotive)', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Strip HTML tags from a string
 */
function stripHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
}

/**
 * Remove duplicate jobs by title + company
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

/**
 * Main search function — calls all platforms concurrently
 * @param {Object} searchParams - { skills, keywords, location, experience_level, job_categories }
 * @returns {Promise<{ jobs: Array, platforms_searched: string[], failed_platforms: string[] }>}
 */
async function searchJobs(searchParams) {
    const skills = searchParams.skills || [];
    const keywords = searchParams.keywords || [];
    const location = searchParams.location || '';
    const experienceLevel = searchParams.experience_level || 'all';
    const categories = searchParams.job_categories || ['india'];

    const queries = buildQueries(skills, keywords, experienceLevel);
    const allJobs = [];
    const platformsSearched = [];
    const failedPlatforms = [];

    // Map categories to search functions using only CORS-friendly or public API sources
    const categoryFns = {
        india:         [searchArbeitnow, searchRemotive, searchHimalayas],
        software:      [searchArbeitnow, searchRemotive, searchHimalayas],
        ai_ml:         [searchRemotive, searchHimalayas],
        remote:        [searchArbeitnow, searchRemotive, searchHimalayas, searchWeWorkRemotely],
        international: [searchArbeitnow, searchRemotive, searchHimalayas],
        internships:   [searchRemotive, searchArbeitnow],
        freelancing:   [searchRemotive, searchWeWorkRemotely],
        startups:      [searchRemotive, searchArbeitnow],
        companies:     [searchRemotive, searchArbeitnow],
        offcampus:     [searchRemotive, searchArbeitnow],
        government:    [searchArbeitnow, searchRemotive],
    };

    // Deduplicate search functions across categories
    const called = new Set();
    const tasks = [];
    for (const cat of categories) {
        for (const fn of categoryFns[cat] || []) {
            const fnName = fn.name;
            if (!called.has(fnName)) {
                called.add(fnName);
                for (const query of queries) {
                    tasks.push(fn(query, location));
                }
            }
        }
    }

    // Run all searches concurrently
    const results = await Promise.allSettled(tasks);

    for (const result of results) {
        if (result.status === 'fulfilled') {
            const { platform, jobs, error } = result.value;
            allJobs.push(...jobs);
            if (jobs.length > 0) {
                platformsSearched.push(platform);
            } else {
                failedPlatforms.push(platform);
            }
        } else {
            console.warn('Search task failed:', result.reason);
        }
    }

    return {
        jobs: removeDuplicates(allJobs),
        platforms_searched: platformsSearched,
        failed_platforms: failedPlatforms,
    };
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchJobs, buildQueries, removeDuplicates, stripHtml };
}