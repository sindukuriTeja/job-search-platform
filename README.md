# Resume-Based Job Search Platform

A comprehensive job search platform that analyzes your resume and searches across 100+ job platforms to find the most relevant opportunities for you.

## Features

- **Resume Parsing**: Automatically extracts skills, experience, education, and qualifications from PDF, DOCX, and TXT resumes
- **Multi-Platform Search**: Searches across 100+ job platforms including:
  - Indian job portals (LinkedIn, Naukri, Indeed India, etc.)
  - Software engineering platforms (Wellfound, HackerEarth, Cutshort, etc.)
  - AI/ML job boards (AI Jobs, DataJobs, Kaggle Jobs, etc.)
  - Remote job platforms (Remote OK, We Work Remotely, FlexJobs, etc.)
  - International job portals (Indeed USA, Glassdoor, Reed UK, etc.)
  - Internship platforms (Internshala, LetsIntern, Unstop, etc.)
  - Freelancing platforms (Upwork, Fiverr, Freelancer.com, etc.)
  - Startup job boards (Wellfound, Y Combinator, AngelList, etc.)
  - Company career pages (Google, Microsoft, Amazon, etc.)
  - Off-campus hiring platforms (Unstop, Superset, Mercer Mettl, etc.)
  - Government job portals (NCS, UPSC, SSC, etc.)
- **Smart Job Matching**: Uses advanced algorithms to match your resume with job requirements
- **Location-Based Search**: Filter jobs by your preferred location
- **Experience Level Filtering**: Search for jobs matching your experience level
- **Detailed Match Analysis**: Shows matched skills, missing skills, and match percentage
- **Real-Time Search**: Live search across all platforms with progress tracking

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd job-search-platform
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install ChromeDriver** (for browser automation)
   ```bash
   # The webdriver-manager will handle this automatically
   ```

4. **Install Chrome browser** (if not already installed)
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install google-chrome-stable
   
   # macOS
   brew install --cask google-chrome
   
   # Windows
   # Download from https://www.google.com/chrome/
   ```

## Usage

1. **Start the application**
   ```bash
   python app.py
   ```

2. **Open your browser** and navigate to `http://localhost:5000`

3. **Upload your resume** (PDF, DOCX, or TXT format)

4. **Configure your search**:
   - Enter your preferred location
   - Select your experience level
   - Choose job categories to search

5. **Click "Search Jobs"** and wait for results

6. **Review matched jobs** with detailed analysis including:
   - Match percentage
   - Matched skills
   - Missing skills
   - Job details and application links

## Project Structure

```
job-search-platform/
├── app.py                  # Main Flask application
├── resume_parser.py        # Resume parsing and data extraction
├── job_search_engine.py    # Multi-platform job search engine
├── job_matcher.py          # Job matching and scoring algorithm
├── requirements.txt        # Python dependencies
├── templates/
│   └── index.html         # Web interface
└── README.md              # This file
```

## Supported Resume Formats

- PDF (.pdf)
- Microsoft Word (.docx)
- Plain text (.txt)

## Job Categories

- **India Job Portals**: LinkedIn, Naukri, Indeed India, Foundit, Shine, TimesJobs, etc.
- **Software Engineering**: Wellfound, HackerEarth, Cutshort, Hiredly, Instahyre, etc.
- **AI/ML & Data Science**: AI Jobs, DataJobs, Kaggle Jobs, Hugging Face Jobs, etc.
- **Remote Jobs**: Remote OK, We Work Remotely, FlexJobs, Remotive, etc.
- **International Jobs**: Indeed USA, Glassdoor, ZipRecruiter, Reed UK, etc.
- **Internships**: Internshala, LetsIntern, Unstop, Forage, etc.
- **Freelancing**: Upwork, Fiverr, Freelancer.com, PeoplePerHour, etc.
- **Startup Jobs**: Wellfound, Y Combinator, AngelList, Otta, etc.
- **Company Career Pages**: Google, Microsoft, Amazon, Apple, Meta, etc.
- **Off-Campus Hiring**: Unstop, Superset, Mercer Mettl, AMCAT, etc.
- **Government Jobs**: NCS, UPSC, SSC, Railway, ISRO, DRDO, etc.

## Technical Details

