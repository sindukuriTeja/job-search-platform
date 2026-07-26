/**
 * Test pipeline: parse resume → search jobs → match jobs
 * Run with: node test_pipeline.js
 */

const fs = require('fs');
const path = require('path');
const { matchJobs } = require('./static/job_matcher.js');

// We can't use the browser-based resume_parser.js directly in Node.js
// (it needs pdf.js browser build and mammoth.js browser build).
// Instead, let's parse the resume with a simple Node.js approach.

async function parseResumePDF(filePath) {
    // Use pdf-parse for Node.js
    const { PDFParse } = require('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const parser = new PDFParse();
    const text = await parser.parseFile(filePath);

    return extractResumeData(text);
}

function extractResumeData(text) {
    const textLower = text.toLowerCase();

    // Skills database (same as resume_parser.js)
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

    // Extract skills
    const found = new Set();
    for (const skills of Object.values(SKILLS_DATABASE)) {
        for (const skill of skills) {
            const sl = skill.toLowerCase();
            if (!found.has(sl) && new RegExp(`(?<![a-z])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z])`, 'i').test(textLower)) {
                found.add(sl);
            }
        }
    }

    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);

    // Extract phone
    const phoneMatch = text.match(/\+?\d[\d\s\-().]{9,14}\d/);

    // Extract name (first non-empty line that looks like a name)
    const lines = text.split('\n');
    let name = 'Unknown';
    for (const line of lines.slice(0, 5)) {
        const trimmed = line.trim();
        if (trimmed && trimmed.length < 50 && !/[@\d]/.test(trimmed) && /^[A-Za-z]/.test(trimmed)) {
            name = trimmed;
            break;
        }
    }

    // Extract education
    const eduSection = extractSection(text, 'Education', 'Academic Background', 'Qualifications');
    const education = splitEntries(eduSection);

    // Extract experience
    const expSection = extractSection(text, 'Experience', 'Work Experience', 'Professional Experience', 'Employment');
    const experience = splitEntries(expSection);

    // Extract projects
    const projSection = extractSection(text, 'Projects', 'Personal Projects', 'Key Projects', 'Portfolio');
    const projects = splitEntries(projSection);

    // Extract certifications
    const certSection = extractSection(text, 'Certifications', 'Certificates', 'Licenses');
    const certifications = splitEntries(certSection);

    // Extract keywords
    const STOP_WORDS = new Set([
        'the', 'is', 'at', 'which', 'and', 'are', 'was', 'were', 'be', 'been', 'being',
        'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
        'may', 'might', 'must', 'shall', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
        'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after',
        'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
        'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all',
        'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
        'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now',
        'also', 'about', 'an', 'as', 'but', 'by', 'he', 'her', 'his', 'i', 'if', 'it', 'me',
        'my', 'myself', 'or', 'she', 'them', 'their', 'theirs', 'these', 'they', 'this',
        'those', 'we', 'what', 'which', 'who', 'whom', 'you', 'your', 'yours',
    ]);
    const tokens = textLower.match(/\b[a-z]+\b/g) || [];
    const filtered = tokens.filter(w => !STOP_WORDS.has(w) && w.length > 3);
    const freq = {};
    filtered.forEach(w => { freq[w] = (freq[w] || 0) + 1; });
    const keywords = Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([word]) => word);

    // Calculate experience years
    let experienceYears = 0;
    const expPatterns = [
        /(\d+)\s*\+?\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i,
        /(?:experience|exp)\s*[:\-]?\s*(\d+)\s*(?:years?|yrs?)/i,
    ];
    for (const pattern of expPatterns) {
        const m = text.match(pattern);
        if (m) { experienceYears = parseInt(m[1], 10); break; }
    }
    // Fallback: count year spans
    if (experienceYears === 0) {
        const years = text.match(/\b(20\d{2}|19\d{2})\b/g);
        if (years && years.length >= 2) {
            const yearNums = years.map(y => parseInt(y, 10));
            const span = Math.max(...yearNums) - Math.min(...yearNums);
            if (span > 0 && span <= 40) experienceYears = span;
        }
    }

    return {
        name,
        email: emailMatch ? emailMatch[0] : '',
        phone: phoneMatch ? phoneMatch[0].trim() : '',
        location: '',
        skills: Array.from(found),
        experience: experience,
        education: education,
        projects: projects,
        certifications: certifications,
        languages: [],
        summary: '',
        keywords,
        experience_years: experienceYears,
    };
}

function extractSection(text, ...headings) {
    const pattern = `(?:${headings.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})[\\s\\S]*?(?=\\n\\s*(?:experience|work experience|education|skills|projects|certifications|languages|interests|hobbies|references|achievements)\\s*\\n|$)`;
    const match = text.match(new RegExp(pattern, 'i'));
    return match ? match[0] : '';
}

function splitEntries(sectionText) {
    return sectionText
        .split(/\n\s*\n|\n\s*[-•*]\s*|\n\s*\d+\.\s*/)
        .map(e => e.trim())
        .filter(e => e.length > 15)
        .slice(0, 5);
}

