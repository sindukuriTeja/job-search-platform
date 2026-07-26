# Job Matcher - Matches jobs with resume data using skill matching and relevance scoring
import re
from typing import Dict, List, Optional


# Skills that are so generic they shouldn't dominate scoring
GENERIC_SKILLS = {
    "communication", "teamwork", "leadership", "problem solving",
    "critical thinking", "time management", "adaptability", "creativity",
    "agile", "scrum", "git", "linux", "windows", "macos",
}

# Minimum percentage of resume skills that must appear in the job to be shown
MIN_SKILL_MATCH_RATIO = 0.10
MIN_ABSOLUTE_MATCHES = 1


def word_match(skill: str, text: str) -> bool:
    """True if skill appears as a whole word in text (case-insensitive)."""
    escaped = re.escape(skill)
    return bool(re.search(r"(?<![a-z0-9])" + escaped + r"(?![a-z0-9])", text, re.IGNORECASE))


def score_job(job: Dict, resume_data: Dict) -> Optional[Dict]:
    """Score a single job against resume data.

    Returns scoring fields dict, or None if the job should be filtered out.
    """
    job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()

    resume_skills = [s.lower() for s in resume_data.get("skills", [])]
    resume_keywords = [k.lower() for k in resume_data.get("keywords", [])]
    exp_years = resume_data.get("experience_years", 0)
    education = resume_data.get("education", [])

    # 1. Skill matching (60% weight)
    technical_skills = [s for s in resume_skills if s not in GENERIC_SKILLS]
    soft_skills = [s for s in resume_skills if s in GENERIC_SKILLS]

    matched_technical = [s for s in technical_skills if word_match(s, job_text)]
    matched_soft = [s for s in soft_skills if word_match(s, job_text)]
    matched_all = matched_technical + matched_soft

    # Hard filter: skip job if not enough skills match
    total_technical = max(len(technical_skills), 1)
    tech_ratio = len(matched_technical) / total_technical

    title_text = (job.get("title", "") or "").lower()
    title_matches = sum(1 for s in technical_skills if word_match(s, title_text))

    if title_matches == 0 and len(matched_technical) < MIN_ABSOLUTE_MATCHES and tech_ratio < MIN_SKILL_MATCH_RATIO:
        return None  # Not relevant enough

    # Skill score: technical matches weighted 3x, soft 1x
    weighted_matched = len(matched_technical) * 3 + len(matched_soft) * 1
    weighted_total = len(technical_skills) * 3 + len(soft_skills) * 1
    skill_score = weighted_matched / max(weighted_total, 1)

    # 2. Title relevance bonus
    title_score = min(title_matches / max(len(technical_skills), 1) * 2, 1.0)

    # 3. Experience match
    exp_score = experience_score(job_text, exp_years)

    # 4. Education match
    edu_score = education_score(job_text, education)

    # 5. Keyword overlap
    matched_kw = [k for k in resume_keywords if word_match(k, job_text)]
    kw_score = len(matched_kw) / max(len(resume_keywords), 1)

    # Final weighted score
    final = (skill_score * 0.55 +
             title_score * 0.10 +
             exp_score * 0.15 +
             edu_score * 0.10 +
             kw_score * 0.10)
    clamped = min(final, 1.0)

    # Missing skills
    missing = missing_skills(job_text, resume_skills)

    return {
        "match_score": round(clamped, 4),
        "match_percentage": round(clamped * 100, 1),
        "match_level": match_level(clamped),
        "matched_skills": matched_all[:10],
        "missing_skills": missing[:5],
    }


def experience_score(job_text: str, exp_years: int) -> float:
    """Score how well the candidate's experience matches the job requirement."""
    # Check for range (e.g., "2-4 years")
    range_match = re.search(r"(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)", job_text, re.IGNORECASE)
    if range_match:
        lo, hi = int(range_match.group(1)), int(range_match.group(2))
        if lo <= exp_years <= hi:
            return 1.0
        return max(0.3, 1.0 - abs(exp_years - lo) * 0.15)

    # Check for single value (e.g., "3+ years")
    single_match = re.search(r"(\d+)\+?\s*(?:years?|yrs?)", job_text, re.IGNORECASE)
    if single_match:
        req = int(single_match.group(1))
        if exp_years >= req:
            return 1.0
        return max(0.3, 1.0 - (req - exp_years) * 0.15)

    # Fresher/entry-level
    if re.search(r"fresher|entry.?level|no experience|0.?1 year", job_text, re.IGNORECASE):
        return 1.0 if exp_years <= 2 else 0.6

    # Senior/lead
    if re.search(r"senior|lead|principal|staff", job_text, re.IGNORECASE):
        return 1.0 if exp_years >= 5 else 0.4

    # No explicit requirement — neutral
    return 0.7


def education_score(job_text: str, education: List[str]) -> float:
    """Score education match."""
    degrees = ["bachelor", "master", "phd", "bsc", "msc", "btech", "mtech", "b.e", "m.e"]
    needs_degree = any(d in job_text.lower() for d in degrees)
    if not needs_degree:
        return 0.8
    if not education:
        return 0.4
    edu_text = " ".join(education).lower()
    return 1.0 if any(d in edu_text for d in degrees) else 0.5


def missing_skills(job_text: str, resume_skills: List[str]) -> List[str]:
    """Find common skills mentioned in the job but missing from the resume."""
    common = [
        "python", "java", "javascript", "typescript", "react", "angular",
        "node.js", "sql", "aws", "docker", "kubernetes", "machine learning",
        "data analysis", "rest", "api", "microservices", "cloud", "devops",
        "ci/cd", "git", "linux", "go", "rust", "c++", "scala", "spark",
        "tensorflow", "pytorch", "django", "flask", "spring", "kafka",
    ]
    return [s for s in common if word_match(s, job_text) and s not in resume_skills]


def match_level(score: float) -> str:
    """Convert numeric score to human-readable level."""
    if score >= 0.75:
        return "Excellent Match"
    if score >= 0.55:
        return "Good Match"
    if score >= 0.35:
        return "Fair Match"
    if score >= 0.20:
        return "Partial Match"
    return "Low Match"


def match_jobs(jobs: List[Dict], resume_data: Dict) -> List[Dict]:
    """Match a list of jobs against resume data.

    Returns matched jobs sorted by match_score descending, with scoring fields
    added to each job dict.
    """
    matched = []
    for job in jobs:
        result = score_job(job, resume_data)
        if result is None:
            continue
        matched.append({**job, **result})
    matched.sort(key=lambda j: j["match_score"], reverse=True)
    return matched


if __name__ == "__main__":
    import json, sys
    if len(sys.argv) < 3:
        print("Usage: python job_matcher.py <jobs.json> <resume_data.json>")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        jobs = json.load(f)
    with open(sys.argv[2]) as f:
        resume = json.load(f)

    results = match_jobs(jobs, resume)
    print(json.dumps(results, indent=2))