### Resume Parser
- Uses PDFPlumber for PDF parsing
- Uses python-docx for DOCX parsing
- Extracts: skills, experience, education, projects, certifications, languages
- Calculates years of experience
- Identifies key skills and keywords

### Job Search Engine
- Uses Selenium for browser automation
- Searches across multiple platforms simultaneously
- Handles rate limiting and error recovery
- Extracts job details: title, company, location, description, salary, etc.

### Job Matcher
- Skill matching with weighted scoring
- Experience level matching
- Education requirement matching
- Location-based matching
- Keyword relevance scoring
- Overall match percentage calculation

## Requirements

- Python 3.8+
- Chrome browser
- 4GB+ RAM recommended
- Stable internet connection

## Troubleshooting

### ChromeDriver Issues
If you encounter ChromeDriver issues:
```bash
pip install webdriver-manager
```

### Memory Issues
If you run out of memory during search:
- Reduce the number of job categories selected
- Close other applications
- Increase system swap space

### Search Timeout
If searches timeout:
- Check your internet connection
- Try searching fewer categories at once
- Increase the timeout in the code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Disclaimer

This tool is for educational and personal use only. Please respect the terms of service of each job platform. Automated scraping may violate some platforms' terms of service. Use responsibly and at your own risk.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.

## Acknowledgments

- Selenium for browser automation
- Flask for web framework
- PDFPlumber for PDF parsing
- python-docx for DOCX parsing
- All the job platforms that make this possible

---

**Built with ❤️ for job seekers everywhere**
# job-search

## Deployment & CORS notes

This repository includes a small serverless proxy at `api/proxy.js` (Vercel compatible). Browser-hosted static sites (GitHub Pages) are blocked by CORS when fetching many job sites. To make the hosted site work reliably:

- Deploy the `api/` function to Vercel (or Netlify). After deploying, set `window.PROXY_URL` in `index.html` to the deployed function URL, for example:

```html
<script>window.PROXY_URL = 'https://your-project.vercel.app/api/proxy';</script>
```

- The client will then use your proxy for blocked fetches and the responses will include CORS headers.

### Setting LinkedIn guest key (secure)

If you have a LinkedIn guest key and want the proxy to use it (recommended so the key is not exposed in client JS), set these environment variables in Vercel (or your hosting provider):

- `LINKEDIN_GUEST_KEY` — the key value
- `LINKEDIN_GUEST_HEADER` — optional header name to send the key in (default: `x-api-key`)
- `LINKEDIN_GUEST_QUERY_PARAM` — optional: instead of a header, set this to a query parameter name (e.g. `guest_key`) and the proxy will append it to LinkedIn requests.

Using the Vercel CLI you can set a production environment variable like this:

```bash
vercel env add LINKEDIN_GUEST_KEY production
vercel env add LINKEDIN_GUEST_HEADER production
vercel env add LINKEDIN_GUEST_QUERY_PARAM production
```

Or set them in the Vercel dashboard for your project. After deployment the proxy will automatically attach the key to requests targeting `linkedin.com`.

- Alternatively, restrict searches to APIs that support CORS (the `searchJobs` categories already favor `Arbeitnow`, `Remotive`, `Himalayas`, and `WeWorkRemotely`).

Security: tighten `Access-Control-Allow-Origin` in the proxy for production and add rate-limiting.

## Authenticated access to protected job sites

Plans and scaffolding:

- `api/linkedin_oauth.js` — serverless scaffold to start the LinkedIn OAuth flow and exchange the authorization code for an access token. Set these env vars in your deployment: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`.

- `api/scraper_worker.js` — placeholder for a Puppeteer-based authenticated scraper. It accepts a POST body `{ site, username, password, query }` and should perform site-specific login and search steps. Note: running Puppeteer in serverless requires special Chromium binaries or a dedicated Docker host.

Security & legal:
- Do not save user credentials without explicit consent; prefer ephemeral sessions and delete credentials after use.
- Respect each site's Terms of Service. Scraping authenticated pages may be disallowed.

Recommended next steps:
1. Deploy the proxy to Vercel for unauthenticated CORS handling.
2. For protected platforms, implement OAuth where available (LinkedIn). Use `api/linkedin_oauth.js` scaffold.
3. For sites without APIs, implement `api/scraper_worker.js` on a server capable of running headless Chromium (Docker) and secure credential handling.
