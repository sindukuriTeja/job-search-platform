/**
 * Client-side Job Matcher
 * Matches jobs with resume using skill matching and relevance scoring
 */

// Skills that are so generic they shouldn't dominate scoring
const GENERIC_SKILLS = new Set([
    'communication', 'teamwork', 'leadership', 'problem solving',
    'critical thinking', 'time management', 'adaptability', 'creativity',
    'agile', 'scrum', 'git', 'linux', 'windows', 'macos',
]);

// Minimum % of resume skills that must appear in the job to be shown
const MIN_SKILL_MATCH_RATIO = 0.10;
const MIN_ABSOLUTE_MATCHES = 1;

/**
 * True if skill appears as a whole word in text (case-insensitive)
 */
function wordMatch(skill, text) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp('(?<![a-z0-9])' + escaped + '(?![a-z0-9])', 'i').test(text);
}

/**
 * Score a single job against resume data
 * @returns {Object|null} Scoring fields, or null if job should be filtered out
 */
function scoreJob(job, resumeData) {
    const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();

    const resumeSkills = (resumeData.skills || []).map(s => s.toLowerCase());
    const resumeKeywords = (resumeData.keywords || []).map(k => k.toLowerCase());
    const expYears = resumeData.experience_years || 0;
    const education = resumeData.education || [];

    // 1. Skill matching (60% weight)
    const technicalSkills = resumeSkills.filter(s => !GENERIC_SKILLS.has(s));
    const softSkills = resumeSkills.filter(s => GENERIC_SKILLS.has(s));

    const matchedTechnical = technicalSkills.filter(s => wordMatch(s, jobText));
    const matchedSoft = softSkills.filter(s => wordMatch(s, jobText));
    const matchedAll = [...matchedTechnical, ...matchedSoft];

    // Hard filter: skip job if not enough skills match
    const totalTechnical = Math.max(technicalSkills.length, 1);
    const techRatio = matchedTechnical.length / totalTechnical;

    const titleText = (job.title || '').toLowerCase();
    const titleMatches = technicalSkills.filter(s => wordMatch(s, titleText)).length;

    if (titleMatches === 0 && matchedTechnical.length < MIN_ABSOLUTE_MATCHES && techRatio < MIN_SKILL_MATCH_RATIO) {
        return null; // Not relevant enough
    }

    // Skill score: technical matches weighted 3x, soft 1x
    const weightedMatched = matchedTechnical.length * 3 + matchedSoft.length * 1;
    const weightedTotal = technicalSkills.length * 3 + softSkills.length * 1;
    const skillScore = weightedMatched / Math.max(weightedTotal, 1);

    // 2. Title relevance bonus
    const titleScore = Math.min(titleMatches / Math.max(technicalSkills.length, 1) * 2, 1.0);

    // 3. Experience match
    const expScore = experienceScore(jobText, expYears);

    // 4. Education match
    const eduScore = educationScore(jobText, education);

    // 5. Keyword overlap
    const matchedKw = resumeKeywords.filter(k => wordMatch(k, jobText));
    const kwScore = matchedKw.length / Math.max(resumeKeywords.length, 1);

    // Final weighted score
    const final = skillScore * 0.55 + titleScore * 0.10 + expScore * 0.15 + eduScore * 0.10 + kwScore * 0.10;
    const clamped = Math.min(final, 1.0);

    // Missing skills
    const missing = missingSkills(jobText, resumeSkills);

    return {
        match_score: Math.round(clamped * 10000) / 10000,
        match_percentage: Math.round(clamped * 1000) / 10,
        match_level: matchLevel(clamped),
        matched_skills: matchedAll.slice(0, 10),
        missing_skills: missing.slice(0, 5),
    };
}

function experienceScore(jobText, expYears) {
    const rangeM = jobText.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/i);
    if (rangeM) {
        const lo = parseInt(rangeM[1], 10), hi = parseInt(rangeM[2], 10);
        if (lo <= expYears && expYears <= hi) return 1.0;
        return Math.max(0.3, 1.0 - Math.abs(expYears - lo) * 0.15);
    }

    const singleM = jobText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    if (singleM) {
        const req = parseInt(singleM[1], 10);
        if (expYears >= req) return 1.0;
        return Math.max(0.3, 1.0 - (req - expYears) * 0.15);
    }

    if (/fresher|entry.?level|no experience|0.?1 year/i.test(jobText)) {
        return expYears <= 2 ? 1.0 : 0.6;
    }
    if (/senior|lead|principal|staff/i.test(jobText)) {
        return expYears >= 5 ? 1.0 : 0.4;
    }

    return 0.7; // no requirement stated — neutral
}

function educationScore(jobText, education) {
    const degrees = ['bachelor', 'master', 'phd', 'bsc', 'msc', 'btech', 'mtech', 'b.e', 'm.e'];
    const needsDegree = degrees.some(d => jobText.includes(d));
    if (!needsDegree) return 0.8;
    if (!education || education.length === 0) return 0.4;
    const eduText = education.join(' ').toLowerCase();
    return degrees.some(d => eduText.includes(d)) ? 1.0 : 0.5;
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
 * Match a list of jobs against resume data
 * @param {Array} jobs - Array of job objects
 * @param {Object} resumeData - Parsed resume data
 * @returns {Array} Matched jobs with scoring fields
 */
function matchJobs(jobs, resumeData) {
    const matched = [];
    for (const job of jobs) {
        const result = scoreJob(job, resumeData);
        if (result === null) continue;
        matched.push({ ...job, ...result });
    }
    // Sort by match score descending
    matched.sort((a, b) => b.match_score - a.match_score);
    return matched;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { matchJobs, scoreJob, wordMatch };
}