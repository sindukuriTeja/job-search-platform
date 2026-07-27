# NexJobs — AI-Powered Resume Job Search

**Fully client-side. No backend required.** Deploy to any static hosting (Vercel, Netlify, GitHub Pages, Cloudflare Pages, etc.)

## Features

- **Resume Parsing** — Upload PDF, DOCX, or TXT resumes; skills, experience, education, and projects are extracted entirely in the browser using `pdf.js` and `mammoth.js`
- **Smart Job Matching** — Priority-based scoring engine (education → skills → certifications → projects → keywords) runs client-side
- **Multi-Platform Search** — Searches 5+ job APIs simultaneously (Arbeitnow, Remotive, Remote OK, Himalayas, We Work Remotely)
- **100+ Direct Search Links** — Generates pre-filled search URLs for Naukri, LinkedIn, Indeed, Glassdoor, and 100+ other platforms across 12 categories
- **Google OAuth** — Optional sign-in with Google (client-side) to persist search history in localStorage
- **Zero Server Costs** — Everything runs in the browser. No API keys required for core functionality.

## Deployment

### Vercel (recommended)
```bash
npm install
npx vercel --prod
```

### Netlify
```bash
npm install netlify-cli -g
netlify deploy --prod --dir=.
```

### GitHub Pages
Push to a repo and enable GitHub Pages in settings (root directory).

### Any Static Host
Just serve the files — no build step needed.

## Optional: Google OAuth Setup

To enable user authentication and search history persistence:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google+ API**
3. Create **OAuth 2.0 Client ID** (Web application type)
4. Set **Authorized redirect URIs** to: `https://your-domain.com/auth_callback.html`
5. Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` in `auth_callback.html`

> **Note:** The client-side OAuth flow exposes your client secret in `auth_callback.html`. For production, use Google Identity Services (GIS) or add a lightweight backend for the token exchange step.

## Optional: Add More Job APIs

Edit `static/search_engine.js` to add more search functions. Each function should:
- Accept `(query, location)` parameters
- Return `{ platform: string, jobs: [], error: string|null }`
- Use `AbortSignal.timeout(15000)` for request timeouts

Free APIs you can add:
- **Adzuna** — Free tier, requires API key
- **JSearch** (RapidAPI) — Free tier: 5000 requests/month
- **USAJOBS** — Free, no auth
- **Jooble** — Free with API key
- **Adzuna** — Free with API key

## File Structure

```
├── index.html              # Main app (UI + search logic)
├── auth_callback.html      # Google OAuth callback page
├── static/
│   ├── resume_parser.js    # Client-side resume parser (PDF/DOCX/TXT)
│   ├── job_matcher.js      # Priority-based job scoring engine
│   └── search_engine.js    # Multi-platform job search + link generation
├── vercel.json             # Vercel deployment config
└── package.json            # Dependencies (serve, vercel CLI)
```

## How It Works

1. **User uploads resume** → `resume_parser.js` extracts skills, education, experience, projects
2. **User selects categories** → `search_engine.js` builds search queries from skills
3. **Search runs** → Concurrent fetches to public job APIs (Arbeitnow, Remotive, Remote OK, Himalayas, WWR)
4. **Jobs are scored** → `job_matcher.js` ranks each job by education match (35%), skills (25%), certifications (15%), projects (15%), keywords (10%)
5. **Results displayed** → Matched jobs + 100+ direct search links for platforms requiring login
6. **Optional auth** → Google OAuth saves search history to localStorage

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires `fetch`, `AbortSignal.timeout`, `DOMParser`
- PDF parsing requires `pdf.js` (loaded from CDN)
- DOCX parsing requires `mammoth.js` (loaded from CDN)

## License

MIT