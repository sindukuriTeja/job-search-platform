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
 * 
 * IMPORTANT: Be lenient with location matching. Many jobs list locations in
 * different formats (city, city-state, country, etc.). If the preferred
 * location is an Indian city, also match jobs in that state/region.
 * Remote jobs are always acceptable.
 */
function locationMultiplier(jobLocation, preferredLocation) {
    if (!preferredLocation) return 1.0; // No preference set — neutral

    const jobLoc = normalize(jobLocation);
    const prefLoc = normalize(preferredLocation);

    if (!jobLoc) return 0.9; // No location in job — could be remote, slight bonus

    // Exact match
    if (jobLoc === prefLoc) return 1.0;

    // Partial match — preferred location is substring of job location or vice versa
    if (jobLoc.includes(prefLoc) || prefLoc.includes(jobLoc)) return 1.0;

    // Remote is always acceptable
    if (jobLoc.includes('remote') || jobLoc.includes('work from home') || jobLoc.includes('wfh') || jobLoc.includes('anywhere')) return 1.0;

    // Check for common city variations with expanded lists
    const cityMap = {
        'bangalore': ['bangalore', 'bengaluru', 'blr', 'banglore', 'bangaluru'],
        'mumbai': ['mumbai', 'bombay', 'mumbai suburb', 'thane', 'navi mumbai', 'andheri', 'bandra', 'powai', 'mumbai city'],
        'delhi': ['delhi', 'new delhi', 'ndelhi', 'dlf', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'ghaziabad', 'delhi ncr', 'ncr', 'south delhi', 'north delhi', 'east delhi', 'west delhi', 'central delhi'],
        'hyderabad': ['hyderabad', 'hyd', 'secunderabad', 'secunderabadabad', 'ts', 'telangana', 'cyberabad', 'HITEC City', 'Gachibowli', 'Madhapur', 'Kondapur', 'Banjara Hills', 'Jubilee Hills', 'Kukatpally', 'Uppal', 'LB Nagar', 'Miyapur', 'KPHB', 'Shamshabad', 'Raidurg', 'Nizampet', 'Manikonda', 'Kondapur', 'Financial District', 'HITEC City', 'Madhapur', 'Ameerpet', 'Tolichowki', 'Balanagar', 'Kondapur', 'Begumpet', 'Sangareddy', 'Medchal', 'Quthbullapur', 'Yousufguda', 'Kachiguda', 'Dilsukhnagar', 'Malakpet', 'Chikkadpally', 'Nagole', 'Patancheruvu', 'Kokapet', 'Kondapur', 'Suraram', 'Nanakramguda', 'Tolichowki', 'Narayanguda', 'Bolarum', 'Attapur', 'Uppal', 'Malkajgiri', 'Miyapur', 'Chintal', 'Moor Market', 'Sultan Bazar', 'Saroornagar', 'Saidabad', 'Ameerpet', 'Begumpet', 'Nampally', 'Khairatabad', 'Sanjeevaiah Park', 'Dilsukhnagar', 'Malkajgiri', 'Nizampet', 'Kukatpally', 'Jubilee Hills', 'Banjara Hills', 'Himayatnagar', 'Malakpet', 'Chikkadpally', 'Nagole', 'Patancheruvu', 'Kokapet', 'Kondapur', 'Suraram', 'Nanakramguda', 'Tolichowki', 'Narayanguda', 'Bolarum', 'Attapur', 'Uppal', 'Malkajgiri', 'Miyapur', 'Chintal', 'Moor Market', 'Sultan Bazar', 'Saroornagar', 'Saidabad', 'Ameerpet', 'Begumpet', 'Nampally', 'Khairatabad', 'Sanjeevaiah Park'],
        'chennai': ['chennai', 'madras', 'chen', 'tn', 'tamil nadu'],
        'pune': ['pune', 'puna', 'puné'],
        'kolkata': ['kolkata', 'calcutta', 'kol'],
        'ahmedabad': ['ahmedabad', 'amd', 'gandhinagar', 'ahmdabad'],
        'jaipur': ['jaipur', 'jp', 'rajasthan'],
        'chandigarh': ['chandigarh', 'chd', 'tricity', 'mothers'],
        'bhopal': ['bhopal', 'bh', 'mp', 'madhya pradesh'],
        'lucknow': ['lucknow', 'lko', 'up', 'uttar pradesh'],
        'kozhikode': ['kozhikode', 'calicut', 'kcz', 'kerala'],
        'thrissur': ['thrissur', 'tsr', 'kerala'],
        'kochi': ['kochi', 'cochin', 'cnn', 'kerala', 'ernakulam'],
        'kerala': ['kerala', 'trivandrum', 'thiruvananthapuram', 'kollam', 'ernakulam', 'thrissur', 'kozhikode', 'calicut', 'kottayam', 'alappuzha', 'palakkad', 'malappuram', 'kannur', 'kasaragod', 'idukki', 'pathanamthitta'],
        'telangana': ['telangana', 'hyderabad', 'warangal', 'nizamabad', 'karimnagar', 'khammam', 'mahbubnagar', 'nalgonda', 'rangareddy', 'medchal', 'sangareddy', 'siddipet', 'victoria', 'adilabad', 'nirmal', 'kumuram bheem', 'peddapalli', 'jagtial', 'mancherial', 'rajanna sircilla', 'mulugu', 'waidhan', 'komaram bheem', 'bhadradri kothagudem', 'nagarkurnool', 'jayashankar bhupalpally', 'warangal', 'khammam', 'mahbubnagar', 'nalgonda', 'rangareddy', 'medchal', 'sangareddy', 'siddipet', 'victoria', 'adilabad', 'nirmal', 'kumuram bheem', 'peddapalli', 'jagtial', 'mancherial', 'rajanna sircilla', 'mulugu', 'waidhan', 'komaram bheem', 'bhadradri kothagudem', 'nagarkurnool', 'jayashankar bhupalpally'],
        'tamil nadu': ['tamil nadu', 'chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli', 'tirunelveli', 'erode', 'vellore', 'thoothukudi', 'dindigul', 'thanjavur', 'sivaganga', 'karur', 'tiruppur', 'cuddalore', 'nagercoil', 'kanchipuram', 'kumbakonam', 'nellore', 'ranipet', 'salem', 'karur', 'dharmapuri', 'krishnagiri', 'villupuram', 'tiruvannamalai', 'chengalpattu', 'tirupattur', 'perambalur', 'ariyalur', 'tiruvarur', 'nayagarh', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thiruvarur', 'mayiladuthurai', 'nagapattinam', 'karungal', 'thanjavur', 'tiruvarur', 'nagapattinam', 'mayiladuthurai', 'thiruvarur', 'thanjavur', 'karungal', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thoothukudi', 'tirunelveli', 'kanyakumari', 'tiruchirappalli', 'thiruvarur', 'nayagarh', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thoothukudi', 'tirunelveli', 'kanyakumari'],
        'maharashtra': ['maharashtra', 'mumbai', 'pune', 'nagpur', 'nashik', 'thane', 'aurangabad', 'solapur', 'amravati', 'kolhapur', 'sangli', 'dhule', 'ahmednagar', 'latur', 'jalgaon', 'akola', 'nanded', 'satara', 'beed', 'osmanabad', 'parbhani', 'jalna', 'buldhana', 'yavatmal', 'wardha', 'chandrapur', 'gondia', 'gadchiroli', 'raigad', 'ratnagiri', 'sindhudurg', 'nandurbar', 'dharmashala', 'nandurbar', 'dharmashala'],
        'karnataka': ['karnataka', 'bangalore', 'bengaluru', 'mysore', 'mysuru', 'hubli', 'hubli-dharwad', 'mangalore', 'mangaluru', 'belgaum', 'belagavi', 'gulbarga', 'kalaburagi', 'dharwad', 'shimoga', 'shivamogga', 'tumkur', 'tumakuru', 'bijapur', 'vijayapura', 'davangere', 'bellary', 'ballari', 'raichur', 'hassan', 'mandya', 'udupi', 'uttara kannada', 'kolar', 'chitradurga', 'chikkamagaluru', 'chikkaballapur', 'ramanagara', 'kodagu', 'koppal', 'yadgir', 'gadag', 'haveri', 'bagalkot', 'vijayanagara'],
        'gujarat': ['gujarat', 'ahmedabad', 'surat', 'vadodara', 'rajkot', 'bhavnagar', 'jamnagar', 'junagadh', 'gandhinagar', 'anand', 'nadiad', 'mahesana', 'bharuch', 'navsari', 'valsad', 'surat', ' Surat', 'Surat', 'Surat district', 'Surat city'],
        'rajasthan': ['rajasthan', 'jaipur', 'udaipur', 'jodhpur', 'kota', 'ajmer', 'bikaner', 'alwar', 'bharatpur', 'sikar', 'churu', 'hanumangarh', 'ganganagar', 'banswara', 'barmer', 'sri ganganagar', 'jhalawar', 'dungarpur', 'dholpur', 'karauli', 'dausa', 'sawai madhopur', 'karoli', 'pali', 'jhalawar', 'baran', 'bundi', 'nagaur', 'chittorgarh', 'bhilwara', 'tonk', 'dholpur', 'karauli', 'dhaulpur', 'sawai madhopur', 'alwar', 'bharatpur', 'dholpur', 'karauli', 'dhaulpur', 'sawai madhopur', 'jaipur', 'sikar', 'churu', 'hanumangarh', 'ganganagar', 'bikaner', 'jaisalmer', 'barmer', 'jodhpur', 'pali', 'nagaur', 'ajmer', 'tonk', 'bharatpur', 'dholpur', 'karauli', 'dhaulpur', 'sawai madhopur', 'alwar', 'bharatpur', 'dholpur', 'karauli', 'dhaulpur', 'sawai madhopur'],
        'up': ['up', 'uttar pradesh', 'lucknow', 'kanpur', 'varanasi', 'agra', 'meerut', 'allahabad', 'prayagraj', 'bareilly', 'aligarh', 'moradabad', 'saharanpur', 'gorakhpur', 'noida', 'ghaziabad', 'firozabad', 'jhansi', 'muzaffarnagar', 'moradabad', 'saharanpur', 'lucknow', 'kanpur', 'varanasi', 'agra', 'meerut', 'allahabad', 'prayagraj', 'bareilly', 'aligarh', 'moradabad', 'saharanpur', 'gorakhpur', 'noida', 'ghaziabad', 'firozabad', 'jhansi', 'muzaffarnagar'],
        'bihar': ['bihar', 'patna', 'gaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'purnia', 'saransk', 'begusarai', 'katihar', 'khagaria', 'munger', 'buxar', 'dehri', 'arrah', 'hajipur', 'saharsa', 'sasaram', 'hilsa', 'motihari', 'siwan', 'sultanganj', 'bagaha', 'madhubani', 'kishanganj', 'berhampur', 'chhapra', 'saharsa', 'sasaram', 'hilsa', 'motihari', 'siwan', 'sultanganj', 'bagaha', 'madhubani', 'kishanganj', 'berhampur'],
        'odisha': ['odisha', 'odisha', 'bhubaneswar', 'cuttack', 'rourkela', 'berhampur', 'sambalpur', 'puri', 'balasore', 'bargarh', 'bhadrak', 'boudh', 'kalahandi', 'kandhamal', 'keonjhar', 'khordha', 'koraput', 'mayurbhanj', 'nabarangpur', 'nayagarh', 'balangir', 'sundargarh', 'kendrapara', 'jajpur', 'ganjam', 'dhenkanal', 'angul', 'sonapur', 'jajpur', 'keonjhar', 'kendujhar', 'baleshwar', 'balasore', 'bargarh', 'bhadrak', 'boudh', 'kalahandi', 'kandhamal', 'keonjhar', 'khordha', 'koraput', 'mayurbhanj', 'nabarangpur', 'nayagarh', 'balangir', 'sundargarh', 'kendrapara', 'jajpur', 'ganjam', 'dhenkanal', 'angul', 'sonapur'],
        'assam': ['assam', 'guwahati', 'dibrugarh', 'silchar', 'jorhat', 'tezpur', 'dhubri', 'nagaon', 'bongaigaon', 'barpeta', 'alipurduar', 'dhubri', 'goalpara', 'kokrajhar', 'cachar', 'karimganj', 'hailakandi', 'lalmonirhat', 'sylhet', 'moulvibazar', 'sunamganj', 'habiganj', 'netrokona', 'mymensingh', 'jamalpur', 'shariatpur', 'gopalganj', 'faridpur', 'madaripur', 'gazipur', 'narayanganj', 'tangail', 'manikganj', 'munshiganj', 'rajbari', 'mymensingh', 'jamalpur', 'shariatpur', 'gopalganj', 'faridpur', 'madaripur', 'gazipur', 'narayanganj', 'tangail', 'manikganj', 'munshiganj', 'rajbari'],
        'goa': ['goa', 'panaji', 'panjim', 'margao', 'margao', 'vasco', 'vasco da gama', 'mapusa', 'ponda', 'sangolda', 'porvorim', 'calangute', 'baga', 'candolim', 'anjuna', 'arambol', 'assagao', 'morjim', 'palolem', 'agonda', 'colva', 'benaulim', 'cavelossim', 'varca', 'canacona', 'margao', 'porvorim', 'sangolda', 'panaji', 'panjim', 'mapusa', 'pondim', 'ponda', 'nagoa', 'quelimane', 'quelimane', 'moma', 'moma', 'moma', 'moma'],
        'haryana': ['haryana', 'gurgaon', 'gurugram', 'noida', 'faridabad', 'panipat', 'ambala', 'yamunanagar', 'rohtak', 'hisar', 'karnal', 'sonipat', 'panchkula', 'bhiwani', 'sirsa', 'jhajjar', 'mahendragarh', 'rewari', 'palwal', 'baghpat', 'mewat', 'karnal', 'panipat', 'ambala', 'yamunanagar', 'kurukshetra', 'karnal', 'panipat', 'ambala', 'yamunanagar', 'kurukshetra'],
        'punjab': ['punjab', 'chandigarh', 'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda', 'pathankot', 'hoshiarpur', 'moga', 'barnala', 'sangrur', 'fatehgarh sahib', 'faridkot', 'mansa', 'muktsar', 'firozpur', 'gurdaspur', 'kapurthala', 'sahibzada ajit singh nagar', 'rajasansi', 'tarn taran', 'pathankot', 'hoshiarpur', 'moga', 'barnala', 'sangrur', 'fatehgarh sahib', 'faridkot', 'mansa', 'muktsar', 'firozpur', 'gurdaspur', 'kapurthala', 'sahibzada ajit singh nagar', 'rajasansi', 'tarn taran'],
        'uttarakhand': ['uttarakhand', 'dehradun', 'nainital', 'haridwar', 'rudraprayag', 'pithoragarh', 'almora', 'champawat', 'bageshwar', 'udham singh nagar', 'pauri garhwal', 'chamoli', 'rudraprayag', 'nainital', 'almora', 'champawat', 'bageshwar', 'udham singh nagar', 'pauri garhwal', 'chamoli'],
        'jharkhand': ['jharkhand', 'ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'deoghar', 'giridih', 'hazaribagh', 'dumka', 'godda', 'palamau', 'garhwa', 'sahibganj', 'jhargram', 'purulia', 'bankura', 'birbhum', 'bangaon', 'balurghat', 'jalpaiguri', 'cooch behar', 'alipurduar', 'malda', 'murshidabad', 'nadia', 'birbhum', 'purulia', 'bankura', 'bangaon', 'balurghat', 'jalpaiguri', 'cooch behar', 'alipurduar', 'malda', 'murshidabad', 'nadia'],
        'chhattisgarh': ['chhattisgarh', 'raipur', 'bilaspur', 'durg', 'bhilai', 'korba', 'raigarh', 'rajnandgaon', 'ambikapur', 'kanker', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband'],
        'madhya pradesh': ['madhya pradesh', 'mp', 'bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain', 'sagar', 'dewas', 'satna', 'ratlam', 'rewa', 'raisen', 'rati', 'neemuch', 'panna', 'singrauli', 'vidisha', 'chhindwara', 'katni', 'shajapur', 'sehore', 'mandsaur', 'khargone', 'morena', 'bhind', 'dhar', 'jhabua', 'alirajpur', 'barwani', 'dhamtari', 'khargone', 'morena', 'bhind', 'dhar', 'jhabua', 'alirajpur', 'barwani', 'dhamtari'],
        'andhra pradesh': ['andhra pradesh', 'ap', 'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'rajjampet', 'kakinada', 'tirupati', 'anantapur', 'kadapa', 'ongole', 'nellore', 'kurnool', 'rajjampet', 'kakinada', 'tirupati', 'anantapur', 'kadapa', 'ongole'],
        'west bengal': ['west bengal', 'wb', 'kolkata', 'howrah', 'durgapur', 'asansol', 'siliguri', 'bardhaman', 'malda', 'jalpaiguri', 'cooch behar', 'darjeeling', 'alipurduar', 'hooghly', 'birbhum', 'purulia', 'bankura', 'medinipur', 'purba medinipur', 'paschim medinipur', 'nadia', 'murshidabad', 'birbhum', 'purulia', 'bankura', 'medinipur', 'purba medinipur', 'paschim medinipur', 'nadia', 'murshidabad'],
        'telangana': ['telangana', 'hyderabad', 'warangal', 'nizamabad', 'karimnagar', 'khammam', 'mahbubnagar', 'nalgonda', 'rangareddy', 'medchal', 'sangareddy', 'siddipet', 'victoria', 'adilabad', 'nirmal', 'kumuram bheem', 'peddapalli', 'jagtial', 'mancherial', 'rajanna sircilla', 'mulugu', 'waidhan', 'komaram bheem', 'bhadradri kothagudem', 'nagarkurnool', 'jayashankar bhupalpally', 'warangal', 'khammam', 'mahbubnagar', 'nalgonda', 'rangareddy', 'medchal', 'sangareddy', 'siddipet', 'victoria', 'adilabad', 'nirmal', 'kumuram bheem', 'peddapalli', 'jagtial', 'mancherial', 'rajanna sircilla', 'mulugu', 'waidhan', 'komaram bheem', 'bhadradri kothagudem', 'nagarkurnool', 'jayashankar bhupalpally'],
    };

    for (const [canonical, variants] of Object.entries(cityMap)) {
        const jobInGroup = variants.some(v => jobLoc.includes(v));
        const prefInGroup = variants.some(v => prefLoc.includes(v));
        if (jobInGroup && prefInGroup) return 0.95;
    }

    // If job location is "India" or a state, and preferred is a city in that state — match it
    const stateCityMap = {
        'telangana': ['hyderabad', 'warangal', 'nizamabad', 'karimnagar', 'khammam', 'mahbubnagar', 'nalgonda', 'rangareddy', 'medchal', 'sangareddy', 'siddipet', 'victoria', 'adilabad', 'nirmal', 'kumuram bheem', 'peddapalli', 'jagtial', 'mancherial', 'rajanna sircilla', 'mulugu', 'waidhan', 'komaram bheem', 'bhadradri kothagudem', 'nagarkurnool', 'jayashankar bhupalpally'],
        'karnataka': ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'hubli', 'hubli-dharwad', 'mangalore', 'mangaluru', 'belgaum', 'belagavi', 'gulbarga', 'kalaburagi', 'dharwad', 'shimoga', 'shivamogga', 'tumkur', 'tumakuru', 'bijapur', 'vijayapura', 'davangere', 'bellary', 'ballari', 'raichur', 'hassan', 'mandya', 'udupi', 'uttara kannada', 'kolar', 'chitradurga', 'chikkamagaluru', 'chikkaballapur', 'ramanagara', 'kodagu', 'koppal', 'yadgir', 'gadag', 'haveri', 'bagalkot', 'vijayanagara'],
        'maharashtra': ['mumbai', 'pune', 'nagpur', 'nashik', 'thane', 'aurangabad', 'solapur', 'amravati', 'kolhapur', 'sangli', 'dhule', 'ahmednagar', 'latur', 'jalgaon', 'akola', 'nanded', 'satara', 'beed', 'osmanabad', 'parbhani', 'jalna', 'buldhana', 'yavatmal', 'wardha', 'chandrapur', 'gondia', 'gadchiroli', 'raigad', 'ratnagiri', 'sindhudurg', 'nandurbar', 'dharmashala', 'nandurbar', 'dharmashala'],
        'tamil nadu': ['chennai', 'coimbatore', 'madurai', 'salem', 'tiruchirappalli', 'tirunelveli', 'erode', 'vellore', 'thoothukudi', 'dindigul', 'thanjavur', 'sivaganga', 'karur', 'tiruppur', 'cuddalore', 'nagercoil', 'kanchipuram', 'kumbakonam', 'nellore', 'ranipet', 'salem', 'karur', 'dharmapuri', 'krishnagiri', 'villupuram', 'tiruvannamalai', 'chengalpattu', 'tirupattur', 'perambalur', 'ariyalur', 'tiruvarur', 'nayagarh', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thiruvarur', 'mayiladuthurai', 'nagapattinam', 'karungal', 'thanjavur', 'tiruvarur', 'nagapattinam', 'mayiladuthurai', 'thiruvarur', 'thanjavur', 'karungal', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thoothukudi', 'tirunelveli', 'kanyakumari', 'tiruchirappalli', 'thiruvarur', 'nayagarh', 'pudukkottai', 'ramanathapuram', 'virudhunagar', 'tenkasi', 'thoothukudi', 'tirunelveli', 'kanyakumari'],
        'kerala': ['trivandrum', 'thiruvananthapuram', 'kollam', 'ernakulam', 'kochi', 'cochin', 'thrissur', 'kozhikode', 'calicut', 'kannur', 'kasaragod', 'palakkad', 'alappuzha', 'idukki', 'pathanamthitta', 'malappuram', 'kottayam', 'athirappilly', 'varkala', 'wayanad', 'munnar', 'thevally', 'ponmudi', 'chamravattam', 'chavakkad', 'chendamangalam', 'cherpulassery', 'chirayinkeezhu', 'chittur', 'chittur-thathamangalam', 'chitturuthura', 'chitturuthuravu', 'chitturuthuravu', 'chitturuthuravu'],
        'uttar pradesh': ['lucknow', 'kanpur', 'varanasi', 'agra', 'meerut', 'allahabad', 'prayagraj', 'bareilly', 'aligarh', 'moradabad', 'saharanpur', 'gorakhpur', 'noida', 'ghaziabad', 'firozabad', 'jhansi', 'muzaffarnagar', 'moradabad', 'saharanpur', 'lucknow', 'kanpur', 'varanasi', 'agra', 'meerut', 'allahabad', 'prayagraj', 'bareilly', 'aligarh', 'moradabad', 'saharanpur', 'gorakhpur', 'noida', 'ghaziabad', 'firozabad', 'jhansi', 'muzaffarnagar'],
        'bihar': ['patna', 'gaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'purnia', 'saransk', 'begusarai', 'katihar', 'khagaria', 'munger', 'buxar', 'dehri', 'arrah', 'hajipur', 'saharsa', 'sasaram', 'hilsa', 'motihari', 'siwan', 'sultanganj', 'bagaha', 'madhubani', 'kishanganj', 'berhampur', 'chhapra', 'saharsa', 'sasaram', 'hilsa', 'motihari', 'siwan', 'sultanganj', 'bagaha', 'madhubani', 'kishanganj', 'berhampur'],
        'odisha': ['bhubaneswar', 'cuttack', 'rourkela', 'berhampur', 'sambalpur', 'puri', 'balasore', 'bargarh', 'bhadrak', 'boudh', 'kalahandi', 'kandhamal', 'keonjhar', 'khordha', 'koraput', 'mayurbhanj', 'nabarangpur', 'nayagarh', 'balangir', 'sundargarh', 'kendrapara', 'jajpur', 'ganjam', 'dhenkanal', 'angul', 'sonapur', 'jajpur', 'keonjhar', 'kendujhar', 'baleshwar', 'balasore', 'bargarh', 'bhadrak', 'boudh', 'kalahandi', 'kandhamal', 'keonjhar', 'khordha', 'koraput', 'mayurbhanj', 'nabarangpur', 'nayagarh', 'balangir', 'sundargarh', 'kendrapara', 'jajpur', 'ganjam', 'dhenkanal', 'angul', 'sonapur'],
        'assam': ['guwahati', 'dibrugarh', 'silchar', 'jorhat', 'tezpur', 'dhubri', 'nagaon', 'bongaigaon', 'barpeta', 'alipurduar', 'dhubri', 'goalpara', 'kokrajhar', 'cachar', 'karimganj', 'hailakandi', 'lalmonirhat', 'sylhet', 'moulvibazar', 'sunamganj', 'habiganj', 'netrokona', 'mymensingh', 'jamalpur', 'shariatpur', 'gopalganj', 'faridpur', 'madaripur', 'gazipur', 'narayanganj', 'tangail', 'manikganj', 'munshiganj', 'rajbari', 'mymensingh', 'jamalpur', 'shariatpur', 'gopalganj', 'faridpur', 'madaripur', 'gazipur', 'narayanganj', 'tangail', 'manikganj', 'munshiganj', 'rajbari'],
        'goa': ['panaji', 'panjim', 'margao', 'margao', 'vasco', 'vasco da gama', 'mapusa', 'ponda', 'sangolda', 'porvorim', 'calangute', 'baga', 'candolim', 'anjuna', 'arambol', 'assagao', 'morjim', 'palolem', 'agonda', 'colva', 'benaulim', 'cavelossim', 'varca', 'canacona', 'margao', 'porvorim', 'sangolda', 'panaji', 'panjim', 'mapusa', 'pondim', 'ponda', 'nagoa', 'quelimane', 'quelimane', 'moma', 'moma', 'moma', 'moma'],
        'haryana': ['gurgaon', 'gurugram', 'noida', 'faridabad', 'panipat', 'ambala', 'yamunanagar', 'rohtak', 'hisar', 'karnal', 'sonipat', 'panchkula', 'bhiwani', 'sirsa', 'jhajjar', 'mahendragarh', 'rewari', 'palwal', 'baghpat', 'mewat', 'karnal', 'panipat', 'ambala', 'yamunanagar', 'kurukshetra', 'karnal', 'panipat', 'ambala', 'yamunanagar', 'kurukshetra'],
        'punjab': ['chandigarh', 'ludhiana', 'amritsar', 'jalandhar', 'patiala', 'bathinda', 'pathankot', 'hoshiarpur', 'moga', 'barnala', 'sangrur', 'fatehgarh sahib', 'faridkot', 'mansa', 'muktsar', 'firozpur', 'gurdaspur', 'kapurthala', 'sahibzada ajit singh nagar', 'rajasansi', 'tarn taran', 'pathankot', 'hoshiarpur', 'moga', 'barnala', 'sangrur', 'fatehgarh sahib', 'faridkot', 'mansa', 'muktsar', 'firozpur', 'gurdaspur', 'kapurthala', 'sahibzada ajit singh nagar', 'rajasansi', 'tarn taran'],
        'uttarakhand': ['dehradun', 'nainital', 'haridwar', 'rudraprayag', 'pithoragarh', 'almora', 'champawat', 'bageshwar', 'udham singh nagar', 'pauri garhwal', 'chamoli', 'rudraprayag', 'nainital', 'almora', 'champawat', 'bageshwar', 'udham singh nagar', 'pauri garhwal', 'chamoli'],
        'jharkhand': ['ranchi', 'jamshedpur', 'dhanbad', 'bokaro', 'deoghar', 'giridih', 'hazaribagh', 'dumka', 'godda', 'palamau', 'garhwa', 'sahibganj', 'jhargram', 'purulia', 'bankura', 'birbhum', 'bangaon', 'balurghat', 'jalpaiguri', 'cooch behar', 'alipurduar', 'malda', 'murshidabad', 'nadia', 'birbhum', 'purulia', 'bankura', 'bangaon', 'balurghat', 'jalpaiguri', 'cooch behar', 'alipurduar', 'malda', 'murshidabad', 'nadia'],
        'chhattisgarh': ['raipur', 'bilaspur', 'durg', 'bhilai', 'korba', 'raigarh', 'rajnandgaon', 'ambikapur', 'kanker', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband', 'kondagaon', 'bastar', 'dantewada', 'sukma', 'bijapur', 'narayanpur', 'gariaband'],
        'madhya pradesh': ['bhopal', 'indore', 'jabalpur', 'gwalior', 'ujjain', 'sagar', 'dewas', 'satna', 'ratlam', 'rewa', 'raisen', 'rati', 'neemuch', 'panna', 'singrauli', 'vidisha', 'chhindwara', 'katni', 'shajapur', 'sehore', 'mandsaur', 'khargone', 'morena', 'bhind', 'dhar', 'jhabua', 'alirajpur', 'barwani', 'dhamtari', 'khargone', 'morena', 'bhind', 'dhar', 'jhabua', 'alirajpur', 'barwani', 'dhamtari'],
        'andhra pradesh': ['visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'rajjampet', 'kakinada', 'tirupati', 'anantapur', 'kadapa', 'ongole', 'nellore', 'kurnool', 'rajjampet', 'kakinada', 'tirupati', 'anantapur', 'kadapa', 'ongole'],
        'west bengal': ['kolkata', 'howrah', 'durgapur', 'asansol', 'siliguri', 'bardhaman', 'malda', 'jalpaiguri', 'cooch behar', 'darjeeling', 'alipurduar', 'hooghly', 'birbhum', 'purulia', 'bankura', 'medinipur', 'purba medinipur', 'paschim medinipur', 'nadia', 'murshidabad', 'birbhum', 'purulia', 'bankura', 'medinipur', 'purba medinipur', 'paschim medinipur', 'nadia', 'murshidabad'],
    };

    // Check if preferred location is a city and job is in that state
    for (const [state, cities] of Object.entries(stateCityMap)) {
        if (cities.some(c => prefLoc.includes(c)) && jobLoc.includes(state)) return 0.9;
        if (cities.some(c => jobLoc.includes(c)) && prefLoc.includes(state)) return 0.9;
    }

    // Check if preferred location is a state and job is in that state
    for (const state of Object.keys(stateCityMap)) {
        if (prefLoc.includes(state) && jobLoc.includes(state)) return 0.9;
    }

    // No match — but be lenient! Don't filter out completely.
    // Give a small penalty instead of filtering out.
    return 0.5;
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
    // Only filter if there's a strong location preference AND the job is in a different region
    if (locMult < 0.2) {
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