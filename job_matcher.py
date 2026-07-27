# Job Matcher - Matches jobs with resume data using priority-based scoring
# Priority order: Education (35%) → Skills (25%) → Certifications (15%) → Projects (15%) → Keywords (10%)
import re
from typing import Dict, List, Optional


GENERIC_SKILLS = {
    "communication", "teamwork", "leadership", "problem solving",
    "critical thinking", "time management", "adaptability", "creativity",
    "agile", "scrum", "git", "linux", "windows", "macos",
}

MIN_SKILL_MATCH_RATIO = 0.08
MIN_ABSOLUTE_MATCHES = 1

# City/region variant mapping for location matching
CITY_VARIANTS = {
    "bangalore": ["bangalore", "bengaluru", "blr"],
    "mumbai": ["mumbai", "bombay", "mumbai suburb", "thane", "navi mumbai"],
    "delhi": ["delhi", "new delhi", "ndelhi", "dlf", "gurgaon", "gurugram", "noida", "faridabad"],
    "hyderabad": ["hyderabad", "hyd", "secunderabad"],
    "chennai": ["chennai", "madras"],
    "pune": ["pune", "puna"],
    "kolkata": ["kolkata", "calcutta"],
    "ahmedabad": ["ahmedabad", "amd"],
    "jaipur": ["jaipur", "jp"],
    "chandigarh": ["chandigarh", "chd"],
    "bhopal": ["bhopal", "bh"],
    "lucknow": ["lucknow", "lko"],
    "kozhikode": ["kozhikode", "calicut", "kcz"],
    "thrissur": ["thrissur", "tsr"],
    "kochi": ["kochi", "cochin", "cnn"],
    "kerala": ["kerala", "trivandrum", "thiruvananthapuram", "kollam", "ernakulam"],
    "telangana": ["telangana", "hyderabad", "warangal", "nizamabad"],
    "tamil nadu": ["tamil nadu", "chennai", "coimbatore", "madurai", "salem"],
    "maharashtra": ["maharashtra", "mumbai", "pune", "nagpur", "nashik"],
    "karnataka": ["karnataka", "bangalore", "bengaluru", "mysore", "mysuru"],
    "gujarat": ["gujarat", "ahmedabad", "surat", "vadodara"],
    "rajasthan": ["rajasthan", "jaipur", "udaipur", "jodhpur"],
    "up": ["up", "uttar pradesh", "lucknow", "kanpur", "varanasi"],
    "bihar": ["bihar", "patna", "gaya"],
    "odisha": ["odisha", "bhubaneswar"],
    "assam": ["assam", "guwahati"],
    "goa": ["goa", "panaji"],
    "haryana": ["haryana", "gurgaon", "gurugram", "noida", "faridabad"],
    "punjab": ["punjab", "chandigarh", "ludhiana", "amritsar"],
    "uttarakhand": ["uttarakhand", "dehradun", "nainital"],
    "jharkhand": ["jharkhand", "ranchi"],
    "chhattisgarh": ["chhattisgarh", "raipur"],
    "madhya pradesh": ["madhya pradesh", "mp", "bhopal", "indore"],
    "andhra pradesh": ["andhra pradesh", "ap", "visakhapatnam", "vizag", "vijayawada"],
    "west bengal": ["west bengal", "wb", "kolkata", "howrah"],
}


def normalize(text: str) -> str:
    """Normalize text for comparison."""
    return (text or "").lower().strip()


def word_match(skill: str, text: str) -> bool:
    """Check if skill appears as a whole word in text (case-insensitive)."""
    escaped = re.escape(skill)
    return bool(re.search(r"(?<![a-z0-9])" + escaped + r"(?![a-z0-9])", text, re.IGNORECASE))


def education_score(job_text: str, education: List[str]) -> float:
    """Score education match (35% weight).
    
    Matches degree type, branch/major, and institution keywords.
    """
    if not education:
        return 0.2

    edu_text = " ".join(education).lower()
    job_lower = job_text.lower()

    # Degree keywords
    degrees = [
        "bachelor", "master", "phd", "bsc", "msc", "btech", "mtech",
        "be", "me", "b.e", "m.e", "b.tech", "m.tech", "bs", "ms",
    ]
    has_degree_in_resume = any(d in edu_text for d in degrees)
    has_degree_in_job = any(d in job_lower for d in degrees)

    # Branch/major keywords
    branches = {
        "computer science": ["computer science", "cs", "cse", "computer engineering"],
        "information technology": ["information technology", "it", "iit", "information systems"],
        "electronics": ["electronics", "ece", "electrical", "eee", "electrical engineering"],
        "mechanical": ["mechanical", "mech", "mechanical engineering"],
        "data science": ["data science", "data analytics", "data analysis", "statistics", "mathematics"],
        "artificial intelligence": ["artificial intelligence", "ai", "machine learning", "ml", "deep learning"],
        "software": ["software", "software engineering", "computer science", "it"],
        "engineering": ["engineering", "btech", "mtech", "be", "me", "b.e", "m.e", "b.tech", "m.tech"],
        "science": ["science", "physics", "chemistry", "biology", "biotech", "biotechnology"],
        "commerce": ["commerce", "bcom", "mcom", "accounting", "finance"],
        "management": ["management", "mba", "business", "bba"],
        "design": ["design", "graphic design", "ui", "ux", "visual"],
    }

    branch_score = 0.0
    for branch, keywords in branches.items():
        if branch in job_lower:
            if any(kw in edu_text for kw in keywords):
                branch_score = 1.0
                break

    if has_degree_in_job and has_degree_in_resume:
        return 0.7 + (branch_score * 0.3)
    if has_degree_in_resume:
        return 0.5 + (branch_score * 0.3)
    return 0.4 if branch_score > 0 else 0.2


