/**
 * Client-side Job Matcher — Priority-Based Matching
 * 
 * Matching priority order:
 * 1. Education/Branch match (highest weight — 35%)
 * 2. Skills match (25%)
 * 3. Certifications match (15%)
 * 4. Projects match (15%)
 * 5. Keywords/Keywords overlap (10%)
 * 
 * Experience level is used for filtering, not scoring.
 */

const GENERIC_SKILLS = new Set([
    'communication', 'teamwork', 'leadership', 'problem solving',
    'critical thinking', 'time management', 'adaptability', 'creativity',
    'agile', 'scrum', 'git', 'linux', 'windows', 'macos',
]);

const MIN_SKILL_MATCH_RATIO = 0.08;
const MIN_ABSOLUTE_MATCHES = 1;

function wordMatch(skill, text) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![a-z0-9])' + escaped + '(?![a-z0-9])', 'i').test(text);
}

function normalize(str) {
    return (str || '').toLowerCase().trim();
}

/**
 * Score education match (35% weight)
 * Matches degree, branch, and institution keywords
 */
function educationScore(jobText, education) {
    if (!education || education.length === 0) return 0.2;

    const eduText = education.join(' ').toLowerCase();
    const jobLower = jobText.toLowerCase();

    // Degree keywords
    const degrees = ['bachelor', 'master', 'phd', 'bsc', 'msc', 'btech', 'mtech', 'be', 'me', 'b.e', 'm.e', 'b.tech', 'm.tech', 'bs', 'ms'];
    const degreeMatch = degrees.some(d => jobLower.includes(d) && eduText.includes(d));

    // Branch/major keywords
    const branches = {
        'computer science': ['computer science', 'cs', 'cse', 'computer engineering'],
        'information technology': ['information technology', 'it', 'iit', 'information systems'],
        'electronics': ['electronics', 'ece', 'electrical', 'eee', 'electrical engineering'],
        'mechanical': ['mechanical', 'mech', 'mechanical engineering'],
        'data science': ['data science', 'data analytics', 'data analysis', 'statistics', 'mathematics'],
        'artificial intelligence': ['artificial intelligence', 'ai', 'machine learning', 'ml', 'deep learning'],
        'software': ['software', 'software engineering', 'computer science', 'it'],
        'engineering': ['engineering', 'btech', 'mtech', 'be', 'me', 'b.e', 'm.e', 'b.tech', 'm.tech'],
        'science': ['science', 'physics', 'chemistry', 'biology', 'biotech', 'biotechnology'],
        'commerce': ['commerce', 'bcom', 'mcom', 'accounting', 'finance'],
        'management': ['management', 'mba', 'business', 'bba'],
        'design': ['design', 'graphic design', 'ui', 'ux', 'visual'],
    };

    let branchScore = 0;
    for (const [branch, keywords] of Object.entries(branches)) {
        if (jobLower.includes(branch)) {
            if (keywords.some(kw => eduText.includes(kw))) {
                branchScore = 1.0;
                break;
            }
        }
    }

    // If job mentions any degree keyword and resume has a degree
    const hasDegreeInResume = degrees.some(d => eduText.includes(d));
    const hasDegreeInJob = degrees.some(d => jobLower.includes(d));

    if (hasDegreeInJob && hasDegreeInResume) {
        return 0.7 + (branchScore * 0.3);
    }

    if (hasDegreeInResume) {
        return 0.5 + (branchScore * 0.3);
    }

    return branchScore > 0 ? 0.4 : 0.2;
}

/**
 * Score skills match (25% weight)
 */
function skillsScore(jobText, resumeSkills) {
    const technicalSkills = resumeSkills.filter(s => !GENERIC_SKILLS.has(s));
    const softSkills = resumeSkills.filter(s => GENERIC_SKILLS.has(s));

    const matchedTechnical = technicalSkills.filter(s => wordMatch(s, jobText));
    const matchedSoft = softSkills.filter(s => wordMatch(s, jobText));

    const weightedMatched = matchedTechnical.length * 3 + matchedSoft.length * 1;
    const weightedTotal = technicalSkills.length * 3 + softSkills.length * 1;

    return weightedMatched / Math.max(weightedTotal, 1);
}

