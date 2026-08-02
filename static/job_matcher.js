/**
 * Job Matcher & Ranking Engine
 * Matches jobs against resume data and ranks by relevance.
 */

/**
 * Calculate match score between a job and resume data
 */
function calculateMatchScore(job, resumeData) {
    let score = 0;
    const matchedSkills = [];
    const missingSkills = [];

    // --- Skills Match (60% weight) ---
    const jobText = `${job.title} ${job.company} ${job.description || ''}`.toLowerCase();
    const resumeSkills = resumeData.skills || [];

    for (const skill of resumeSkills) {
        if (jobText.includes(skill.toLowerCase())) {
            matchedSkills.push(skill);
            score += 3;
        }
    }

    // Check for missing key skills from job description
    const commonJobSkills = extractCommonSkills(jobText);
    for (const skill of commonJobSkills.slice(0, 5)) {
        if (!resumeSkills.some(rs => rs.toLowerCase().includes(skill) || skill.includes(rs.toLowerCase()))) {
            missingSkills.push(skill);
        }
    }

    // --- Title Match (20% weight) ---
    const jobTitle = job.title.toLowerCase();
    for (const kw of (resumeData.keywords || [])) {
        if (jobTitle.includes(kw.toLowerCase())) {
            score += 2;
        }
    }

    // --- Experience Match (10% weight) ---
    const expLevel = resumeData.experienceLevel || 'fresher';
    const expKeywords = {
        fresher: ['fresher', 'entry', 'junior', 'intern', 'trainee', 'graduate'],
        junior: ['junior', 'entry', 'associate', '1-3', '0-3', 'fresher'],
        mid: ['mid', '3-7', '5-10', '3-5', 'senior', 'lead'],
        senior: ['senior', 'lead', 'principal', 'staff', 'architect', 'manager', '7+', '10+'],
    };

    for (const kw of (expKeywords[expLevel] || [])) {
        if (jobText.includes(kw)) {
            score += 1.5;
            break;
        }
    }

    // --- Location Match (5% weight) ---
    const resumeLocation = (resumeData.location || '').toLowerCase();
    const jobLocation = (job.location || '').toLowerCase();
    if (resumeLocation && jobLocation) {
        if (jobLocation.includes(resumeLocation) || resumeLocation.includes(jobLocation)) {
            score += 1;
        } else if (jobLocation.includes('remote') || jobLocation.includes('work from home')) {
            score += 0.5; // Remote is always a partial match
        }
    }

    // Normalize to percentage
    const maxPossibleScore = Math.max(resumeSkills.length * 3 + 5, 10);
    const matchPercentage = Math.min(Math.round((score / maxPossibleScore) * 100), 99);

    return {
        match_percentage: Math.max(matchPercentage, 10), // Minimum 10% to show something
        matched_skills: matchedSkills.slice(0, 8),
        missing_skills: missingSkills.slice(0, 3),
        raw_score: score,
    };
}

/**
 * Extract common technical skills from job description text
 */
function extractCommonSkills(text) {
    const commonSkills = [
        'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue', 'node', 'sql', 'aws', 'docker', 'kubernetes',
        'machine learning', 'ai', 'data science', 'devops', 'cloud', 'api', 'rest', 'microservices', 'git', 'agile',
        'frontend', 'backend', 'full stack', 'full-stack', 'mobile', 'ios', 'android', 'flutter', 'react native',
        'postgresql', 'mongodb', 'redis', 'elasticsearch', 'terraform', 'ci/cd', 'linux', 'graphql',
    ];

    const found = [];
    for (const skill of commonSkills) {
        if (text.includes(skill.toLowerCase()) && !found.includes(skill)) {
            found.push(skill);
        }
    }
    return found;
}

/**
 * Match multiple jobs against resume data and sort by match score
 */
function matchJobs(jobs, resumeData, preferredLocation, experienceLevel) {
    if (!jobs || jobs.length === 0) return [];

    const matched = jobs.map(job => {
        const match = calculateMatchScore(job, resumeData);
        return {
            ...job,
            ...match,
        };
    });

    // Filter out very low matches (below 15%)
    const filtered = matched.filter(job => job.match_percentage >= 15);

    // Sort by match percentage (highest first)
    return filtered.sort((a, b) => b.match_percentage - a.match_percentage);
}