def skills_score(job_text: str, resume_skills: List[str]) -> float:
    """Score skills match (25% weight)."""
    technical_skills = [s for s in resume_skills if s not in GENERIC_SKILLS]
    soft_skills = [s for s in resume_skills if s in GENERIC_SKILLS]

    matched_technical = [s for s in technical_skills if word_match(s, job_text)]
    matched_soft = [s for s in soft_skills if word_match(s, job_text)]

    weighted_matched = len(matched_technical) * 3 + len(matched_soft) * 1
    weighted_total = len(technical_skills) * 3 + len(soft_skills) * 1

    return weighted_matched / max(weighted_total, 1)


def certifications_score(job_text: str, certifications: List[str]) -> float:
    """Score certifications match (15% weight)."""
    if not certifications:
        return 0.3

    job_lower = job_text.lower()
    matched_certs = 0

    for cert in certifications:
        cert_lower = cert.lower()
        # Extract key words from certification (remove year, institution, etc.)
        cert_words = [w for w in cert_lower.split() if len(w) > 2 and not re.match(r"^\d{4}$", w)]
        for word in cert_words:
            if word in job_lower:
                matched_certs += 1
                break

    return min(matched_certs / max(len(certifications), 1), 1.0)


def projects_score(job_text: str, projects: List[str]) -> float:
    """Score projects match (15% weight)."""
    if not projects:
        return 0.3

    proj_text = " ".join(projects).lower()
    job_lower = job_text.lower()

    # Extract key skills/technologies from projects
    project_skills = [w for w in re.findall(r"\b[a-z]+\b", proj_text) if len(w) > 3]
    unique_project_skills = list(set(project_skills))

    matched = 0
    for skill in unique_project_skills:
        if skill in GENERIC_SKILLS:
            continue
        if word_match(skill, job_lower):
            matched += 1

    return min(matched / max(len(unique_project_skills), 1), 1.0)


def keywords_score(job_text: str, keywords: List[str]) -> float:
    """Score keywords overlap (10% weight)."""
    if not keywords:
        return 0.5
    matched = [k for k in keywords if word_match(k, job_text)]
    return len(matched) / max(len(keywords), 1)


def location_multiplier(job_location: str, preferred_location: str) -> float:
    """Return a location multiplier (0.0 to 1.0) based on how well the job location matches the preferred location."""
    if not preferred_location:
        return 1.0  # No preference set — neutral

    job_loc = normalize(job_location)
    pref_loc = normalize(preferred_location)

    if not job_loc:
        return 0.7  # No location in job — slight penalty

    # Exact match
    if job_loc == pref_loc:
        return 1.0

    # Partial match — preferred location is substring of job location or vice versa
    if pref_loc in job_loc or job_loc in pref_loc:
        return 0.9

    # Check for common city variations
    for _canonical, variants in CITY_VARIANTS.items():
        job_in_group = any(v in job_loc for v in variants)
        pref_in_group = any(v in pref_loc for v in variants)
        if job_in_group and pref_in_group:
            return 0.85

    # Remote is always acceptable
    if any(term in job_loc for term in ("remote", "work from home", "wfh")):
        return 0.8

    # No match — strong penalty
    return 0.15


def experience_filter(job_text: str, experience_level: str) -> bool:
    """Filter job by experience level. Returns True if job matches."""
    lower = job_text.lower()

    if experience_level == "fresher":
        return bool(re.search(
            r"fresher|entry.?level|no experience|0.?1 year|fresh graduate|recent graduate|campus",
            lower,
        ))

    if experience_level == "0-1 years":
        return bool(re.search(
            r"0.?1 year|1.?2 year|fresher|entry.?level|0.?2 year|less than 1|1.?year",
            lower,
        )) or not re.search(r"\d+\s*years?|\d+\+|\d+-\d+", lower)

    if experience_level == "junior":
        return bool(re.search(
            r"1.?3 year|2.?4 year|junior|associate|0.?2 year|fresher|entry.?level",
            lower,
        )) or (re.match(r"^\d+\s*years?", lower) and int(re.match(r"^\d+", lower).group()) <= 3)

    if experience_level == "mid":
        return bool(re.search(
            r"3.?5 year|4.?7 year|mid.?level|mid.?senior|3.?7 year|5.?8 year",
            lower,
        )) or (re.match(r"^\d+\s*years?", lower) and 3 <= int(re.match(r"^\d+", lower).group()) <= 7)

    if experience_level == "senior":
        return bool(re.search(
            r"senior|lead|principal|staff|7\+|5\+|8\+|10\+|manager|head|director",
            lower,
        )) or (re.match(r"^\d+\s*years?", lower) and int(re.match(r"^\d+", lower).group()) >= 5)

    return True  # 'all' — no filter


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


