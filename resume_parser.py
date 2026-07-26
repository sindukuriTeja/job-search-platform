"""Resume Parser — parses PDF, DOCX, and TXT resumes."""
import re, os, json
from pathlib import Path

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    import docx
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False

SKILLS_DB = {
    "programming_languages": [
        "python", "java", "javascript", "typescript", "c", "c++", "c#", "go", "rust",
        "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "perl", "lua",
        "haskell", "elixir", "erlang", "dart", "flutter", "bash", "shell", "powershell",
        "groovy", "objective-c", "assembly", "cobol", "fortran", "julia", "solidity",
    ],
    "frameworks_libraries": [
        "react", "angular", "vue.js", "node.js", "django", "flask", "spring boot",
        "express.js", "rails", "laravel", "fastapi", "nestjs", "next.js", "nuxt.js",
        "gatsby", "svelte", "tensorflow", "pytorch", "keras", "scikit-learn",
        "pandas", "numpy", "matplotlib", "seaborn", "plotly", "opencv",
        "bootstrap", "tailwind", "jquery", "redux", "graphql", "rest api",
        "microservices", "docker", "kubernetes", "aws", "azure", "gcp",
        "terraform", "ansible", "jenkins", "git", "github", "gitlab", "bitbucket",
        "spring", "hibernate", "mybatis", "struts", "hadoop", "spark", "kafka",
        "rabbitmq", "celery", "airflow", "dbt", "langchain", "huggingface",
    ],
    "databases": [
        "mongodb", "mysql", "postgresql", "sqlite", "oracle", "sql server", "redis",
        "elasticsearch", "cassandra", "dynamodb", "firebase", "supabase",
        "mariadb", "neo4j", "influxdb", "cockroachdb", "snowflake", "bigquery",
    ],
    "soft_skills": [
        "leadership", "communication", "teamwork", "problem solving", "critical thinking",
        "creativity", "adaptability", "time management", "project management",
        "decision making", "negotiation", "presentation skills", "analytical thinking",
    ],
    "tools_technologies": [
        "git", "docker", "kubernetes", "aws", "azure", "gcp", "linux", "unix",
        "vscode", "intellij", "pycharm", "eclipse", "visual studio",
        "postman", "jira", "confluence", "figma", "tableau", "power bi",
        "grafana", "prometheus", "kibana", "splunk", "datadog",
        "ci/cd", "devops", "agile", "scrum", "kanban",
    ],
    "domains": [
        "machine learning", "deep learning", "artificial intelligence", "data science",
        "data analysis", "data engineering", "nlp", "computer vision",
        "web development", "mobile development", "cloud computing",
        "cybersecurity", "blockchain", "iot", "full stack", "frontend", "backend",
        "api development", "system design", "distributed systems",
        "fintech", "healthcare", "e-commerce", "gaming",
    ],
}

STOP_WORDS = {
    "the", "is", "at", "which", "and", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "must", "shall", "can", "to", "of", "in", "for", "on", "with",
    "about", "against", "between", "into", "through", "during", "before", "after",
    "above", "below", "from", "up", "down", "out", "off", "over", "under", "again",
    "further", "then", "once", "here", "there", "when", "where", "why", "how", "all",
    "both", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "s", "t", "just", "don", "now",
    "also", "about", "an", "as", "but", "by", "he", "her", "his", "i", "if", "it", "me",
    "my", "myself", "or", "she", "them", "their", "theirs", "these", "they", "this",
    "those", "we", "what", "which", "who", "whom", "you", "your", "yours",
}