/**
 * Score certifications match (15% weight)
 */
function certificationsScore(jobText, certifications) {
    if (!certifications || certifications.length === 0) return 0.3;

    const certText = certifications.join(' ').toLowerCase();
    const jobLower = jobText.toLowerCase();

    // Check if any certification keyword appears in job
    let matchedCerts = 0;
    for (const cert of certifications) {
        const certLower = cert.toLowerCase();
        // Extract key words from certification (remove year, institution, etc.)
        const certWords = certLower.split(/\s+/).filter(w => w.length > 2 && !/^\d{4}$/.test(w));
        for (const word of certWords) {
            if (jobLower.includes(word)) {
                matchedCerts++;
                break;
            }
        }
    }

    return Math.min(matchedCerts / Math.max(certifications.length, 1), 1.0);
}

/**
 * Score projects match (15% weight)
 */
function projectsScore(jobText, projects) {
    if (!projects || projects.length === 0) return 0.3;

    const projText = projects.join(' ').toLowerCase();
    const jobLower = jobText.toLowerCase();

    // Extract key skills/technologies from projects
    const projectSkills = projText.match(/\b[a-z]+\b/g) || [];
    const uniqueProjectSkills = [...new Set(projectSkills)].filter(w => w.length > 3);

    let matched = 0;
    for (const skill of uniqueProjectSkills) {
        if (GENERIC_SKILLS.has(skill)) continue;
        if (wordMatch(skill, jobLower)) matched++;
    }

    return Math.min(matched / Math.max(uniqueProjectSkills.length, 1), 1.0);
}

/**
 * Score keywords overlap (10% weight)
 */
function keywordsScore(jobText, keywords) {
    if (!keywords || keywords.length === 0) return 0.5;
    const matched = keywords.filter(k => wordMatch(k, jobText));
    return matched.length / Math.max(keywords.length, 1);
}

/**
 * Check location match — jobs should match the preferred location
 * Returns a multiplier (0.0 to 1.0) based on location relevance
 */
function locationMultiplier(jobLocation, preferredLocation) {
    if (!preferredLocation) return 1.0; // No preference set — neutral

    const jobLoc = normalize(jobLocation);
    const prefLoc = normalize(preferredLocation);

    if (!jobLoc) return 0.7; // No location in job — slight penalty

    // Exact match
    if (jobLoc === prefLoc) return 1.0;

    // Partial match — preferred location is substring of job location or vice versa
    if (jobLoc.includes(prefLoc) || prefLoc.includes(jobLoc)) return 0.9;

    // Check for common city variations
    const cityMap = {
        'bangalore': ['bangalore', 'bengaluru', 'blr'],
        'mumbai': ['mumbai', 'bombay', 'mumbai suburb', 'thane', 'navi mumbai'],
        'delhi': ['delhi', 'new delhi', 'ndelhi', 'dlf', 'gurgaon', 'gurugram', 'noida', 'faridabad'],
        'hyderabad': ['hyderabad', 'hyd', 'secunderabad'],
        'chennai': ['chennai', 'madras'],
        'pune': ['pune', 'puna'],
        'kolkata': ['kolkata', 'calcutta'],
        'ahmedabad': ['ahmedabad', 'amd'],
        'jaipur': ['jaipur', 'jp'],
        'chandigarh': ['chandigarh', 'chd'],
        'bhopal': ['bhopal', 'bh'],
        'lucknow': ['lucknow', 'lko'],
        'kozhikode': ['kozhikode', 'calicut', 'kcz'],
        'thrissur': ['thrissur', 'tsr'],
        'kochi': ['kochi', 'cochin', 'cnn'],
        'kerala': ['kerala', 'trivandrum', 'thiruvananthapuram', 'kollam', 'ernakulam'],
        'telangana': ['telangana', 'hyderabad', 'warangal', 'nizamabad'],
        'tamil nadu': ['tamil nadu', 'chennai', 'coimbatore', 'madurai', 'salem'],
        'maharashtra': ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik'],
        'karnataka': ['karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru'],
        'gujarat': ['gujarat', 'ahmedabad', 'surat', 'vadodara'],
        'rajasthan': ['rajasthan', 'jaipur', 'udaipur', 'jodhpur'],
        'up': ['up', 'uttar pradesh', 'lucknow', 'kanpur', 'varanasi'],
        'bihar': ['bihar', 'patna', 'gaya'],
        'odisha': ['odisha', 'odisha', 'bhubaneswar'],
        'assam': ['assam', 'guwahati'],
        'goa': ['goa', 'panaji'],
        'haryana': ['haryana', 'gurgaon', 'gurugram', 'noida', 'faridabad'],
        'punjab': ['punjab', 'chandigarh', 'ludhiana', 'amritsar'],
        'uttarakhand': ['uttarakhand', 'dehradun', 'nainital'],
        'jharkhand': ['jharkhand', 'ranchi'],
        'chhattisgarh': ['chhattisgarh', 'raipur'],
        'madhya pradesh': ['madhya pradesh', 'mp', 'bhopal', 'indore'],
        'andhra pradesh': ['andhra pradesh', 'ap', 'visakhapatnam', 'vizag', 'vijayawada'],
        'karnataka': ['karnataka', 'bangalore', 'bengaluru', 'mysore'],
        'west bengal': ['west bengal', 'wb', 'kolkata', 'howrah'],
    };

    for (const [canonical, variants] of Object.entries(cityMap)) {
        const jobInGroup = variants.some(v => jobLoc.includes(v));
        const prefInGroup = variants.some(v => prefLoc.includes(v));
        if (jobInGroup && prefInGroup) return 0.85;
    }

    // Remote is always acceptable
    if (jobLoc.includes('remote') || jobLoc.includes('work from home') || jobLoc.includes('wfh')) return 0.8;

    // No match — strong penalty
    return 0.15;
}

