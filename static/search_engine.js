/**
 * Client-side Job Search Engine
 * 
 * Searches multiple job platforms directly from the browser.
 * Uses CORS-friendly APIs and generates direct search links for platforms that require login.
 */

const JOOBLE_API_KEY = ''; // Set this if you have a Jooble API key

/**
 * Search Arbeitnow (free, no auth)
 */
async function searchArbeitnow(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        for (let page = 1; page <= 3; page++) {
            const url = `https://www.arbeitnow.com/api/job-board-api?search=${q}&page=${page}${loc ? `&location=${loc}` : ''}`;
            const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!resp.ok) break;
            const data = await resp.json();
            const items = data.data || [];
            if (items.length === 0) break;
            for (const item of items) {
                jobs.push({
                    title: item.title || '',
                    company: item.company_name || '',
                    location: item.location || '',
                    description: stripHtml(item.description || '').substring(0, 300),
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
 * Search Remotive (free, no auth)
 */
async function searchRemotive(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetch(`https://remotive.com/api/remote-jobs?search=${q}`, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) return { platform: 'Remotive', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.jobs || []).slice(0, 50)) {
            jobs.push({
                title: item.title || '',
                company: item.company_name || '',
                location: item.location || 'Remote',
                description: stripHtml(item.description || '').substring(0, 300),
                url: item.url || 'https://remotive.com',
                portal: 'Remotive',
                job_type: 'Remote',
                posted_date: item.published_at || '',
            });
        }
    } catch (e) {
        console.warn('Remotive error:', e.message);
    }
    return { platform: 'Remotive', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Remote OK (free, no auth)
 */
async function searchRemoteOK(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetch(`https://remoteok.com/remote-software-dev-jobs?page=1&search=${q}`, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) return { platform: 'Remote OK', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of data.slice(0, 50)) {
            jobs.push({
                title: item.title || '',
                company: item.company || '',
                location: item.location || 'Remote',
                description: stripHtml(item.description || '').substring(0, 300),
                url: item.url || 'https://remoteok.com',
                portal: 'Remote OK',
                job_type: 'Remote',
                posted_date: item.published_date || '',
            });
        }
    } catch (e) {
        console.warn('RemoteOK error:', e.message);
    }
    return { platform: 'Remote OK', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Jooble (requires API key — skip if not set)
 */
async function searchJooble(query, location) {
    if (!JOOBLE_API_KEY) return { platform: 'Jooble', jobs: [], error: 'No API key configured' };
    const jobs = [];
    try {
        const resp = await fetch(`https://jooble.org/api/${JOOBLE_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
 * Search Himalayas (free, no auth)
 */
async function searchHimalayas(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const resp = await fetch(`https://himalayas.app/api/v1/jobs?q=${q}`, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) return { platform: 'Himalayas', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.results || []).slice(0, 50)) {
            jobs.push({
                title: item.title || '',
                company: item.company || '',
                location: item.locations && item.locations.length > 0 ? item.locations[0].name : 'Remote',
                description: stripHtml(item.description || '').substring(0, 300),
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
 * Search We Work Remotely via RSS (free, no auth)
 * Uses a CORS proxy since RSS feeds don't allow cross-origin requests
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
            const resp = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
            if (!resp.ok) continue;
            const text = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/xml');
            const items = doc.querySelectorAll('item');

            for (const item of items) {
                const title = (item.querySelector('title')?.textContent || '').trim();
                const link = (item.querySelector('link')?.textContent || '').trim();
                const desc = stripHtml(item.querySelector('description')?.textContent || '');
                const pubDate = (item.querySelector('pubDate')?.textContent || '').trim();

                const parts = title.split(':');
                const company = parts[0].trim();
                const jobTitle = parts.slice(1).join(':').trim();

                if (!jobTitle) continue;
                if (!terms.some(t => jobTitle.toLowerCase().includes(t) || desc.toLowerCase().includes(t))) continue;

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
    } catch (e) {
        console.warn('WeWorkRemotely error:', e.message);
    }
    return { platform: 'We Work Remotely', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search Adzuna (free with API key)
 */
async function searchAdzuna(query, location) {
    const ADZUNA_APP_ID = ''; // Set your Adzuna API credentials
    const ADZUNA_APP_KEY = '';
    if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) return { platform: 'Adzuna', jobs: [], error: 'No API key configured' };

    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || 'India');
        const resp = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${ADZUNA_APP_ID}&app_key=${ADZUNA_APP_KEY}&what=${q}&where=${loc}&results_per_page=50`, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) return { platform: 'Adzuna', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.results || []).slice(0, 50)) {
            jobs.push({
                title: item.title || '',
                company: item.company && item.company.display ? item.company.display : '',
                location: item.location && item.location.display ? item.location.display : '',
                description: stripHtml(item.description || '').substring(0, 300),
                url: item.redirect_url || 'https://www.adzuna.com',
                portal: 'Adzuna',
                salary: item.salary_min ? `₹${item.salary_min.toLocaleString()}` : '',
                posted_date: item.created || '',
            });
        }
    } catch (e) {
        console.warn('Adzuna error:', e.message);
    }
    return { platform: 'Adzuna', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search USAJOBS (free, no auth)
 */
async function searchUSAJobs(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        const url = `https://data.usajobs.gov/search?query=${q}&pg=1&pp=50${loc ? `&location=${loc}` : ''}`;
        const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!resp.ok) return { platform: 'USAJOBS', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.Results || []).slice(0, 50)) {
            jobs.push({
                title: item.JobTitle || '',
                company: item.OrgName || 'US Government',
                location: item.Location || '',
                description: stripHtml(item.JobAbstract || '').substring(0, 300),
                url: item.URL || 'https://www.usajobs.gov',
                portal: 'USAJOBS',
                salary: item.PayRate || '',
                posted_date: item.PostingInformation && item.PostingInformation.OpenDate ? item.PostingInformation.OpenDate : '',
            });
        }
    } catch (e) {
        console.warn('USAJOBS error:', e.message);
    }
    return { platform: 'USAJOBS', jobs, error: jobs.length === 0 ? 'No results' : null };
}

/**
 * Search JSearch API (free tier: 5000 requests/month)
 */
async function searchJSearch(query, location) {
    const JOBS_API_KEY = ''; // Set your JSearch API key
    if (!JOBS_API_KEY) return { platform: 'JSearch', jobs: [], error: 'No API key configured' };

    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        const url = `https://jsearch.p.rapidapi.com/search?query=${q}&page=1&num_pages=3&date_posted=all&distance=100${loc ? `&location=${loc}` : ''}`;
        const resp = await fetch(url, {
            headers: {
                'X-RapidAPI-Key': JOBS_API_KEY,
                'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
            },
            signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) return { platform: 'JSearch', jobs: [], error: 'API error' };
        const data = await resp.json();
        for (const item of (data.data || []).slice(0, 50)) {
            jobs.push({
                title: item.job_title || '',
                company: item.employer_name || '',
                location: item.job_city || item.job_country || '',
                description: stripHtml(item.job_description || '').substring(0, 300),
                url: item.job_apply_link || 'https://www.google.com/search?q=' + encodeURIComponent(query),
                portal: 'JSearch',
                salary: item.job_min_salary || item.job_max_salary ? `$${item.job_min_salary || ''}-${item.job_max_salary || ''}` : '',
                job_type: item.job_employment_type || '',
                posted_date: item.job_posted_at_datetime_utc || '',
            });
        }
    } catch (e) {
        console.warn('JSearch error:', e.message);
    }
    return { platform: 'JSearch', jobs, error: jobs.length === 0 ? 'No results' : null };
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
 * Build search queries from skills
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

    if (techSkills.length > 0) {
        let q1 = techSkills.slice(0, 3).join(' ');
        if (levelSuffix) q1 = `${levelSuffix} ${q1}`;
        queries.push(q1.trim());
    }

    if (techSkills.length > 3) {
        let q2 = techSkills.slice(3, 6).join(' ');
        if (levelSuffix) q2 = `${levelSuffix} ${q2}`;
        queries.push(q2.trim());
    }

    const kw = keywords.filter(k => !techSkills.slice(0, 6).join(' ').toLowerCase().includes(k.toLowerCase()));
    if (kw.length > 0) {
        let q3 = kw[0];
        if (levelSuffix) q3 = `${levelSuffix} ${q3}`;
        queries.push(q3.trim());
    }

    return queries.length > 0 ? queries : ['software developer'];
}

/**
 * Generate direct search links for all platforms
 */
function generateSearchLinks(query, location, experienceLevel, categories) {
    const q = encodeURIComponent(query);
    const l = encodeURIComponent(location || '');

    const categoryPlatforms = {
        india: [
            { name: 'Naukri.com', url: `https://www.naukri.com/${q.replace(/%/g, '+')}-jobs` },
            { name: 'Indeed India', url: `https://in.indeed.com/jobs?q=${q}&l=${l}` },
            { name: 'LinkedIn Jobs', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}` },
            { name: 'Glassdoor', url: `https://www.glassdoor.com/job-listing/${q.replace(/%/g, '-')}-jobs-SRCH_KO0,${q.length}.htm` },
            { name: 'Shine.com', url: `https://www.shine.com/job-search/${q.replace(/%/g, '+')}-jobs` },
            { name: 'Monster India', url: `https://www.monsterindia.com/${q.replace(/%/g, '-')}-jobs` },
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'HirePro', url: `https://www.hirepro.in/jobs?q=${q}&location=${l}` },
            { name: 'Apna', url: `https://www.apna.com/search/jobs?q=${q}&location=${l}` },
            { name: 'Hirect', url: `https://www.hirect.in/search?q=${q}&location=${l}` },
            { name: 'Foundit India', url: `https://www.foundit.in/jobs/${q.replace(/%/g, '-')}` },
            { name: 'WorkIndia', url: `https://www.workindia.com/jobs/${q.replace(/%/g, '-')}` },
            { name: 'TimesJobs', url: `https://www.timesjobs.com/jobsearch/${q.replace(/%/g, '-')}-jobs` },
            { name: 'JobStreet India', url: `https://www.jobstreet.com.in/search/${q.replace(/%/g, '-')}/` },
            { name: 'iimjobs', url: `https://www.iimjobs.com/${q.replace(/%/g, '-')}-jobs` },
        ],
        software: [
            { name: 'Stack Overflow Jobs', url: `https://stackoverflow.com/jobs?q=${q}&location=${l}` },
            { name: 'GitHub Jobs', url: `https://github.com/jobs?q=${q}&location=${l}` },
            { name: 'Dribbble Jobs', url: `https://dribbble.com/jobs/search?q=${q}&location=${l}` },
            { name: 'Behance Jobs', url: `https://www.behance.net/jobsearch?q=${q}&l=${l}` },
            { name: 'AngelList', url: `https://angel.co/company/jobs?search=${q}&location=${l}` },
            { name: 'Y Combinator', url: `https://www.ycombinator.com/companies/jobs?search=${q}&location=${l}` },
            { name: 'Hired', url: `https://hired.com/software-engineers/jobs?q=${q}&location=${l}` },
            { name: 'Toptal', url: `https://www.toptal.com/developers/${q.replace(/%/g, '-')}` },
            { name: 'Gun.io', url: `https://gun.io/talent/${q.replace(/%/g, '-')}` },
            { name: 'A.Team', url: `https://www.awebsite.com/jobs?q=${q}&location=${l}` },
        ],
        ai_ml: [
            { name: 'AI Jobs', url: `https://aijobs.net/jobs?search=${q}&location=${l}` },
            { name: 'ML Jobs', url: `https://mljobs.com/jobs?q=${q}&location=${l}` },
            { name: 'Data Science Central', url: `https://community.datasciencecentral.com/jobs?q=${q}&location=${l}` },
            { name: 'Kaggle Jobs', url: `https://www.kaggle.com/jobs?q=${q}&location=${l}` },
            { name: 'Towards AI Jobs', url: `https://www.towardsai.net/jobs?q=${q}&location=${l}` },
            { name: 'AI Engineer Jobs', url: `https://aiengineerjobs.com/?q=${q}&location=${l}` },
        ],
        remote: [
            { name: 'Remote OK', url: `https://remoteok.com/remote-jobs?q=${q}` },
            { name: 'We Work Remotely', url: `https://weworkremotely.com/remote-jobs?q=${q}` },
            { name: 'Remotive', url: `https://remotive.com/remote-jobs?q=${q}` },
            { name: 'FlexJobs', url: `https://www.flexjobs.com/search?query=${q}&location=${l}` },
            { name: 'Working Nomads', url: `https://www.workingnomads.com/jobs?q=${q}&location=${l}` },
            { name: 'JustRemote', url: `https://www.justremote.com/jobs?q=${q}&location=${l}` },
            { name: 'Remote.co', url: `https://remote.co/remote-jobs?q=${q}&location=${l}` },
            { name: 'Dynamite Jobs', url: `https://dynamitejobs.com/search?q=${q}&location=${l}` },
            { name: 'Arc.dev', url: `https://arc.dev/developers/jobs?q=${q}&location=${l}` },
            { name: 'Himalayas', url: `https://himalayas.app/search?q=${q}&location=${l}` },
            { name: 'IsRemote', url: `https://isremote.com/jobs?q=${q}&location=${l}` },
            { name: 'Working From Home', url: `https://www.workingfromhome.net/jobs?q=${q}&location=${l}` },
        ],
        international: [
            { name: 'Indeed Global', url: `https://www.indeed.com/jobs?q=${q}&l=${l}` },
            { name: 'LinkedIn Global', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${l}` },
            { name: 'Glassdoor Global', url: `https://www.glassdoor.com/job-listing/${q.replace(/%/g, '-')}-jobs-SRCH_KO0,${q.length}.htm` },
            { name: 'Monster Global', url: `https://www.monster.com/jobs/search/?q=${q}&where=${l}` },
            { name: 'CareerBuilder', url: `https://www.careerbuilder.com/search?loc=${l}&q=${q}` },
            { name: 'Dice', url: `https://www.dice.com/jobs?q=${q}&location=${l}` },
            { name: 'SimplyHired', url: `https://www.simplyhired.com/search?hl=en&q=${q}&l=${l}` },
            { name: 'TotalJobs', url: `https://www.totaljobs.com/job-search/${q.replace(/%/g, '-')}` },
            { name: 'Reed', url: `https://www.reed.co.uk/jobs/${q.replace(/%/g, '-')}-jobs` },
            { name: 'Jobrapido', url: `https://www.jobrapido.com/en/jobsearch/${q.replace(/%/g, '-')}` },
        ],
        internships: [
            { name: 'Internshala', url: `https://internshala.com/search/internships?q=${q}&location=${l}` },
            { name: 'LetsIntern', url: `https://www.letsintern.com/internships?q=${q}&location=${l}` },
            { name: 'LinkedIn Internships', url: `https://www.linkedin.com/jobs/search/?keywords=${q}&f_E=IC` },
            { name: 'Indeed Internships', url: `https://in.indeed.com/internships?q=${q}&l=${l}` },
            { name: 'WayUp', url: `https://www.wayup.com/jobs?q=${q}&location=${l}` },
            { name: 'Handshake', url: `https://www.handshake.com/jobs?q=${q}&location=${l}` },
            { name: 'Rozna', url: `https://www.rozna.com/internships?q=${q}&location=${l}` },
            { name: 'Hirect Internships', url: `https://www.hirect.in/internships?q=${q}&location=${l}` },
        ],
        freelancing: [
            { name: 'Upwork', url: `https://www.upwork.com/freelance-jobs/search/?q=${q}&location=${l}` },
            { name: 'Fiverr', url: `https://www.fiverr.com/search/gigs?q=${q}` },
            { name: 'Freelancer.com', url: `https://www.freelancer.com/j?q=${q}&location=${l}` },
            { name: 'Toptal', url: `https://www.toptal.com/freelance/${q.replace(/%/g, '-')}` },
            { name: 'Guru', url: `https://www.guru.com/projects?q=${q}&location=${l}` },
            { name: 'PeoplePerHour', url: `https://www.peopleperhour.com/jobs?q=${q}&location=${l}` },
            { name: 'Freelance.com', url: `https://www.freelance.com/jobs?q=${q}&location=${l}` },
            { name: 'Gun.io', url: `https://gun.io/freelance/${q.replace(/%/g, '-')}` },
        ],
        startups: [
            { name: 'Wellfound (AngelList)', url: `https://wellfound.com/jobs?search=${q}&location=${l}` },
            { name: 'Y Combinator', url: `https://www.ycombinator.com/companies/jobs?search=${q}&location=${l}` },
            { name: 'Tracxn', url: `https://tracxn.com/startup-jobs?q=${q}&location=${l}` },
            { name: 'Hirist', url: `https://www.hirist.com/jobs?q=${q}&location=${l}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'Hired', url: `https://hired.com/software-engineers/jobs?q=${q}&location=${l}` },
            { name: 'Wellfound', url: `https://wellfound.com/jobs?search=${q}&location=${l}` },
        ],
        companies: [
            { name: 'Google Careers', url: `https://careers.google.com/jobs/results/?q=${q}&location=${l}` },
            { name: 'Microsoft Careers', url: `https://careers.microsoft.com/us/en/search?query=${q}&location=${l}` },
            { name: 'Amazon Jobs', url: `https://www.amazon.jobs/en/search?q=${q}&location=${l}` },
            { name: 'Apple Jobs', url: `https://jobs.apple.com/en-us/search?q=${q}&location=${l}` },
            { name: 'Meta Careers', url: `https://www.metacareers.com/jobs/?q=${q}&location=${l}` },
            { name: 'Netflix Jobs', url: `https://jobs.netflix.com/jobs?q=${q}&location=${l}` },
            { name: 'Salesforce Jobs', url: `https://salesforce.wd1.myworkdayjobs.com/External_Career_Site/search?q=${q}&location=${l}` },
            { name: 'Oracle Careers', url: `https://www.oracle.com/careers/jobsearch/?q=${q}&location=${l}` },
            { name: 'Infosys Careers', url: `https://www.infosys.com/careers.html?q=${q}&location=${l}` },
            { name: 'TCS Careers', url: `https://www.tcs.com/careers/search?q=${q}&location=${l}` },
            { name: 'Wipro Careers', url: `https://careers.wipro.com/jobs/search?q=${q}&location=${l}` },
            { name: 'HCL Careers', url: `https://www.hcltech.com/careers/search?q=${q}&location=${l}` },
            { name: 'Accenture Careers', url: `https://www.accenture.com/us-en/careers/search?q=${q}&location=${l}` },
            { name: 'Deloitte Careers', url: `https://www2.deloitte.com/us/en/careers.html?q=${q}&location=${l}` },
            { name: 'PwC Careers', url: `https://www.pwc.com/us/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'EY Careers', url: `https://home.ey.com/en_us/careers/search?q=${q}&location=${l}` },
            { name: 'KPMG Careers', url: `https://kpmg.com/us/en/home/careers/search.html?q=${q}&location=${l}` },
            { name: 'Cognizant Careers', url: `https://careers.cognizant.com/us/en/search?q=${q}&location=${l}` },
        ],
        offcampus: [
            { name: 'Unstop (HackerEarth)', url: `https://unstop.com/search?query=${q}&location=${l}` },
            { name: 'Superset', url: `https://superset.co.in/jobs?q=${q}&location=${l}` },
            { name: 'Mercer Mettl', url: `https://www.mercermettl.com/jobs?q=${q}&location=${l}` },
            { name: 'CoCubes', url: `https://www.cocubes.com/jobs?q=${q}&location=${l}` },
            { name: 'Amcat', url: `https://amcat.com/jobs?q=${q}&location=${l}` },
            { name: 'eLitmus', url: `https://www.elitmus.com/off-campus-drives?q=${q}&location=${l}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'HirePro', url: `https://www.hirepro.in/jobs?q=${q}&location=${l}` },
            { name: 'Apna', url: `https://www.apna.com/search/jobs?q=${q}&location=${l}` },
            { name: 'Hirect', url: `https://www.hirect.in/search?q=${q}&location=${l}` },
            { name: 'Hiringify', url: `https://www.hiringify.com/jobs?q=${q}&location=${l}` },
            { name: 'MyGate Jobs', url: `https://www.mygate.com/jobs?q=${q}&location=${l}` },
            { name: 'HireVue', url: `https://www.hirevue.com/jobs?q=${q}&location=${l}` },
            { name: 'Cutshort.io', url: `https://www.cutshort.io/search?query=${q}` },
            { name: 'Wellfound (AngelList)', url: `https://wellfound.com/jobs?search=${q}&location=${l}` },
            { name: 'Hired', url: `https://hired.com/software-engineers/jobs?q=${q}&location=${l}` },
            { name: 'Trakinn', url: `https://www.trakinn.com/jobs?q=${q}&location=${l}` },
            { name: 'Hirist', url: `https://www.hirist.com/jobs?q=${q}&location=${l}` },
            { name: 'Hiringify', url: `https://www.hiringify.com/jobs?q=${q}&location=${l}` },
        ],
        government: [
            { name: 'NCS (Nielit)', url: `https://ncs.nic.in/jobs?q=${q}&location=${l}` },
            { name: 'UPSC', url: `https://upsc.gov.in/examination-notice?q=${q}&location=${l}` },
            { name: 'SSC', url: `https://ssc.nic.in/jobs?q=${q}&location=${l}` },
            { name: 'Railway Jobs', url: `https://www.rrb.gov.in/jobs?q=${q}&location=${l}` },
            { name: 'Banking Jobs', url: `https://www.ibps.in/jobs?q=${q}&location=${l}` },
            { name: 'ISRO', url: `https://www.isro.gov.in/careers?q=${q}&location=${l}` },
            { name: 'DRDO', url: `https://www.drdo.gov.in/careers?q=${q}&location=${l}` },
            { name: 'GATE', url: `https://gate.iitk.ac.in/jobs?q=${q}&location=${l}` },
            { name: 'PSU Jobs', url: `https://psu.gov.in/jobs?q=${q}&location=${l}` },
            { name: 'Sarkari Naukri', url: `https://www.sarkarinaukri.com/jobs?q=${q}&location=${l}` },
            { name: 'Employment News', url: `https://employmentnews.gov.in/jobs?q=${q}&location=${l}` },
            { name: 'Sarkari Result', url: `https://www.sarkariresult.com/jobs?q=${q}&location=${l}` },
            { name: 'FreeJobAlert', url: `https://freejobalert.com/jobs?q=${q}&location=${l}` },
            { name: 'Sarkari Exam', url: `https://www.sarkariexam.com/jobs?q=${q}&location=${l}` },
            { name: 'Result India', url: `https://resultindia.net/jobs?q=${q}&location=${l}` },
        ],
        quick_apply: [
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Hiredly', url: `https://hiredly.in/search?query=${q}&location=${l}` },
            { name: 'Hirist', url: `https://www.hirist.com/jobs?q=${q}&location=${l}` },
            { name: 'HirePro', url: `https://www.hirepro.in/jobs?q=${q}&location=${l}` },
            { name: 'Apna', url: `https://www.apna.com/search/jobs?q=${q}&location=${l}` },
            { name: 'Hirect', url: `https://www.hirect.in/search?q=${q}&location=${l}` },
            { name: 'Hiringify', url: `https://www.hiringify.com/jobs?q=${q}&location=${l}` },
            { name: 'MyGate Jobs', url: `https://www.mygate.com/jobs?q=${q}&location=${l}` },
            { name: 'HireVue', url: `https://www.hirevue.com/jobs?q=${q}&location=${l}` },
        ],
    };

    const links = [];

    // Collect links for selected categories
    for (const cat of categories) {
        if (categoryPlatforms[cat]) {
            links.push(...categoryPlatforms[cat]);
        }
    }

    return links;
}

/**
 * Main search function
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
        india: [searchArbeitnow, searchRemotive, searchHimalayas],
        software: [searchArbeitnow, searchRemotive, searchHimalayas],
        ai_ml: [searchRemotive, searchHimalayas],
        remote: [searchArbeitnow, searchRemotive, searchHimalayas, searchRemoteOK],
        international: [searchArbeitnow, searchRemotive, searchHimalayas],
        internships: [searchRemotive, searchArbeitnow],
        freelancing: [searchRemotive, searchRemoteOK],
        startups: [searchRemotive, searchArbeitnow],
        companies: [searchRemotive, searchArbeitnow],
        offcampus: [searchRemotive, searchArbeitnow],
        government: [searchArbeitnow, searchRemotive],
        quick_apply: [searchRemotive, searchArbeitnow],
    };

    // Add Jooble if API key is set
    if (JOOBLE_API_KEY) {
        for (const cat of Object.keys(categoryFns)) {
            categoryFns[cat].push(searchJooble);
        }
    }

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

    // Generate direct search links for ALL platforms
    const searchLinks = generateSearchLinks(
        skills.slice(0, 3).join(' '),
        location,
        experienceLevel,
        categories
    );

    return {
        jobs: removeDuplicates(allJobs),
        platforms_searched: platformsSearched,
        failed_platforms: failedPlatforms,
        search_links: searchLinks,
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { searchJobs, generateSearchLinks, buildQueries, removeDuplicates };
}