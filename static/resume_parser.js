/**
 * Client-side Resume Parser
 * Parses PDF, DOCX, and TXT resumes entirely in the browser
 * Uses pdf.js for PDF parsing and mammoth.js for DOCX parsing
 */

// Skills database (same as server-side)
const SKILLS_DATABASE = {
    programming_languages: [
        'python', 'java', 'javascript', 'typescript', 'c', 'c++', 'c#', 'go', 'rust',
        'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'lua',
        'haskell', 'elixir', 'erlang', 'dart', 'flutter', 'bash', 'shell', 'powershell',
        'groovy', 'objective-c', 'assembly', 'cobol', 'fortran', 'julia', 'solidity',
    ],
    frameworks_libraries: [
        'react', 'angular', 'vue.js', 'node.js', 'django', 'flask', 'spring boot',
        'express.js', 'rails', 'laravel', 'fastapi', 'nestjs', 'next.js', 'nuxt.js',
        'gatsby', 'svelte', 'tensorflow', 'pytorch', 'keras', 'scikit-learn',
        'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly', 'opencv',
        'bootstrap', 'tailwind', 'jquery', 'redux', 'graphql', 'rest api',
        'microservices', 'docker', 'kubernetes', 'aws', 'azure', 'gcp',
        'terraform', 'ansible', 'jenkins', 'git', 'github', 'gitlab', 'bitbucket',
        'spring', 'hibernate', 'mybatis', 'struts', 'hadoop', 'spark', 'kafka',
        'rabbitmq', 'celery', 'airflow', 'dbt', 'langchain', 'huggingface',
    ],
    databases: [
        'mongodb', 'mysql', 'postgresql', 'sqlite', 'oracle', 'sql server', 'redis',
        'elasticsearch', 'cassandra', 'dynamodb', 'firebase', 'supabase',
        'mariadb', 'neo4j', 'influxdb', 'cockroachdb', 'snowflake', 'bigquery',
    ],
    soft_skills: [
        'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
        'creativity', 'adaptability', 'time management', 'project management',
        'decision making', 'negotiation', 'presentation skills', 'analytical thinking',
    ],
    tools_technologies: [
        'git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'linux', 'unix',
        'vscode', 'intellij', 'pycharm', 'eclipse', 'visual studio',
        'postman', 'jira', 'confluence', 'figma', 'tableau', 'power bi',
        'grafana', 'prometheus', 'kibana', 'splunk', 'datadog',
        'ci/cd', 'devops', 'agile', 'scrum', 'kanban',
    ],
    domains: [
        'machine learning', 'deep learning', 'artificial intelligence', 'data science',
        'data analysis', 'data engineering', 'nlp', 'computer vision',
        'web development', 'mobile development', 'cloud computing',
        'cybersecurity', 'blockchain', 'iot', 'full stack', 'frontend', 'backend',
        'api development', 'system design', 'distributed systems',
        'fintech', 'healthcare', 'e-commerce', 'gaming',
    ],
};

// Stop words for keyword extraction
const STOP_WORDS = new Set([
    'the', 'is', 'at', 'which', 'and', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
    'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
    'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
    'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now',
    'also', 'about', 'with', 'from', 'for', 'by', 'in', 'on', 'at', 'to', 'and', 'or',
    'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'will', 'just', 'don', 'now', 'also',
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your',
    'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
    'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
    'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those',
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'may', 'must', 'shall',
    'can', 'ought', 'will', 'would', 'should', 'could', 'might', 'i', 'me', 'my',
    'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself',
    'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it',
    'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which',
    'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of',
    'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on',
    'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
    'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's',
    't', 'can', 'will', 'just', 'don', 'now', 'also', 'about', 'with', 'from', 'for', 'by',
    'in', 'on', 'at', 'to', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'has', 'had', 'have', 'has', 'had', 'having', 'do',
    'does', 'did', 'doing', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
    'shall', 'can', 'cannot', 'cant', 'ain', 'isn', 'aren', 'wasn', 'weren', 'hasn',
    'haven', 'hadn', 'doesn', 'don', 'didn', 'won', 'wouldn', 'couldn', 'shouldn',
    'mustn', 'shan', 'needn', 'daren', 'oughtn', 'need', 'used', 'dare', 'need', 'ought',
    'used', 'dare', 'need', 'used', 'dare', 'need', 'used', 'dare', 'need', 'used',
    'dare', 'need', 'used', 'dare', 'need', 'used', 'dare', 'need', 'used', 'dare',
    'need', 'used', 'dare', 'need', 'used', 'dare', 'need', 'used', 'dare', 'need',
    'used', 'dare', 'need', 'used', 'dare', 'need', 'used', 'dare', 'need', 'used',
]);

class ResumeParser {
    constructor() {
        this.skillsDatabase = SKILLS_DATABASE;
    }