/**
 * Filter by experience level
 * Returns true if job matches the experience level
 */
function experienceFilter(jobText, experienceLevel) {
    const lower = jobText.toLowerCase();

    switch (experienceLevel) {
        case 'fresher':
            // Fresher: 0 years, "fresher", "entry level", "no experience", "0-1 years"
            return /fresher|entry.?level|no experience|0.?1 year|fresh graduate|recent graduate|campus/i.test(lower);

        case '0-1 years':
            // 0-1 years experience
            return /0.?1 year|1.?2 year|fresher|entry.?level|0.?2 year|less than 1|1.?year/i.test(lower)
                || (!/\d+\s*years?|\d+\+|\d+-\d+/.test(lower)); // No experience mentioned — could be entry

        case 'junior':
            return /1.?3 year|2.?4 year|junior|associate|0.?2 year|fresher|entry.?level/i.test(lower)
                || (/^\d+\s*years?/.test(lower) && parseInt(lower.match(/^\d+/)[0]) <= 3);

        case 'mid':
            return /3.?5 year|4.?7 year|mid.?level|mid.?senior|3.?7 year|5.?8 year/i.test(lower)
                || (/^\d+\s*years?/.test(lower) && parseInt(lower.match(/^\d+/)[0]) >= 3 && parseInt(lower.match(/^\d+/)[0]) <= 7);

        case 'senior':
            return /senior|lead|principal|staff|7\+|5\+|8\+|10\+|manager|head|director/i.test(lower)
                || (/^\d+\s*years?/.test(lower) && parseInt(lower.match(/^\d+/)[0]) >= 5);

        default:
            return true; // 'all' — no filter
    }
}

function missingSkills(jobText, resumeSkills) {
    const common = [
        'python', 'java', 'javascript', 'typescript', 'react', 'angular',
        'node.js', 'sql', 'aws', 'docker', 'kubernetes', 'machine learning',
        'data analysis', 'rest', 'api', 'microservices', 'cloud', 'devops',
        'ci/cd', 'git', 'linux', 'go', 'rust', 'c++', 'scala', 'spark',
        'tensorflow', 'pytorch', 'django', 'flask', 'spring', 'kafka',
    ];
    return common.filter(s => wordMatch(s, jobText) && !resumeSkills.includes(s.toLowerCase()));
}