def score_job(
    job: Dict,
    resume_data: Dict,
    preferred_location: str = "",
    experience_level: str = "all",
) -> Optional[Dict]:
    """Score a single job against resume data.

    Returns scoring fields dict, or None if the job should be filtered out.
    """
    job_text = f"{job.get('title', '')} {job.get('description', '')}".lower()
    job_location = job.get("location", "")

    # Filter by experience level first
    if not experience_filter(job_text, experience_level):
        return None

    resume_skills = [s.lower() for s in resume_data.get("skills", [])]
    resume_keywords = [k.lower() for k in resume_data.get("keywords", [])]
    education = resume_data.get("education", [])
    certifications = resume_data.get("certifications", [])
    projects = resume_data.get("projects", [])

    # 1. Education/Branch match (35%)
    edu_score = education_score(job_text, education)

    # 2. Skills match (25%)
    skill_sc = skills_score(job_text, resume_skills)

    # 3. Certifications match (15%)
    cert_score = certifications_score(job_text, certifications)

    # 4. Projects match (15%)
    proj_score = projects_score(job_text, projects)

    # 5. Keywords overlap (10%)
    kw_score = keywords_score(job_text, resume_keywords)

    # Combined score
    combined = (
        edu_score * 0.35
        + skill_sc * 0.25
        + cert_score * 0.15
        + proj_score * 0.15
        + kw_score * 0.10
    )

    # Apply location multiplier
    loc_mult = location_multiplier(job_location, preferred_location)
    final_score = combined * loc_mult

    # Hard filter: skip if skills match is too low
    technical_skills = [s for s in resume_skills if s not in GENERIC_SKILLS]
    matched_technical = [s for s in technical_skills if word_match(s, job_text)]
    tech_ratio = len(matched_technical) / max(len(technical_skills), 1)

    if len(matched_technical) < MIN_ABSOLUTE_MATCHES and tech_ratio < MIN_SKILL_MATCH_RATIO:
        return None

    # Also filter out if location multiplier is too low (location mismatch)
    if loc_mult < 0.3:
        return None

    clamped = min(final_score, 1.0)

    # Collect matched skills for display
    matched_skills = [s for s in resume_skills if word_match(s, job_text)][:10]
    missing = missing_skills(job_text, resume_skills)

    return {
        "match_score": round(clamped, 4),
        "match_percentage": round(clamped * 100, 1),
        "match_level": match_level(clamped),
        "matched_skills": matched_skills,
        "missing_skills": missing[:5],
        "location_match": "Exact" if loc_mult >= 0.85 else "Nearby" if loc_mult >= 0.7 else "Different",
    }


def match_jobs(
    jobs: List[Dict],
    resume_data: Dict,
    preferred_location: str = "",
    experience_level: str = "all",
) -> List[Dict]:
    """Match a list of jobs against resume data.

    Returns matched jobs sorted by match_score descending, with scoring fields
    added to each job dict.

    Args:
        jobs: List of job dicts with title, description, location, etc.
        resume_data: Parsed resume data with skills, education, certifications, projects, keywords.
        preferred_location: User's preferred location for filtering.
        experience_level: One of 'fresher', '0-1 years', 'junior', 'mid', 'senior', 'all'.
    """
    matched = []
    for job in jobs:
        result = score_job(job, resume_data, preferred_location, experience_level)
        if result is None:
            continue
        matched.append({**job, **result})
    matched.sort(key=lambda j: j["match_score"], reverse=True)
    return matched


if __name__ == "__main__":
    import json, sys
    if len(sys.argv) < 3:
        print("Usage: python job_matcher.py <jobs.json> <resume_data.json> [preferred_location] [experience_level]")
        sys.exit(1)

    with open(sys.argv[1]) as f:
        jobs = json.load(f)
    with open(sys.argv[2]) as f:
        resume = json.load(f)

    preferred_location = sys.argv[3] if len(sys.argv) > 3 else ""
    experience_level = sys.argv[4] if len(sys.argv) > 4 else "all"

    results = match_jobs(jobs, resume, preferred_location, experience_level)
    print(json.dumps(results, indent=2))