    /**
     * Parse a resume file (PDF, DOCX, or TXT)
     * @param {File} file - The resume file
     * @returns {Promise<Object>} Parsed resume data
     */
    async parseResume(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        let text = '';

        try {
            if (ext === 'pdf') {
                text = await this._parsePDF(file);
            } else if (ext === 'docx') {
                text = await this._parseDOCX(file);
            } else if (ext === 'txt') {
                text = await this._parseTXT(file);
            } else {
                throw new Error(`Unsupported file format: .${ext}`);
            }
        } catch (err) {
            console.error('PDF parsing error:', err);
            throw new Error('Failed to parse resume. Please try a different file format.');
        }

        return {
            name: this._extractName(text),
            email: this._extractEmail(text),
            phone: this._extractPhone(text),
            location: this._extractLocation(text),
            skills: this._extractSkills(text),
            experience: this._extractExperience(text),
            education: this._extractEducation(text),
            projects: this._extractProjects(text),
            certifications: this._extractCertifications(text),
            languages: this._extractLanguages(text),
            summary: this._extractSummary(text),
            keywords: this._extractKeywords(text),
            experience_years: this._calculateExperienceYears(text),
        };
    }

    async _parsePDF(file) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text += content.items.map(item => item.str).join(' ') + '\n';
        }
        return text;
    }

    async _parseDOCX(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    }

    async _parseTXT(file) {
        return await file.text();
    }

    _extractName(text) {
        const lines = text.split('\n').slice(0, 5);
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.length < 50 && !/[@\d]/.test(trimmed) && /^[A-Za-z]/.test(trimmed)) {
                return trimmed;
            }
        }
        return 'Unknown';
    }

    _extractEmail(text) {
        const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
        return match ? match[0] : '';
    }

    _extractPhone(text) {
        const match = text.match(/\+?\d[\d\s\-().]{9,14}\d/);
        return match ? match[0].trim() : '';
    }

    _extractLocation(text) {
        const patterns = [
            /(?:Location|Address|City|Based in)\s*[:.]?\s*([A-Za-z\s,]+)/i,
            /([A-Z][a-z]+(?:[,\s]+[A-Z][a-z]+)*),?\s*(?:India|USA|UK|Canada|Australia|Germany)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1].trim().substring(0, 60);
            }
        }
        return '';
    }

    _extractSkills(text) {
        const textLower = text.toLowerCase();
        const found = new Set();
        for (const skills of Object.values(this.skillsDatabase)) {
            for (const skill of skills) {
                const sl = skill.toLowerCase();
                if (!found.has(sl) && new RegExp(`(?<![a-z])${this._escapeRegex(sl)}(?![a-z])`).test(textLower)) {
                    found.add(sl);
                }
            }
        }
        return Array.from(found);
    }

    _escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    _section(text, ...headings) {
        const pattern = `(?:${headings.map(h => this._escapeRegex(h)).join('|')})[\\s\\S]*?(?=\\n\\s*(?:experience|work experience|education|skills|projects|certifications|languages|interests|hobbies|references|achievements)\\s*\\n|$)`;
        const match = text.match(new RegExp(pattern, 'i'));
        return match ? match[0] : '';
    }

    _splitEntries(sectionText) {
        return sectionText
            .split(/\n\s*\n|\n\s*[-•*]\s*|\n\s*\d+\.\s*/)
            .map(e => e.trim())
            .filter(e => e.length > 15)
            .slice(0, 5);
    }

    _extractExperience(text) {
        return this._splitEntries(this._section(text, 'Experience', 'Work Experience', 'Professional Experience', 'Employment'));
    }

    _extractEducation(text) {
        return this._splitEntries(this._section(text, 'Education', 'Academic Background', 'Qualifications'));
    }

    _extractProjects(text) {
        return this._splitEntries(this._section(text, 'Projects', 'Personal Projects', 'Key Projects', 'Portfolio'));
    }

    _extractCertifications(text) {
        return this._splitEntries(this._section(text, 'Certifications', 'Certificates', 'Licenses'));
    }

    _extractLanguages(text) {
        const section = this._section(text, 'Languages', 'Language Proficiency');
        return section
            .split(/[,\n•*]+/)
            .map(p => p.trim())
            .filter(p => p.length > 3 && p.length < 30)
            .slice(0, 5);
    }

    _extractSummary(text) {
        const section = this._section(text, 'Summary', 'Professional Summary', 'Profile', 'About Me', 'Objective', 'Career Objective');
        const cleaned = section.replace(/(?:Professional Summary|Summary|About Me|Profile|Career Objective|Objective)\s*[:.]?\s*/gi, '');
        return cleaned.trim().length > 20 ? cleaned.trim().substring(0, 500) : '';
    }

    _extractKeywords(text) {
        const tokens = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
        const filtered = tokens.filter(w => !STOP_WORDS.has(w) && w.length > 3);
        const freq = {};
        filtered.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
        return Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([word]) => word);
    }

    _calculateExperienceYears(text) {
        const patterns = [
            /(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
            /(?:experience|exp)\s*[:\-]?\s*(\d+)\s*(?:years?|yrs?)/i,
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return parseInt(match[1], 10);
        }

        const years = text.match(/\b(20\d{2}|19\d{2})\b/g);
        if (years && years.length >= 2) {
            const yearNums = years.map(y => parseInt(y, 10));
            const span = Math.max(...yearNums) - Math.min(...yearNums);
            if (span > 0 && span <= 40) return span;
        }
        return 0;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ResumeParser;
}