class ResumeParser:
    """Parses resumes in PDF, DOCX, and TXT formats to extract structured data."""

    def __init__(self):
        self.skills_database = SKILLS_DB

    def parse_resume(self, file_path: str) -> dict:
        """Parse a resume file and extract structured data."""
        ext = os.path.splitext(file_path)[1].lower()
        text = self._extract_text(file_path, ext)
        return self._extract_data(text)

    def _extract_text(self, file_path: str, ext: str) -> str:
        """Extract raw text from a resume file."""
        if ext == ".pdf":
            return self._parse_pdf(file_path)
        elif ext == ".docx":
            return self._parse_docx(file_path)
        elif ext == ".txt":
            return self._parse_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    def _parse_pdf(self, file_path: str) -> str:
        """Parse PDF resume."""
        if HAS_PYMUPDF:
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text() + "\n"
            doc.close()
            return text
        elif HAS_PDFPLUMBER:
            with pdfplumber.open(file_path) as pdf:
                return "\n".join(page.extract_text() or "" for page in pdf.pages)
        else:
            raise ImportError(
                "No PDF parsing library available. Install one:\n"
                "  pip install pymupdf        # recommended\n"
                "  pip install pdfplumber     # alternative"
            )

    def _parse_docx(self, file_path: str) -> str:
        """Parse DOCX resume."""
        if not HAS_DOCX:
            raise ImportError("python-docx not installed. Install with: pip install python-docx")
        doc = docx.Document(file_path)
        text = "\n".join([para.text for para in doc.paragraphs])
        return text

    def _parse_txt(self, file_path: str) -> str:
        """Parse TXT resume."""
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()

    def _extract_data(self, text: str) -> dict:
        """Extract structured data from resume text."""
        return {
            "name": self._extract_name(text),
            "email": self._extract_email(text),
            "phone": self._extract_phone(text),
            "location": self._extract_location(text),
            "skills": self._extract_skills(text),
            "experience": self._extract_experience(text),
            "education": self._extract_education(text),
            "projects": self._extract_projects(text),
            "certifications": self._extract_certifications(text),
            "languages": self._extract_languages(text),
            "summary": self._extract_summary(text),
            "keywords": self._extract_keywords(text),
            "experience_years": self._calculate_experience_years(text),
        }

    def _extract_name(self, text: str) -> str:
        """Extract name from the first lines of the resume."""
        lines = text.split("\n")[:5]
        for line in lines:
            trimmed = line.strip()
            if trimmed and len(trimmed) < 50 and not re.search(r"[@\d]", trimmed):
                if re.match(r"^[A-Za-z\s.'-]+$", trimmed):
                    return trimmed
        return "Unknown"

    def _extract_email(self, text: str) -> str:
        """Extract email address."""
        match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
        return match.group(0) if match else ""

    def _extract_phone(self, text: str) -> str:
        """Extract phone number."""
        match = re.search(r"\+?\d[\d\s\-().]{9,14}\d", text)
        return match.group(0).strip() if match else ""

    def _extract_location(self, text: str) -> str:
        """Extract location/city."""
        patterns = [
            r"(?:Location|Address|City|Based in)\s*[:.]?\s*([A-Za-z\s,]+)",
            r"([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)*),?\s*(?:India|USA|UK|Canada|Australia|Germany)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:60]
        return ""

    def _extract_skills(self, text: str) -> list:
        """Extract skills from the resume using the skills database."""
        text_lower = text.lower()
        found_skills = set()

        for skill in self.skills_database.values():
            for skill_name in skill:
                sl = skill_name.lower()
                if sl not in found_skills:
                    pattern = r"(?<![a-z])" + re.escape(sl) + r"(?![a-z])"
                    if re.search(pattern, text_lower):
                        found_skills.add(sl)

        return list(found_skills)

    def _extract_section(self, text: str, *section_names: str) -> str:
        """Extract a section from the resume by section heading."""
        pattern = r"(?:" + "|".join(re.escape(n) for n in section_names) + r")\s*\n([\s\S]*?)(?=\n\s*(?:Experience|Work Experience|Education|Skills|Projects|Certifications|Languages|Interests|Hobbies|References|Achievements)\s*\n|$)"
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1) if match else ""

    def _split_entries(self, section_text: str) -> list:
        """Split a section into individual entries."""
        entries = re.split(r"\n\s*\n|\n\s*[-•*]\s*|\n\s*\d+\.\s*", section_text)
        return [e.strip() for e in entries if len(e.strip()) > 15][:5]

    def _extract_experience(self, text: str) -> list:
        """Extract work experience entries."""
        return self._split_entries(self._extract_section(
            text, "Experience", "Work Experience", "Professional Experience", "Employment"
        ))

    def _extract_education(self, text: str) -> list:
        """Extract education entries."""
        return self._split_entries(self._extract_section(
            text, "Education", "Academic Background", "Qualifications"
        ))

    def _extract_projects(self, text: str) -> list:
        """Extract project entries."""
        return self._split_entries(self._extract_section(
            text, "Projects", "Personal Projects", "Key Projects", "Portfolio"
        ))

    def _extract_certifications(self, text: str) -> list:
        """Extract certification entries."""
        return self._split_entries(self._extract_section(
            text, "Certifications", "Certificates", "Licenses"
        ))

    def _extract_languages(self, text: str) -> list:
        """Extract spoken languages."""
        section = self._extract_section(text, "Languages", "Language Proficiency")
        if not section:
            return []
        languages = [p.strip() for p in re.split(r"[,\n•*]+", section) if len(p.strip()) > 3]
        return languages[:5]

    def _extract_summary(self, text: str) -> str:
        """Extract professional summary."""
        section = self._extract_section(
            text, "Summary", "Professional Summary", "Profile", "About Me", "Objective", "Career Objective"
        )
        if not section:
            return ""
        cleaned = re.sub(r"(?:Professional Summary|Summary|About Me|Profile|Career Objective|Objective)\s*[:.]?\s*", "", section, flags=re.IGNORECASE)
        return cleaned.strip()[:500] if len(cleaned.strip()) > 20 else ""

    def _extract_keywords(self, text: str) -> list:
        """Extract top keywords from the resume."""
        tokens = re.findall(r"\b[a-z]+\b", text.lower())
        filtered = [w for w in tokens if w not in STOP_WORDS and len(w) > 3]
        freq = {}
        for w in filtered:
            freq[w] = freq.get(w, 0) + 1
        return [word for word, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:20]]

    def _calculate_experience_years(self, text: str) -> int:
        """Estimate years of experience."""
        # Look for explicit mentions
        patterns = [
            r"(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)",
            r"(?:experience|exp)\s*[:\-]?\s*(\d+)\s*(?:years?|yrs?)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return int(match.group(1))

        # Fallback: count year ranges
        years = re.findall(r"\b(20\d{2}|19\d{2})\b", text)
        if len(years) >= 2:
            year_nums = [int(y) for y in years]
            span = max(year_nums) - min(year_nums)
            if 0 < span <= 40:
                return span

        return 0


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        parser = ResumeParser()
        result = parser.parse_resume(sys.argv[1])
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python resume_parser.py <resume_file>")