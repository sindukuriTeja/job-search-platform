/**
 * Client-side Job Search Engine
 * 
 * This engine uses a hybrid approach:
 * 1. Automated search via free/public APIs (no auth required)
 * 2. Direct search links for platforms that require login
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
 * Search Arbeitnow (free REST API — no auth required)
 */
async function searchArbeitnow(query, location) {
    const jobs = [];
    try {
        const q = encodeURIComponent(query);
        const loc = encodeURIComponent(location || '');
        for (let page = 1; page <= 3; page++) {
            const url = `https://www.arbeitnow.com/api/job-board-api?search=${q}&page=${page}${loc ? `&location=${loc}` : ''}`;
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
 * Search Remotive (free JSON API — no auth required)
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
 * Search Himalayas (free JSON API — no auth required)
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
 * Search We Work Remotely via RSS feed (no auth required)
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
 * Generate direct search links for platforms that require authentication
 * @param {string} query - Search query
 * @param {string} location - Preferred location
 * @param {string} experienceLevel - Experience level
 * @param {Array} categories - Selected job categories
 * @returns {Array} Array of {name, url} objects
 */
function generateSearchLinks(query, location, experienceLevel, categories) {
    const q = encodeURIComponent(query);
    const l = encodeURIComponent(location || '');
    const links = [];

    // Map categories to platforms
    const categoryPlatforms = {
        india: [
            { name: 'Naukri', url: `https://www.naukri.com/jobs/data-science-engineer-jobs-in-${l.replace(/\s+/g, '-')}-bangalore?experience=0&k=${q}` },
            { name: 'LinkedIn', url: `https://www.linkedin.com/jobs/search?keywords=${q}&location=${l}&f_E=1&f_TPR=r604800` },
            { name: 'Indeed India', url: `https://in.indeed.com/jobs?q=${q}&l=${l}` },
            { name: 'Freshersworld', url: `https://www.freshersworld.com/jobs/jobsearch/${q.replace(/ /g, '-')}-jobs` },
            { name: 'Internshala', url: `https://internshala.com/jobs/keyword-${q.replace(/ /g, '-')}/page-1/` },
            { name: 'Shine', url: `https://www.shine.com/job-search/${q.replace(/ /g, '-')}-jobs` },
            { name: 'Foundit India', url: `https://www.monsterindia.com/jobs/${q.replace(/ /g, '-')}-jobs-in-${l.replace(/ /g, '-')}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'HirePro', url: `https://www.hirepro.in/jobs?q=${q}&location=${l}` },
        ],
        software: [
            { name: 'Wellfound (AngelList)', url: `https://wellfound.com/jobs?search=${q}&location=${l}` },
            { name: 'HackerEarth Jobs', url: `https://www.hackerearth.com/company/jobs/?q=${q}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Hirist', url: `https://www.hirist.com/jobs?q=${q}&location=${l}` },
            { name: 'Cutshort.io', url: `https://www.cutshort.io/search?query=${q}` },
            { name: 'HackerRank Jobs', url: `https://www.hackerrank.com/jobs/search?query=${q}&location=${l}` },
            { name: 'Stack Overflow Jobs', url: `https://stackoverflow.com/jobs?q=${q}&l=${l}` },
            { name: 'DevJobs', url: `https://devjobs.io/search?query=${q}&location=${l}` },
            { name: 'CodeWithJobs', url: `https://codewithjobs.io/jobs?q=${q}` },
            { name: 'RemoteOK', url: `https://remoteok.com/remote-software-dev-jobs?search=${q}` },
        ],
        ai_ml: [
            { name: 'AI Jobs', url: `https://aijobs.net/jobs?q=${q}&location=${l}` },
            { name: 'DataJobs', url: `https://datajobs.com/job-search/${q.replace(/ /g, '+')}-jobs` },
            { name: 'Kaggle Jobs', url: `https://www.kaggle.com/jobs?query=${q}&location=${l}` },
            { name: 'AI Jobs Board', url: `https://aijobsboard.com/jobs?q=${q}&location=${l}` },
            { name: 'ML Jobs', url: `https://mljobs.xyz/?q=${q}&location=${l}` },
            { name: 'AI Engineer Jobs', url: `https://www.linkedin.com/jobs/search?keywords=${q}+machine+learning&location=${l}` },
            { name: 'Deep Learning Jobs', url: `https://www.linkedin.com/jobs/search?keywords=${q}+deep+learning&location=${l}` },
            { name: 'Data Science Central', url: `https://datasciencecentral.com/jobs?query=${q}` },
        ],
        remote: [
            { name: 'Remote OK', url: `https://remoteok.com/remote-software-dev-jobs?search=${q}` },
            { name: 'We Work Remotely', url: `https://weworkremotely.com/remote-jobs?q=${q}` },
            { name: 'Remotive', url: `https://remotive.com/remote-jobs?search=${q}` },
            { name: 'Himalayas', url: `https://himalayas.app/jobs?q=${q}` },
            { name: 'FlexJobs', url: `https://www.flexjobs.com/search?query=${q}&location=${l}` },
            { name: 'Remote.co', url: `https://remote.co/remote-jobs?q=${q}` },
            { name: 'Working Nomads', url: `https://www.wnomads.com/jobs?search=${q}` },
            { name: 'Just Remote', url: `https://www.justremote.io/jobs?q=${q}` },
            { name: 'Remotely.in', url: `https://remotely.in/jobs?q=${q}` },
            { name: 'Dynamite Jobs', url: `https://dynamitejobs.com/jobs?q=${q}` },
        ],
        international: [
            { name: 'Indeed Global', url: `https://www.indeed.com/jobs?q=${q}&l=${l}` },
            { name: 'Glassdoor', url: `https://www.glassdoor.com/Job/jobs.htm?q=${q}&l=${l}` },
            { name: 'ZipRecruiter', url: `https://www.ziprecruiter.com/jobs?q=${q}&l=${l}` },
            { name: 'Monster', url: `https://www.monster.com/jobs/search/?q=${q}&where=${l}` },
            { name: 'CareerBuilder', url: `https://www.careerbuilder.com/search?query=${q}&location=${l}` },
            { name: 'Dice', url: `https://www.dice.com/jobs/search?q=${q}&l=${l}` },
            { name: 'TotalJobs', url: `https://www.totaljobs.com/job-search/${q.replace(/ /g, '-')}-jobs?location=${l}` },
            { name: 'Jobs2Careers', url: `https://www.jobs2careers.com/jobs?q=${q}&l=${l}` },
            { name: 'SimplyHired', url: `https://www.simplyhired.com/search?q=${q}&l=${l}` },
            { name: 'USAJobs', url: `https://www.usajobs.gov/Search/?query=${q}&Location=${l}` },
        ],
        internships: [
            { name: 'Internshala', url: `https://internshala.com/internships/all-internships/keyword-${q.replace(/ /g, '-')}/page-1/` },
            { name: 'LetsIntern', url: `https://www.letsintern.com/internships?q=${q}&location=${l}` },
            { name: 'Unstop (HackerEarth)', url: `https://unstop.com/search?query=${q}&location=${l}` },
            { name: 'Internship Monkey', url: `https://internshipmonkey.com/search?q=${q}&location=${l}` },
            { name: 'WayUp', url: `https://www.wayup.com/search/internships?q=${q}&location=${l}` },
            { name: 'Chegg Internships', url: `https://www.cheggindia.com/internships?q=${q}&location=${l}` },
            { name: 'Shine Internships', url: `https://www.shine.com/internships/${q.replace(/ /g, '-')}-internships` },
            { name: 'Freshersworld Internships', url: `https://www.freshersworld.com/internships/internshipsearch/${q.replace(/ /g, '-')}-internships` },
        ],
        freelancing: [
            { name: 'Upwork', url: `https://www.upwork.com/freelance-jobs/search/?q=${q}` },
            { name: 'Fiverr', url: `https://www.fiverr.com/search/gigs?q=${q}` },
            { name: 'Freelancer', url: `https://www.freelancer.com/j?q=${q}` },
            { name: 'Toptal', url: `https://www.toptal.com/freelance/${q.replace(/ /g, '-')}-jobs` },
            { name: 'Guru', url: `https://www.guru.com/jobs?q=${q}` },
            { name: 'PeoplePerHour', url: `https://www.peopleperhour.com/jobs?q=${q}` },
            { name: 'Freelance.com', url: `https://www.freelance.com/search?q=${q}` },
            { name: 'Gun.io', url: `https://gun.io/freelance-developers/jobs?q=${q}` },
            { name: 'Arc.dev', url: `https://arc.dev/search?query=${q}` },
            { name: 'Turing', url: `https://www.turing.com/freelance/jobs?q=${q}` },
        ],
        startups: [
            { name: 'Wellfound (AngelList)', url: `https://wellfound.com/jobs?search=${q}&location=${l}` },
            { name: 'Y Combinator Jobs', url: `https://www.ycombinator.com/jobs?search=${q}&location=${l}` },
            { name: 'Hired', url: `https://hired.com/software-engineers/jobs?q=${q}&location=${l}` },
            { name: 'Cutshort', url: `https://www.cutshort.io/search?query=${q}&location=${l}` },
            { name: 'Instahyre', url: `https://www.instahyre.com/search?q=${q}&location=${l}` },
            { name: 'Hiringify', url: `https://www.hiringify.com/jobs?q=${q}&location=${l}` },
            { name: 'Hirect', url: `https://www.hirect.in/search?q=${q}&location=${l}` },
            { name: 'Trakinn', url: `https://www.trakinn.com/jobs?q=${q}&location=${l}` },
            { name: 'Hirist', url: `https://www.hirist.com/jobs?q=${q}&location=${l}` },
            { name: 'HirePro', url: `https://www.hirepro.in/jobs?q=${q}&location=${l}` },
        ],
        companies: [
            { name: 'Google Careers', url: `https://careers.google.com/jobs/results/?q=${q}&location=${l}` },
            { name: 'Microsoft Careers', url: `https://careers.microsoft.com/us/en/search?query=${q}&location=${l}` },
            { name: 'Amazon Jobs', url: `https://www.amazon.jobs/en/search?q=${q}&location=${l}` },
            { name: 'Apple Careers', url: `https://jobs.apple.com/en-us/search?location=${l}&q=${q}` },
            { name: 'Meta Careers', url: `https://www.metacareers.com/jobs?query=${q}&location=${l}` },
            { name: 'Netflix Jobs', url: `https://jobs.netflix.com/jobs?search=${q}&location=${l}` },
            { name: 'Tesla Careers', url: `https://www.tesla.com/careers/search?q=${q}&location=${l}` },
            { name: 'Adobe Careers', url: `https://careers.adobe.com/us/en/search?query=${q}&location=${l}` },
            { name: 'Salesforce Jobs', url: `https://salesforce.wd1.myworkdayjobs.com/External_Career_Site/search?q=${q}&location=${l}` },
            { name: 'Oracle Careers', url: `https://www.oracle.com/careers/jobsearch/?q=${q}&location=${l}` },
            { name: 'Infosys Careers', url: `https://www.infosys.com/careers.html?q=${q}&location=${l}` },
            { name: 'TCS Careers', url: `https://www.tcs.com/careers/search?q=${q}&location=${l}` },
            { name: 'Wipro Careers', url: `https://www.wipro.com/careers/jobs?q=${q}&location=${l}` },
            { name: 'HCL Careers', url: `https://www.hcl.com/careers/jobs?q=${q}&location=${l}` },
            { name: 'Accenture Careers', url: `https://www.accenture.com/in-en/careers/search?q=${q}&location=${l}` },
            { name: 'Deloitte Careers', url: `https://www2.deloitte.com/in/en/careers.html?q=${q}&location=${l}` },
            { name: 'Cognizant Careers', url: `https://www.cognizant.com/us/en/careers/search?q=${q}&location=${l}` },
            { name: 'Capgemini Careers', url: `https://www.capgemini.com/in-en/careers/search?q=${q}&location=${l}` },
            { name: 'IBM Careers', url: `https://www.ibm.com/ca-en/careers/search?q=${q}&location=${l}` },
            { name: 'Intel Careers', url: `https://jobs.intel.com/global/en/search?q=${q}&location=${l}` },
            { name: 'Qualcomm Careers', url: `https://careers-qualcomm.icims.com/jobs/search?q=${q}&location=${l}` },
            { name: 'Samsung R&D India', url: `https://samsungsds.in/careers/jobs?q=${q}&location=${l}` },
            { name: 'Flipkart Careers', url: `https://www.flipkartcareers.com/search?q=${q}&location=${l}` },
            { name: 'Swiggy Careers', url: `https://www.swiggy.com/careers?q=${q}&location=${l}` },
            { name: 'Zomato Careers', url: `https://www.zomato.com/careers?q=${q}&location=${l}` },
            { name: 'Razorpay Careers', url: `https://razorpay.com/careers?q=${q}&location=${l}` },
            { name: 'PhonePe Careers', url: `https://www.phonepe.com/careers?q=${q}&location=${l}` },
            { name: 'Paytm Careers', url: `https://www.paytmmoney.com/careers?q=${q}&location=${l}` },
            { name: 'Ola Careers', url: `https://www.olacabs.com/careers?q=${q}&location=${l}` },
            { name: 'Uber Careers', url: `https://www.uber.com/careers/jobs/?q=${q}&location=${l}` },
            { name: 'Airbnb Careers', url: `https://careers.airbnb.com/?q=${q}&location=${l}` },
            { name: 'Netflix Careers', url: `https://jobs.netflix.com/jobs?search=${q}&location=${l}` },
            { name: 'Spotify Careers', url: `https://www.spotify.com/us/jobs/?q=${q}&location=${l}` },
            { name: 'Slack Careers', url: `https://slack.com/careers?q=${q}&location=${l}` },
            { name: 'Shopify Careers', url: `https://www.shopify.com/careers/search?q=${q}&location=${l}` },
            { name: 'Stripe Careers', url: `https://stripe.com/jobs?q=${q}&location=${l}` },
            { name: 'Twilio Careers', url: `https://www.twilio.com/careers/search?q=${q}&location=${l}` },
            { name: 'Atlassian Careers', url: `https://www.atlassian.com/company/careers?q=${q}&location=${l}` },
            { name: 'Dropbox Careers', url: `https://www.dropbox.com/jobs?q=${q}&location=${l}` },
            { name: 'Airtable Careers', url: `https://airtable.com/careers?q=${q}&location=${l}` },
            { name: 'Notion Careers', url: `https://www.notion.so/careers?q=${q}&location=${l}` },
            { name: 'Figma Careers', url: `https://www.figma.com/careers?q=${q}&location=${l}` },
            { name: 'Canva Careers', url: `https://www.canva.com/careers?q=${q}&location=${l}` },
            { name: 'Zoom Careers', url: `https://www.zoom.us/careers?q=${q}&location=${l}` },
            { name: 'Snowflake Careers', url: `https://www.snowflake.com/careers/?q=${q}&location=${l}` },
            { name: 'Databricks Careers', url: `https://www.databricks.com/careers?q=${q}&location=${l}` },
            { name: 'MongoDB Careers', url: `https://www.mongodb.com/careers/search?q=${q}&location=${l}` },
            { name: 'Elastic Careers', url: `https://www.elastic.co/about/careers?q=${q}&location=${l}` },
            { name: 'Confluent Careers', url: `https://www.confluent.io/careers/?q=${q}&location=${l}` },
            { name: 'HashiCorp Careers', url: `https://www.hashicorp.com/careers?q=${q}&location=${l}` },
            { name: 'Red Hat Careers', url: `https://www.redhat.com/en/about/careers?q=${q}&location=${l}` },
            { name: 'VMware Careers', url: `https://www.vmware.com/careers/en/search?q=${q}&location=${l}` },
            { name: 'Cisco Careers', url: `https://jobs.cisco.com/jobs/search?q=${q}&location=${l}` },
            { name: 'Juniper Networks Careers', url: `https://www.juniper.net/us/en/careers/?q=${q}&location=${l}` },
            { name: 'Arista Networks Careers', url: `https://www.arista.com/en/company/careers?q=${q}&location=${l}` },
            { name: 'Broadcom Careers', url: `https://careers.broadcom.com/global/en/search?q=${q}&location=${l}` },
            { name: 'NVIDIA Careers', url: `https://nvidia.wd1.myworkdayjobs.com/NVIDIAExternalCareerSite/search?q=${q}&location=${l}` },
            { name: 'AMD Careers', url: `https://www.amd.com/en/careers/search?q=${q}&location=${l}` },
            { name: 'Intel Careers', url: `https://jobs.intel.com/global/en/search?q=${q}&location=${l}` },
            { name: 'Qualcomm Careers', url: `https://careers-qualcomm.icims.com/jobs/search?q=${q}&location=${l}` },
            { name: 'MediaTek Careers', url: `https://www.mediatek.com/careers/search?q=${q}&location=${l}` },
            { name: 'Samsung Careers', url: `https://samsungsds.in/careers/jobs?q=${q}&location=${l}` },
            { name: 'Sony Careers', url: `https://www.sony.com/en/E/Careers/Search?q=${q}&location=${l}` },
            { name: 'Ericsson Careers', url: `https://www.ericsson.com/en/careers/search?q=${q}&location=${l}` },
            { name: 'Huawei Careers', url: `https://career.huawei.com/recrecportal/portal5/gateway.html?q=${q}&location=${l}` },
            { name: 'Siemens Careers', url: `https://www.siemens.com/global/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'Bosch Careers', url: `https://www.bosch.com/global/en/careers/jobs.html?q=${q}&location=${l}` },
            { name: 'GE Careers', url: `https://www.ge.com/careers/search?q=${q}&location=${l}` },
            { name: 'Honeywell Careers', url: `https://www.honeywell.com/us/en/careers/search?q=${q}&location=${l}` },
            { name: 'Schneider Electric Careers', url: `https://www.se.com/us/en/careers/search/?q=${q}&location=${l}` },
            { name: 'ABB Careers', url: `https://careers.abb.com/global/en/search?q=${q}&location=${l}` },
            { name: 'Rockwell Automation Careers', url: `https://www.rockwellautomation.com/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'Siemens Careers', url: `https://www.siemens.com/global/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'Philips Careers', url: `https://www.philips.com/a-w/careers/search.html?q=${q}&location=${l}` },
            { name: 'Johnson & Johnson Careers', url: `https://www.jnj.com/careers/search?q=${q}&location=${l}` },
            { name: 'Pfizer Careers', url: `https://www.pfizer.com/careers/search?q=${q}&location=${l}` },
            { name: 'Roche Careers', url: `https://www.roche.com/careers/search?q=${q}&location=${l}` },
            { name: 'Novartis Careers', url: `https://www.novartis.com/careers/search?q=${q}&location=${l}` },
            { name: 'Sanofi Careers', url: `https://www.sanofi.com/en/about-us/careers/search?q=${q}&location=${l}` },
            { name: 'GSK Careers', url: `https://www.gsk.com/en-gb/careers/search/?q=${q}&location=${l}` },
            { name: 'AstraZeneca Careers', url: `https://www.astrazeneca.com/careers/search?q=${q}&location=${l}` },
            { name: 'Merck Careers', url: `https://www.merck.com/careers/search?q=${q}&location=${l}` },
            { name: 'Bayer Careers', url: `https://www.bayer.com/careers/search?q=${q}&location=${l}` },
            { name: 'GlaxoSmithKline Careers', url: `https://www.gsk.com/en-gb/careers/search/?q=${q}&location=${l}` },
            { name: 'Eli Lilly Careers', url: `https://www.lilly.com/careers/search?q=${q}&location=${l}` },
            { name: 'AbbVie Careers', url: `https://www.abbvie.com/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'Bristol Myers Squibb Careers', url: `https://www.bms.com/careers/search.html?q=${q}&location=${l}` },
            { name: 'Amgen Careers', url: `https://www.amgen.com/careers/search?q=${q}&location=${l}` },
            { name: 'Biogen Careers', url: `https://www.biogen.com/careers/search?q=${q}&location=${l}` },
            { name: 'Gilead Sciences Careers', url: `https://www.gilead.com/careers/search?q=${q}&location=${l}` },
            { name: 'Regeneron Careers', url: `https://www.regeneron.com/careers/search?q=${q}&location=${l}` },
            { name: 'Moderna Careers', url: `https://www.modernatx.com/careers/search?q=${q}&location=${l}` },
            { name: 'BioNTech Careers', url: `https://www.biontech.com/en/careers/search?q=${q}&location=${l}` },
            { name: 'Pfizer Careers', url: `https://www.pfizer.com/careers/search?q=${q}&location=${l}` },
            { name: 'Johnson & Johnson Careers', url: `https://www.jnj.com/careers/search?q=${q}&location=${l}` },
            { name: 'Roche Careers', url: `https://www.roche.com/careers/search?q=${q}&location=${l}` },
            { name: 'Novartis Careers', url: `https://www.novartis.com/careers/search?q=${q}&location=${l}` },
            { name: 'Sanofi Careers', url: `https://www.sanofi.com/en/about-us/careers/search?q=${q}&location=${l}` },
            { name: 'GSK Careers', url: `https://www.gsk.com/en-gb/careers/search/?q=${q}&location=${l}` },
            { name: 'AstraZeneca Careers', url: `https://www.astrazeneca.com/careers/search?q=${q}&location=${l}` },
            { name: 'Merck Careers', url: `https://www.merck.com/careers/search?q=${q}&location=${l}` },
            { name: 'Bayer Careers', url: `https://www.bayer.com/careers/search?q=${q}&location=${l}` },
            { name: 'GlaxoSmithKline Careers', url: `https://www.gsk.com/en-gb/careers/search/?q=${q}&location=${l}` },
            { name: 'Eli Lilly Careers', url: `https://www.lilly.com/careers/search?q=${q}&location=${l}` },
            { name: 'AbbVie Careers', url: `https://www.abbvie.com/en/careers/search.html?q=${q}&location=${l}` },
            { name: 'Bristol Myers Squibb Careers', url: `https://www.bms.com/careers/search.html?q=${q}&location=${l}` },
            { name: 'Amgen Careers', url: `https://www.amgen.com/careers/search?q=${q}&location=${l}` },
            { name: 'Biogen Careers', url: `https://www.biogen.com/careers/search?q=${q}&location=${l}` },
            { name: 'Gilead Sciences Careers', url: `https://www.gilead.com/careers/search?q=${q}&location=${l}` },
            { name: 'Regeneron Careers', url: `https://www.regeneron.com/careers/search?q=${q}&location=${l}` },
            { name: 'Moderna Careers', url: `https://www.modernatx.com/careers/search?q=${q}&location=${l}` },
            { name: 'BioNTech Careers', url: `https://www.biontech.com/en/careers/search?q=${q}&location=${l}` },
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

    // Collect links for selected categories
    for (const cat of categories) {
        if (categoryPlatforms[cat]) {
            links.push(...categoryPlatforms[cat]);
        }
    }

    return links;
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
        ai_ml:         [searchRemotive, searchHimalayas, searchAIJobs],
        remote:        [searchArbeitnow, searchRemotive, searchHimalayas, searchWeWorkRemotely],
        international: [searchArbeitnow, searchRemotive, searchHimalayas],
        internships:   [searchRemotive, searchArbeitnow],
        freelancing:   [searchRemotive, searchWeWorkRemotely],
        startups:      [searchRemotive, searchArbeitnow],
        companies:     [searchRemotive, searchArbeitnow],
        offcampus:     [searchRemotive, searchArbeitnow],
        government:    [searchArbeitnow, searchRemotive],
        quick_apply:   [searchRemotive, searchArbeitnow],
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
    module.exports = { searchJobs, buildQueries, removeDuplicates, stripHtml, generateSearchLinks };
}