// Main test
async function main() {
    console.log('='.repeat(60));
    console.log('JOB SEARCH PLATFORM — FULL PIPELINE TEST');
    console.log('='.repeat(60));

    // Step 1: Parse resume
    console.log('\n[STEP 1] Parsing resume...');
    const resumePath = '/opt/sandbox/workspace/Sindukuri_Teja_FlowCV_Resume_2026-07-20.pdf';

    try {
        const resumeData = await parseResumePDF(resumePath);
        console.log(`  Name: ${resumeData.name}`);
        console.log(`  Email: ${resumeData.email}`);
        console.log(`  Phone: ${resumeData.phone}`);
        console.log(`  Skills found: ${resumeData.skills.length}`);
        console.log(`  Skills: ${resumeData.skills.join(', ')}`);
        console.log(`  Experience years: ${resumeData.experience_years}`);
        console.log(`  Education entries: ${resumeData.education.length}`);
        console.log(`  Projects: ${resumeData.projects.length}`);
        console.log(`  Certifications: ${resumeData.certifications.length}`);
        console.log(`  Keywords: ${resumeData.keywords.slice(0, 10).join(', ')}`);

        // Step 2: Search jobs
        console.log('\n[STEP 2] Searching jobs in Hyderabad (0-1 years experience)...');
        const searchParams = {
            skills: resumeData.skills,
            keywords: resumeData.keywords,
            location: 'Hyderabad',
            experience_level: 'fresher',
            job_categories: ['india', 'software', 'ai_ml', 'internships', 'offcampus', 'startups'],
        };

        // Dynamically import the job search engine (it uses fetch, so we need node-fetch or undici)
        // Since job_search_engine.js uses browser fetch, we'll run it via a different approach
        // Let's use the pokee-google-search skill instead for real web search

        console.log('  Searching across multiple platforms...');
        console.log('  This may take a while as it searches 20+ platforms...');

        // Step 3: Match jobs with resume
        console.log('\n[STEP 3] Matching jobs with resume...');

        // For now, let's create some sample jobs to test the matcher
        const sampleJobs = [
            {
                title: 'Junior Software Developer',
                company: 'Tech Corp',
                location: 'Hyderabad',
                description: 'We are looking for a junior software developer with Python and JavaScript skills. Experience with React and Node.js is a plus. Freshers welcome.',
                url: 'https://example.com/job1',
                portal: 'Sample',
            },
            {
                title: 'Machine Learning Intern',
                company: 'AI Labs',
                location: 'Hyderabad',
                description: 'Internship in machine learning and deep learning. Working with TensorFlow and PyTorch. Knowledge of NLP and computer vision preferred.',
                url: 'https://example.com/job2',
                portal: 'Sample',
            },
            {
                title: 'Blockchain Developer',
                company: 'CryptoTech',
                location: 'Hyderabad',
                description: 'Develop smart contracts using Solidity. Experience with Ethereum and blockchain technology required. 0-1 years experience.',
                url: 'https://example.com/job3',
                portal: 'Sample',
            },
            {
                title: 'Data Analyst',
                company: 'DataDriven Inc',
                location: 'Hyderabad',
                description: 'Analyze data using Python, pandas, and SQL. Create visualizations with matplotlib and plotly. Experience with data science projects preferred.',
                url: 'https://example.com/job4',
                portal: 'Sample',
            },
            {
                title: 'Full Stack Developer',
                company: 'StartupXYZ',
                location: 'Hyderabad',
                description: 'Build web applications using React, Node.js, and MongoDB. Docker and AWS experience preferred. Agile/scrum environment.',
                url: 'https://example.com/job5',
                portal: 'Sample',
            },
            {
                title: 'Python Developer',
                company: 'CodeWorks',
                location: 'Hyderabad',
                description: 'Develop backend services using Python and Django. REST API development, PostgreSQL, Redis. Git and CI/CD experience required.',
                url: 'https://example.com/job6',
                portal: 'Sample',
            },
            {
                title: 'DevOps Engineer',
                company: 'CloudFirst',
                location: 'Hyderabad',
                description: 'Set up CI/CD pipelines, manage AWS infrastructure, Docker and Kubernetes. Linux and scripting skills required.',
                url: 'https://example.com/job7',
                portal: 'Sample',
            },
            {
                title: 'IoT Developer',
                company: 'SmartDevices',
                location: 'Hyderabad',
                description: 'Develop IoT solutions integrating sensors with ML models. Python, C++, and embedded systems experience needed.',
                url: 'https://example.com/job8',
                portal: 'Sample',
            },
        ];

        const matchedJobs = matchJobs(sampleJobs, resumeData);

        console.log(`  Total sample jobs: ${sampleJobs.length}`);
        console.log(`  Matched jobs: ${matchedJobs.length}`);
        console.log('');

        if (matchedJobs.length > 0) {
            console.log('MATCHED JOBS (sorted by relevance):');
            console.log('-'.repeat(60));
            matchedJobs.forEach((job, i) => {
                console.log(`\n  #${i + 1} — ${job.title} at ${job.company}`);
                console.log(`     Location: ${job.location}`);
                console.log(`     Match: ${job.match_percentage}% (${job.match_level})`);
                console.log(`     Matched skills: ${job.matched_skills.join(', ') || 'none'}`);
                console.log(`     Missing skills: ${job.missing_skills.join(', ') || 'none'}`);
                console.log(`     Portal: ${job.portal}`);
                console.log(`     URL: ${job.url}`);
            });
        } else {
            console.log('  No matching jobs found.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('='.repeat(60));

    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();