function matchLevel(score) {
    if (score >= 0.75) return 'Excellent Match';
    if (score >= 0.55) return 'Good Match';
    if (score >= 0.35) return 'Fair Match';
    if (score >= 0.20) return 'Partial Match';
    return 'Low Match';
}

/**
 * Score a single job against resume data
 * @param {Object} job - Job object with title, description, location
 * @param {Object} resumeData - Parsed resume data
 * @param {string} preferredLocation - User's preferred location from form
 * @param {string} experienceLevel - User's selected experience level
 * @returns {Object|null} Scoring fields, or null if job should be filtered out
 */
function scoreJob(job, resumeData, preferredLocation, experienceLevel) {
    const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();
    const jobLocation = job.location || '';

    // Filter by experience level first
    if (!experienceFilter(jobText, experienceLevel)) {
        return null;
    }

    const resumeSkills = (resumeData.skills || []).map(s => s.toLowerCase());
    const resumeKeywords = (resumeData.keywords || []).map(k => k.toLowerCase());
    const education = resumeData.education || [];
    const certifications = resumeData.certifications || [];
    const projects = resumeData.projects || [];

    // 1. Education/Branch match (35%)
    const eduScore = educationScore(jobText, education);

    // 2. Skills match (25%)
    const skillSc = skillsScore(jobText, resumeSkills);

    // 3. Certifications match (15%)
    const certScore = certificationsScore(jobText, certifications);

    // 4. Projects match (15%)
    const projScore = projectsScore(jobText, projects);

    // 5. Keywords overlap (10%)
    const kwScore = keywordsScore(jobText, resumeKeywords);

    // Combined score
    const combined = eduScore * 0.35 + skillSc * 0.25 + certScore * 0.15 + projScore * 0.15 + kwScore * 0.10;

    // Apply location multiplier
    const locMult = locationMultiplier(jobLocation, preferredLocation);
    const finalScore = combined * locMult;

    // Hard filter: skip if skills match is too low
    const technicalSkills = resumeSkills.filter(s => !GENERIC_SKILLS.has(s));
    const matchedTechnical = technicalSkills.filter(s => wordMatch(s, jobText));
    const techRatio = matchedTechnical.length / Math.max(technicalSkills.length, 1);

    if (matchedTechnical.length < MIN_ABSOLUTE_MATCHES && techRatio < MIN_SKILL_MATCH_RATIO) {
        return null;
    }

    // Also filter out if location multiplier is too low (location mismatch)
    if (locMult < 0.3) {
        return null;
    }

    const clamped = Math.min(finalScore, 1.0);

    // Collect matched skills for display
    const matchedSkills = resumeSkills.filter(s => wordMatch(s, jobText)).slice(0, 10);
    const missing = missingSkills(jobText, resumeSkills);

    return {
        match_score: Math.round(clamped * 10000) / 10000,
        match_percentage: Math.round(clamped * 1000) / 10,
        match_level: matchLevel(clamped),
        matched_skills: matchedSkills,
        missing_skills: missing.slice(0, 5),
        location_match: locMult >= 0.85 ? 'Exact' : locMult >= 0.7 ? 'Nearby' : 'Different',
    };
}

/**
 * Match a list of jobs against resume data
 * @param {Array} jobs - Array of job objects
 * @param {Object} resumeData - Parsed resume data
 * @param {string} preferredLocation - User's preferred location
 * @param {string} experienceLevel - User's selected experience level
 * @returns {Array} Matched jobs with scoring fields
 */
function matchJobs(jobs, resumeData, preferredLocation, experienceLevel) {
    const matched = [];
    for (const job of jobs) {
        const result = scoreJob(job, resumeData, preferredLocation, experienceLevel);
        if (result === null) continue;
        matched.push({ ...job, ...result });
    }
    matched.sort((a, b) => b.match_score - a.match_score);
    return matched;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { matchJobs, scoreJob, wordMatch, experienceFilter, locationMultiplier };
}