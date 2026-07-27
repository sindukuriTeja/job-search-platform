# NexJobs — AI-Powered Resume Job Search

## What This Does

Upload your resume → get matched jobs from multiple platforms + direct links to search 100+ job sites with your skills pre-filled.

## How It Works

### Automated Search (No Login Required)
These platforms have public APIs — results appear instantly:
- **Arbeitnow** — Remote & international jobs
- **Remotive** — Remote tech jobs (7 categories)
- **Remote OK** — Remote jobs worldwide
- **Jooble** — Global job aggregator (requires free API key)

### Direct Search Links (Requires Login on Platform)
For platforms without public APIs (LinkedIn, Indeed, Naukri, etc.), we generate **smart search links** that:
- Pre-fill your skills as search keywords
- Pre-fill your preferred location
- Open the platform's job search page directly
- You just login and browse

This is **better than scraping** because:
- ✅ Always works (no rate limits, no blocking)
- ✅ Shows ALL jobs on the platform (not just API subset)
- ✅ You can apply directly on their site
- ✅ No API keys needed for most platforms
- ✅ Works with your existing accounts

### Optional Google Account Integration
Connect your Google account to:
- Save search results to Google Sheets
- Get email alerts for new matching jobs
- Track your applications

## Setup

### 1. Deploy the Backend (Vercel)

```bash
# Clone and install
npm install

# Set environment variables (optional)
# JOOBLE_API_KEY=your_key_here  (get free key at jooble.org/api)

# Deploy to Vercel
npx vercel deploy --prod
```

The backend runs at `https://your-app.vercel.app/api/search`

### 2. Deploy the Frontend (GitHub Pages)

The frontend is static HTML/JS and can be hosted on GitHub Pages, Netlify, or any static host.

Update `index.html` to point to your backend:
```html
<script>const BACKEND_URL = 'https://your-app.vercel.app/api/search';</script>
```

### 3. Optional: Google Sheets Integration

1. Create a Google Cloud project
2. Enable Google Sheets API
3. Create OAuth 2.0 credentials (Web app)
4. Add your frontend URL to authorized JavaScript origins
5. Add your backend URL to authorized redirect URIs
6. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in backend env vars

## Architecture

```
User Browser (Static Frontend)
    ↓
Vercel Backend (Node.js API)
    ├── Direct API calls to public job APIs
    │   ├── Arbeitnow API
    │   ├── Remotive API
    │   ├── Remote OK API
    │   └── Jooble API (optional key)
    ├── Google Sheets API (optional)
    └── Returns results + direct search links
    ↓
User's Browser (renders results)
```

## Platform Coverage

### Automated Search (Public APIs)
- Arbeitnow, Remotive, Remote OK, Jooble

### Direct Search Links (100+ platforms)
- **India**: Naukri, LinkedIn, Indeed India, Freshersworld, Internshala, Shine, Foundit, Cutshort, Instahyre, HirePro
- **Software**: Wellfound, HackerEarth, Cutshort, Hirist, HackerRank, Stack Overflow, DevJobs, CodeWithJobs
- **AI/ML**: AI Jobs, DataJobs, Kaggle Jobs, AI Jobs Board, ML Jobs
- **Remote**: Remote OK, We Work Remotely, Remotive, Himalayas, FlexJobs, Remote.co, Working Nomads, JustRemote, Remotely.in, Dynamite Jobs
- **International**: Indeed Global, Glassdoor, ZipRecruiter, Monster, CareerBuilder, Dice, TotalJobs, Jobs2Careers, SimplyHired, USAJobs
- **Internships**: Internshala, LetsIntern, Unstop, Internship Monkey, WayUp, Chegg, Shine, Freshersworld
- **Freelancing**: Upwork, Fiverr, Freelancer, Toptal, Guru, PeoplePerHour, Freelance.com, Gun.io, Arc.dev, Turing
- **Startups**: Wellfound, Y Combinator, Hired, Cutshort, Instahyre, Hiringify, Hirect, Trakinn, Hirist, HirePro
- **Companies**: Google, Microsoft, Amazon, Apple, Meta, Netflix, Tesla, Adobe, Salesforce, Oracle, Infosys, TCS, Wipro, HCL, Accenture, Deloitte, Cognizant, Capgemini, IBM, Intel, Qualcomm, Samsung, Flipkart, Swiggy, Zomato, Razorpay, PhonePe, Paytm, Ola, Uber, Airbnb, Spotify, Slack, Shopify, Stripe, Twilio, Atlassian, Dropbox, Airtable, Notion, Figma, Canva, Zoom, Snowflake, Databricks, MongoDB, Elastic, Confluent, HashiCorp, Red Hat, VMware, Cisco, Juniper, Arista, Broadcom, NVIDIA, AMD, MediaTek, Sony, Ericsson, Huawei, Siemens, Bosch, GE, Honeywell, Schneider Electric, ABB, Rockwell Automation, Philips, J&J, Pfizer, Roche, Novartis, Sanofi, GSK, AstraZeneca, Merck, Bayer, Eli Lilly, AbbVie, Bristol Myers Squibb, Amgen, Biogen, Gilead, Regeneron, Moderna, BioNTech
- **Off-Campus**: Unstop, Superset, Mercer Mettl, CoCubes, Amcat, eLitmus, Cutshort, Instahyre, HirePro, Apna, Hirect, Hiringify, MyGate Jobs, HireVue, Trakinn, Hirist
- **Government**: NCS, UPSC, SSC, Railway, Banking, ISRO, DRDO, GATE, PSU Jobs, Sarkari Naukri, Employment News, Sarkari Result, FreeJobAlert, Sarkari Exam, Result India
- **Quick Apply**: Instahyre, Cutshort, Hiredly, Hirist, HirePro, Apna, Hirect, Hiringify, MyGate Jobs, HireVue

## Location Matching

The matcher supports 100+ Indian cities with smart matching:
- City name variations (Bangalore/Bengaluru, Mumbai/Bombay, Kolkata/Calcutta)
- State-level matching (Hyderabad ↔ Telangana)
- Area/locality matching (Gachibowli, HITEC City, etc.)
- Remote jobs always included

## Resume Parsing

Client-side parsing (no server needed):
- PDF (via pdf.js)
- DOCX (via mammoth.js)
- TXT (plain text)

Extracts: skills, education, experience, projects, certifications, keywords

## Job Matching Algorithm

Priority-based scoring:
1. **Education/Branch match** (35%)
2. **Skills match** (25%)
3. **Certifications match** (15%)
4. **Projects match** (15%)
5. **Keywords overlap** (10%)

Experience level filtering: Fresher, 0-1 years, Junior, Mid, Senior, All

## License

MIT