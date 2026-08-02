/**
 * Client-side Resume Parser
 * Extracts skills, keywords, experience, education, and contact info from PDF, DOCX, and TXT resumes.
 */

/**
 * Parse a resume file and return structured data
 */
async function parseResume(file) {
    let text = '';
    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'pdf') {
        text = await parsePDF(file);
    } else if (ext === 'docx') {
        text = await parseDOCX(file);
    } else if (ext === 'txt') {
        text = await file.text();
    } else {
        throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
    }

    return extractResumeData(text);
}

/**
 * Parse PDF using pdf.js
 */
async function parsePDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }

    return fullText;
}

/**
 * Parse DOCX using mammoth.js
 */
async function parseDOCX(file) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
}

/**
 * Extract structured data from raw resume text
 */
function extractResumeData(text) {
    const lowerText = text.toLowerCase();
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    // --- Extract Name (first line that looks like a name) ---
    let name = '';
    for (const line of lines.slice(0, 5)) {
        if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) && line.length < 50) {
            name = line;
            break;
        }
    }

    // --- Extract Email ---
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const email = emailMatch ? emailMatch[0] : '';

    // --- Extract Phone ---
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : '';

    // --- Extract Location ---
    const locationPatterns = [
        /(?:location|based in|city|address)[:\s]*([A-Za-z\s,]+(?:India|USA|Bangalore|Mumbai|Delhi|Hyderabad|Chennai|Pune|Kolkata|Noida|Gurgaon|Remote))/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*(?:IN|US|India|USA))/,
    ];
    let location = '';
    for (const pattern of locationPatterns) {
        const match = text.match(pattern);
        if (match) {
            location = match[1].trim();
            break;
        }
    }

    // --- Extract Skills ---
    const allTechSkills = [
        // Programming Languages
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'c', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'scala', 'r', 'perl', 'dart', 'flutter', 'racket', 'lua',
        // Web Frameworks
        'react', 'react.js', 'angular', 'vue', 'vue.js', 'next.js', 'nextjs', 'nuxt.js', 'svelte', 'django', 'flask', 'node.js', 'nodejs', 'express', 'express.js', 'spring boot', 'spring', 'laravel', 'rails', 'ruby on rails', 'fastapi', 'asp.net', '.net', 'dotnet', 'nest.js', 'nestjs',
        // Databases
        'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'mongo', 'redis', 'cassandra', 'dynamodb', 'sqlite', 'oracle', 'mariadb', 'neo4j', 'elasticsearch', 'firebase', 'supabase',
        // Cloud & DevOps
        'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'cicd', 'devops', 'cloudformation', 'lambda', 'ec2', 's3', 'cloudflare', 'vercel', 'netlify', 'heroku', 'digitalocean',
        // Data Science & AI/ML
        'machine learning', 'deep learning', 'nlp', 'natural language processing', 'computer vision', 'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'pandas', 'numpy', 'matplotlib', 'seaborn', 'opencv', 'hugging face', 'huggingface', 'transformers', 'llm', 'large language model', 'ai', 'artificial intelligence', 'data science', 'data analysis', 'data engineering', 'big data', 'spark', 'hadoop', 'tableau', 'power bi',
        // Mobile Development
        'react native', 'flutter', 'swift', 'kotlin', 'ionic', 'cordova', 'xamarin', 'mobile development', 'ios', 'android',
        // Frontend
        'html', 'css', 'sass', 'scss', 'tailwind', 'tailwindcss', 'bootstrap', 'material ui', 'mui', 'webpack', 'vite', 'parcel', 'sass', 'less', 'javascript', 'typescript', 'jquery', 'ajax', 'rest api', 'rest', 'graphql', 'api', 'grpc',
        // Testing
        'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'testing', 'unit testing', 'integration testing', 'tdd', 'bdd',
        // Other
        'git', 'github', 'gitlab', 'bitbucket', 'agile', 'scrum', 'kanban', 'jira', 'linux', 'unix', 'bash', 'shell', 'microservices', 'restful', 'soap', 'websocket', 'socket.io', 'mqtt', 'kafka', 'rabbitmq', 'elasticsearch', 'logstash', 'kibana', 'prometheus', 'grafana', 'nginx', 'apache', 'http', 'https', 'tcp/ip', 'dns', 'oauth', 'jwt', 'authentication', 'authorization', 'security', 'cryptography', 'blockchain', 'web3', 'solidity', 'ethereum', 'smart contracts', 'nft', 'defi',
    ];

    const foundSkills = [];
    for (const skill of allTechSkills) {
        const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lowerText) && !foundSkills.includes(skill)) {
            foundSkills.push(skill);
        }
    }

    // --- Extract Keywords (important terms beyond skills) ---
    const keywords = [];
    const keywordList = [
        'full stack', 'frontend', 'backend', 'full-stack', 'web development', 'web developer', 'software engineer', 'software developer',
        'data analyst', 'data scientist', 'data engineer', 'ml engineer', 'ai engineer', 'devops engineer', 'cloud engineer',
        'product manager', 'project manager', 'scrum master', 'technical lead', 'team lead',
        'internship', 'fresher', 'entry level', 'junior', 'senior', 'lead', 'principal', 'architect', 'manager', 'director', 'vp', 'cto',
        'remote', 'hybrid', 'onsite', 'work from home',
        'bachelor', 'master', 'btech', 'mtech', 'be', 'me', 'bsc', 'msc', 'bca', 'mca', 'mba', 'phd', 'mtech',
        'computer science', 'information technology', 'information systems', 'data science', 'artificial intelligence', 'electronics', 'mechanical', 'civil',
    ];
    for (const kw of keywordList) {
        if (lowerText.includes(kw) && !keywords.includes(kw)) {
            keywords.push(kw);
        }
    }

    // --- Extract Experience ---
    let totalExperience = 0;
    const expPattern = /(\d+)\s*(?:\+?\s*)?(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/i;
    const expMatch = text.match(expPattern);
    if (expMatch) {
        totalExperience = parseInt(expMatch[1]);
    }

    // Try to calculate from work history dates
    if (totalExperience === 0) {
        const dateRanges = text.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/gi);
        if (dateRanges) {
            let totalYears = 0;
            for (const range of dateRanges) {
                const years = range.match(/(\d{4})\s*[-–]\s*(\d{4}|present|current)/i);
                if (years) {
                    const start = parseInt(years[1]);
                    const end = years[2] === 'present' || years[2] === 'current' ? 2026 : parseInt(years[2]);
                    totalYears += (end - start);
                }
            }
            totalExperience = totalYears;
        }
    }

    // --- Extract Education ---
    const education = [];
    const eduPatterns = [
        /(?:bachelor|master|b\.?tech|m\.?tech|be|me|bsc|msc|bca|mca|mba|phd|b\.?sc|m\.?sc)\s*(?:in\s*([A-Za-z\s&]+))?\s*(?:from|at)\s*([A-Za-z\s&.,]+)/gi,
        /([A-Za-z\s&.,]+(?:University|College|Institute|University|School))\s*[-–]\s*(\d{4})\s*[-–]\s*(\d{4})/gi,
    ];

    for (const pattern of eduPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            education.push(match[0].trim().substring(0, 100));
        }
    }

    // --- Extract Certifications ---
    const certifications = [];
    const certPatterns = [
        /(?:certification|certificate|certified)\s*[:–]?\s*([A-Za-z\s&.,\-]+)/gi,
        /(?:aws|azure|google|gcp|cisco|oracle|microsoft|ibm|linkedin)\s*(?:certified|certification)/gi,
    ];
    for (const pattern of certPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            certifications.push(match[0].trim().substring(0, 100));
        }
    }

    // --- Extract Projects ---
    const projects = [];
    const projectLines = lines.filter(line =>
        /project/i.test(line) && line.length > 10 && line.length < 150
    );
    for (const line of projectLines.slice(0, 5)) {
        projects.push(line.trim());
    }

    // --- Determine Experience Level ---
    let experienceLevel = 'fresher';
    if (totalExperience >= 7) experienceLevel = 'senior';
    else if (totalExperience >= 3) experienceLevel = 'mid';
    else if (totalExperience >= 1) experienceLevel = 'junior';

    return {
        name: name || 'Anonymous',
        email,
        phone,
        location: location || 'Not specified',
        skills: foundSkills,
        keywords,
        totalExperience,
        experienceLevel,
        education: education.slice(0, 5),
        certifications: certifications.slice(0, 5),
        projects: projects.slice(0, 5),
        rawText: text.substring(0, 5000),
    };
}