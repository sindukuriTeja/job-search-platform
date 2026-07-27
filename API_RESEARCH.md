# Job-search platform API authentication research

**Research status: 27 July 2026.** This is an implementation-planning inventory, not permission to scrape or bypass a platform’s access controls. “No public API” means no documented, self-service, generally available job-search API was located; it does **not** mean an internal web endpoint may be used. For those entries the endpoint, search scopes, OAuth flow, and public sandbox are **N/A**. Access may exist only through a commercial partnership, an employer/ATS tenant, or an approved integration.

## How to read this document

Each entry answers, in order: **Public API; auth; job-search scopes/permissions; rate limit; price; job-search endpoint; retrievable data; restrictions; sandbox; OAuth flow.** “Not published” is intentionally distinct from “unlimited.” Rate limits and commercial pricing are frequently contract- or app-tier-specific. Confirm them in the linked vendor documentation before launch.

### Common OAuth patterns

* **OAuth authorization-code:** user is sent to `authorization URL` with `client_id`, `redirect_uri`, `response_type=code`, and scopes; the app exchanges the code at `token URL`. PKCE is required or strongly recommended for public clients.
* **Client credentials:** a server exchanges client credentials for an app token; it cannot search an individual user’s jobs unless the API expressly permits it.
* **API key/token:** server-to-server secret in a documented header/query parameter. Keep it server-side; no authorization redirect is involved.
* **ATS tenant APIs:** “job search” normally means reading a company’s requisitions, not a cross-employer marketplace. A tenant/admin must authorize the integration.

## Marketplace and job-board APIs

### 1. LinkedIn Jobs API
**Public API:** No general public Jobs Search API. **Auth:** approved LinkedIn Talent Solutions partner access, typically OAuth 2.0/member or organization authorization plus product approval. **Search permission:** no public job-search scope; recruiting integrations use approved Talent products. **Limits/price:** contract-specific and paid/partner-only; limits not publicly enumerated. **Endpoint/data:** no supported public endpoint for marketplace job search; approved Talent APIs expose contracted recruiting/job-posting data. **Restrictions/sandbox:** must be an approved partner and comply with LinkedIn agreements; no public jobs-search sandbox. **OAuth:** general LinkedIn OAuth uses authorization `https://www.linkedin.com/oauth/v2/authorization` and token `https://www.linkedin.com/oauth/v2/accessToken`; usable scopes depend on approved products, not merely login.

### 2. Indeed Publisher API
**Public API:** No—the historical Publisher API/Job Search API was retired; Indeed’s current integrations are employer/publisher partnerships. **Auth/scopes:** historical publisher key is not a current supported search authorization; no public scopes. **Limits/price:** N/A/publicly unavailable. **Endpoint/data:** retired historical job-search endpoint must not be integrated; no public replacement for web-wide job search. **Restrictions/sandbox/OAuth:** use Indeed’s approved employer products/partner documentation; no public sandbox or OAuth flow for marketplace search.

### 3. Naukri API
**Public API:** No public self-service job-search API. **Auth/scopes:** commercial/enterprise recruiter or integration credentials only; no published job-search scopes. **Limits/price:** negotiated/paid where offered. **Endpoint/data:** no documented public search endpoint; candidate/resume and job-posting integrations are customer/partner products. **Restrictions/sandbox/OAuth:** written commercial access and applicable consent are required; limits, test tenant, and auth flow are contract-specific (often non-OAuth API credentials).

### 4. Monster API
**Public API:** No generally available marketplace job-search API. **Auth/scopes:** employer/partner credentials; no public scopes. **Limits/price:** contract-specific. **Endpoint/data:** no public job-search endpoint; recruiting products may expose customer data. **Restrictions/sandbox/OAuth:** partnership/tenant authorization required; no public sandbox or OAuth flow published.

### 5. Glassdoor API
**Public API:** No public Jobs API for arbitrary search (legacy/partner APIs should not be assumed available). **Auth/scopes:** approved commercial partnership only; no public scopes. **Limits/price:** negotiated. **Endpoint/data:** no supported public jobs-search endpoint. **Restrictions/sandbox/OAuth:** do not scrape; no public sandbox/OAuth documented for search.

### 6. ZipRecruiter API
**Public API:** Limited partner/employer APIs, not a self-service public marketplace search API. **Auth/scopes:** partner-issued credentials; no public job-search OAuth scope. **Limits/price:** partner agreement. **Endpoint/data:** no documented public endpoint for general job discovery. **Restrictions/sandbox/OAuth:** approval required; test access/auth details are supplied to partners, not publicly standardized.

### 7. Dice API
**Public API:** No public job-search API. **Auth/scopes:** enterprise/partner credentials only. **Limits/price:** commercial terms. **Endpoint/data:** no supported public search endpoint. **Restrictions/sandbox/OAuth:** partner approval; no public search sandbox or published OAuth flow.

### 8. Wellfound (AngelList) API
**Public API:** No current public Wellfound job-search API. AngelList’s historic developer APIs do not imply access to Wellfound jobs. **Auth/scopes/limits/price:** N/A for public job search. **Endpoint/data:** none supported. **Restrictions/sandbox/OAuth:** commercial permission required if an integration is offered; no public jobs OAuth/sandbox.

### 9. Cutshort API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price:** private employer/partner arrangements only; not published. **Endpoint/data:** none public. **Restrictions/sandbox/OAuth:** no public sandbox/flow; seek written partnership approval.

### 10. Instahyre API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price:** no public details; employer/partner access only if offered. **Endpoint/data/restrictions/sandbox/OAuth:** no public search endpoint, scopes, sandbox, or OAuth flow.

### 11. Internshala API
**Public API:** No public job/internship-search API. **Auth:** no public developer credentials/scopes. **Limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** platform permission is required; no published sandbox or OAuth flow.

### 12. Shine API
**Public API:** No public self-service jobs-search API. **Auth/scopes:** commercial recruiter/partner credentials only. **Limits/price:** not published/contractual. **Endpoint/data/restrictions/sandbox/OAuth:** no public endpoint, search scope, sandbox, or OAuth flow.

### 13. Foundit API
**Public API:** No general public job-search API. **Auth/scopes:** employer/partner integration access only. **Limits/price:** contractual. **Endpoint/data/restrictions/sandbox/OAuth:** no public job-search endpoint or OAuth/sandbox specification.

### 14. LinkedIn API (v2)
**Public API:** Yes, for approved LinkedIn products, but **not** unrestricted job search. **Auth:** OAuth 2.0 authorization code (OIDC supported). **Scopes:** basic sign-in uses `openid profile email`; organization/member data or Talent access requires product approval and additional scopes. There is no public “search all jobs” scope. **Limits/price:** endpoint/app-specific and published in Developer Portal/app analytics; Talent products are commercial. **Endpoint/data:** v2/REST APIs provide authorized profile, posts, organizations, etc.; no public jobs-search endpoint. **Restrictions/sandbox:** app review/product access and LinkedIn policies; no general sandbox. **OAuth:** `https://www.linkedin.com/oauth/v2/authorization`; `https://www.linkedin.com/oauth/v2/accessToken`.

### 15. Google for Jobs API
**Public API:** No. Google for Jobs is a Google Search experience, not a jobs-search API. **Auth/scopes/limits/price:** N/A. **Endpoint/data:** no API endpoint; job publishers use `JobPosting` structured data in eligible pages and Google Search indexing. **Restrictions:** do not treat Google Search results as an API; comply with Search Essentials/structured-data rules. **Sandbox/OAuth:** none.

### 16. Jooble API
**Public API:** Yes. **Auth:** API key supplied as the `key` query parameter. **Scopes:** key grants the contracted search service; no OAuth scopes. **Limits/price:** free trial/limited quota and paid plans; exact quota is account/plan-specific. **Endpoint:** `POST https://jooble.org/api/{API_KEY}` with search parameters (for example `keywords`, `location`, pagination). **Data:** job title, location, company, source, snippet, link, type/salary where supplied. **Restrictions:** key must be kept private; licensing/attribution and quota rules apply. **Sandbox:** trial key rather than a separate public sandbox. **OAuth:** none.

### 17. Arbeitnow API
**Public API:** Yes. **Auth:** none for public listings. **Scopes:** none. **Limits/price:** free/open public endpoint; no formal published numeric limit—use polite caching/throttling. **Endpoint:** `GET https://www.arbeitnow.com/api/job-board-api` (pagination via `page`). **Data:** title, company, location, remote flag, tags, description, URL, creation date. **Restrictions:** observe terms/attribution and do not overload service. **Sandbox/OAuth:** no/no.

### 18. Remotive API
**Public API:** Yes, public feed. **Auth/scopes:** none. **Limits/price:** free; no formal documented numeric rate limit; cache and throttle. **Endpoint:** `GET https://remotive.com/api/remote-jobs` (optional `category`, `search`, `limit`). **Data:** job id/title/company, category, tags, location, publication date, URL, description, salary where present. **Restrictions:** terms/attribution; no guarantee of availability. **Sandbox/OAuth:** no/no.

### 19. Himalayas API
**Public API:** No documented general API for third-party job search. **Auth/scopes/limits/price:** N/A. **Endpoint/data:** no public search endpoint. **Restrictions/sandbox/OAuth:** obtain partnership permission; no public sandbox/flow.

### 20. We Work Remotely API
**Public API:** No documented, supported public job-search API. RSS feeds/pages are not an API contract. **Auth/scopes/limits/price:** N/A. **Endpoint/data/restrictions/sandbox/OAuth:** no public search endpoint or auth/sandbox; ask WWR for licensing/partner access.

### 21. FlexJobs API
**Public API:** No public job-search API. **Auth/scopes/limits/price:** access is subscription/licensing based; no developer OAuth scopes. **Endpoint/data/restrictions/sandbox/OAuth:** no supported endpoint/sandbox; do not automate member content without permission.

### 22. Remote OK API
**Public API:** Yes, public JSON feed. **Auth/scopes:** none. **Limits/price:** free; no published numeric quota, so cache and throttle. **Endpoint:** `GET https://remoteok.com/api`. **Data:** job id/date, position, company, location, tags, salary, description, apply URL and related metadata. **Restrictions:** API/website terms, attribution and anti-abuse requirements apply; feed can include a legal/metadata first item. **Sandbox/OAuth:** no/no.

### 23. Working Nomads API
**Public API:** No documented public API. **Auth/scopes/limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** request permission; no public flow or sandbox.

### 24. JustRemote API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** no public flow/sandbox.

### 25. Remotely API
**Public API:** No reliably documented general job-search API (the name is ambiguous across products). **Auth/scopes/limits/price/endpoint/data:** N/A unless the specific vendor supplies a contract. **Restrictions/sandbox/OAuth:** identify the vendor and obtain written API documentation; no safe generic endpoint/flow.

### 26. Dynamite Jobs API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A/publicly unavailable; request partner permission.

### 27. Toptal API
**Public API:** No public talent/job marketplace search API. **Auth/scopes/limits/price:** client/talent platform access is not developer API access. **Endpoint/data/restrictions/sandbox/OAuth:** no public job search, sandbox, or OAuth flow.

### 28. Guru API
**Public API:** No currently documented public marketplace search API. **Auth/scopes/limits/price/endpoint/data:** N/A for public search. **Restrictions/sandbox/OAuth:** commercial arrangement required if available.

### 29. Freelancer API
**Public API:** Yes. **Auth:** OAuth 2.0 (and application/session tokens as documented). **Scopes:** request only required scopes; job/project search is exposed by the Marketplace/Projects resources and may need approved app access; user/private actions require corresponding permissions. **Limits/price:** API plan/app-dependent; published limits may change—check Freelancer developer account. **Endpoint:** `GET https://www.freelancer.com/api/projects/0.1/projects/` with search/filter parameters; related project/detail endpoints exist. **Data:** project title, description, budget/currency, skills, owner, bids, status/time, URLs subject to fields/permissions. **Restrictions:** register application, respect user consent and marketplace terms; some resources/features require approval. **Sandbox:** historically `https://www.freelancer-sandbox.com` with sandbox API; confirm current availability. **OAuth:** `https://accounts.freelancer.com/oauth/authorize` and `https://accounts.freelancer.com/oauth/token` (verify current documented paths for the registered app).

### 30. PeoplePerHour API
**Public API:** No broadly available self-service API for job search. **Auth/scopes/limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** no public OAuth/sandbox; partner agreement required.

### 31. Fiverr API
**Public API:** No public API for searching gigs/jobs. Fiverr APIs/integrations are restricted business products. **Auth/scopes/limits/price:** partner-specific. **Endpoint/data/restrictions/sandbox/OAuth:** no public job-search endpoint, scope, sandbox, or flow.

### 32. Upwork API
**Public API:** Yes, for registered/approved developer apps; availability of Marketplace job search is product/permission dependent. **Auth:** OAuth 2.0 authorization code. **Scopes:** scopes/permissions are selected during app registration and consent; request the marketplace/search permissions authorized for the app—there is no blanket anonymous access. **Limits/price:** published per app/end point and subject to change; standard developer access is generally free, commercial usage/approval may apply. **Endpoint:** Upwork GraphQL API (`POST https://api.upwork.com/graphql/v1/graphql`) is the current integration surface; use the documented job-search query available to your app rather than deprecated REST URLs. **Data:** authorized job postings/search results and permitted client/freelancer/proposal-related fields. **Restrictions:** app registration, OAuth consent, API Terms, and possibly production approval; never scrape. **Sandbox:** legacy sandbox has been retired/limited; use developer test accounts/current docs—do not assume a sandbox. **OAuth:** `https://www.upwork.com/ab/account-security/oauth2/authorize`; `https://www.upwork.com/api/v3/oauth2/token`.

### 33. Y Combinator Jobs API
**Public API:** No documented official YC Jobs API. **Auth/scopes/limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** no public search endpoint/flow; seek permission from YC/Work at a Startup.

### 34. Hired API
**Public API:** No public marketplace job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A; employer/talent product access is not API authorization.

### 35. Arc.dev API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 36. Turing API
**Public API:** No public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 37. HackerRank Jobs API
**Public API:** HackerRank has enterprise assessment/integration APIs, but no public job-board search API. **Auth/scopes:** customer/partner credentials, typically tenant-specific. **Limits/price:** enterprise contract. **Endpoint/data:** no public jobs-search endpoint; assessments/candidates are only for authorized tenant integrations. **Restrictions/sandbox/OAuth:** customer approval/test environment is contractual; no public marketplace OAuth.

### 38. HackerEarth Jobs API
**Public API:** Enterprise recruiting/assessment integrations may exist, but no general public job-search API. **Auth/scopes/limits/price:** tenant/contract-specific. **Endpoint/data/restrictions/sandbox/OAuth:** no public marketplace endpoint/flow; consult HackerEarth enterprise documentation.

### 39. Stack Overflow Jobs API
**Public API:** No—Stack Overflow Jobs was discontinued in 2022. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A. The Stack Exchange API is unrelated and must not be represented as a jobs API.

### 40. GitHub Jobs API
**Public API:** No—GitHub Jobs was discontinued in 2021. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A. GitHub REST/GraphQL APIs are not a replacement job board.

### 41. Unstop API
**Public API:** No documented public jobs/opportunities API. **Auth/scopes/limits/price/endpoint/data:** N/A. **Restrictions/sandbox/OAuth:** partnership required; no published public OAuth/sandbox.

### 42. Mercer Mettl API
**Public API:** Yes for enterprise assessment integrations, not public job search. **Auth:** customer-issued API credentials/tokens, implementation-specific. **Scopes:** tenant-authorized assessment, candidate, result/webhook permissions—not job search. **Limits/price:** enterprise contract. **Endpoint/data:** no marketplace search endpoint; can retrieve authorized assessment/candidate/result data. **Restrictions/sandbox/OAuth:** customer contract and data-processing consent; UAT/test access is vendor-provisioned. No universal public OAuth URLs.

### 43. CoCubes API
**Public API:** No generally published job-search API; enterprise assessment integrations are private. **Auth/scopes/limits/price:** contractual. **Endpoint/data:** no public job search. **Restrictions/sandbox/OAuth:** customer/vendor provisioned only.

### 44. eLitmus API
**Public API:** No documented public API for job search. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 45. Amcat API
**Public API:** No public job-search API. AMCAT/SHL assessment integrations are enterprise arrangements. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** tenant-specific, no public search flow.

### 46. Superset API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A; institutional/enterprise integrations require approval.

### 47. HirePro API
**Public API:** No public job-search API; assessment/recruiting integrations are enterprise-only. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** contractual, no public search endpoint/flow.

### 48. Apna API
**Public API:** No public self-service job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** partnership-only if available.

### 49. Hirect API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 50. Hiringify API
**Public API:** No reliably documented public job-search API. **Auth/scopes/limits/price/endpoint/data:** N/A; identify the exact vendor and obtain a contract. **Restrictions/sandbox/OAuth:** no generic flow can be asserted.

### 51. MyGate Jobs API
**Public API:** No documented public jobs API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 52. HireVue API
**Public API:** Enterprise integration APIs are available to customers/partners; no public job marketplace search API. **Auth/scopes:** vendor-issued tenant credentials and authorized interview/candidate data permissions. **Limits/price:** enterprise contract. **Endpoint/data:** no job search; authorized interview invitations, candidates, assessments/results as contracted. **Restrictions/sandbox/OAuth:** privacy/consent and partner approval; test tenant vendor-provisioned; no generic public OAuth URLs.

### 53. Trakinn API
**Public API:** No reliably documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A absent vendor documentation.

### 54. Hirist API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 55. LetsIntern API
**Public API:** No documented public internship-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 56. Internship Monkey API
**Public API:** No documented public API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 57. WayUp API
**Public API:** No public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** partner/enterprise only, if available.

### 58. Chegg Internships API
**Public API:** No public API; Chegg Internships was folded/changed and is not a public developer jobs product. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 59. Freshersworld API
**Public API:** No documented public job-search API. **Auth/scopes/limits/price/endpoint/data/restrictions/sandbox/OAuth:** N/A.

### 60. Shine API (duplicate of 12)
Same finding as **#12**: no documented public job-search API; commercial credentials and all limits/endpoint/sandbox/OAuth details are non-public/contractual.

### 61. Naukri API (duplicate of 3)
Same finding as **#3**: no public self-service job-search API; any recruiting integration is commercial/partner-only and does not provide a public job-search OAuth flow.

## ATS, recruiting, and HR APIs

### 62. Workday API
**Public API:** Yes for Workday customers and authorized integration partners; not a public cross-company job search. **Auth:** OAuth 2.0 for registered API clients (often client credentials) and/or Workday ISU credentials depending on service/version. **Scopes:** tenant-configured domain security policies (for example, Recruiting data) rather than universal scopes. **Limits/price:** tenant/subscription and service-specific; not publicly fixed. **Endpoint:** tenant-specific REST, commonly `https://<tenant>.workday.com/ccx/api/...`; Recruiting endpoints require tenant enablement. **Data:** authorized requisitions, candidates, applications, worker/org data. **Restrictions:** customer must configure security, integration system, and data consent. **Sandbox:** Workday tenants commonly have sandbox/implementation tenants, not a public sandbox. **OAuth:** authorization/token endpoints are tenant-specific (often `https://<tenant>.workday.com/ccx/oauth2/<client>/authorize` and `/token`); obtain exact URLs from tenant registration.

### 63. Greenhouse API
**Public API:** Yes. **Auth:** Job Board API is public/no auth for a selected board; Harvest API uses a Basic-auth API key; Recruiting API access is customer-controlled. **Scopes:** no scope for public board job retrieval; Harvest key permissions are selected per key (job/candidate/application permissions). **Limits/price:** Job Board is free to consume; Harvest access requires a Greenhouse customer and rate limits are documented as roughly 50 requests/10 seconds per key (confirm current docs). **Endpoint:** `GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs` and `/jobs/{job_id}`. **Data:** published job title, location, departments/offices, content, metadata/questions; Harvest adds authorized private recruiting data. **Restrictions:** board token is required; respect published-board/publicity and customer permissions. **Sandbox:** no universal public sandbox; customer test boards/Harvest test configuration. **OAuth:** Job Board/Harvest do not use OAuth; Harvest uses `Authorization: Basic base64(API_KEY:)`.

### 64. Lever API
**Public API:** Yes. **Auth:** public Job Site postings endpoints require no auth; Lever API uses OAuth 2.0 for partner integrations or API key/token-based authorization for customer integrations as configured. **Scopes:** public postings none; OAuth scopes such as `read:postings`/candidate-related scopes are app-approved and documented by Lever. **Limits/price:** customer/partner plan and limits; no universally safe numeric limit. **Endpoint:** `GET https://api.lever.co/v0/postings/{site}` (and `/v0/postings/{site}/{posting}`); public data is published openings. **Data:** posting text, categories, location, team/commitment, lists, apply URL, salary/custom fields when published. **Restrictions:** use site slug and obey terms; private candidate data needs tenant approval. **Sandbox:** developer/demo/test environment only by arrangement. **OAuth:** `https://auth.lever.co/authorize` and `https://auth.lever.co/oauth/token` (confirm tenant/app configuration in current docs).

### 65. Ashby API
**Public API:** Yes for Ashby customers/partners; public job-board endpoints also exist. **Auth:** API key for authenticated API; public job board job retrieval needs no auth. **Scopes:** API keys are permissioned/tenant-controlled; no user OAuth job-search scope for public postings. **Limits/price:** customer plan; limits not broadly fixed. **Endpoint:** public `GET https://api.ashbyhq.com/posting-api/job-board/{jobBoardName}` and job detail routes documented by Ashby; authenticated API uses `https://api.ashbyhq.com/`. **Data:** public postings/job descriptions, locations, departments, apply URLs; authenticated recruiting records where authorized. **Restrictions:** key is secret; public board data only. **Sandbox:** test environments may be provisioned, no universal public sandbox. **OAuth:** no general public OAuth flow for the public jobs API.

### 66. SmartRecruiters API
**Public API:** Yes. **Auth:** public Posting API is unauthenticated; private APIs use OAuth 2.0/access tokens with customer/partner authorization. **Scopes:** public postings none; OAuth uses scopes granted to app for recruiting resources. **Limits/price:** Posting API is publicly available; private limits/plans are contractual. **Endpoint:** `GET https://api.smartrecruiters.com/v1/companies/{companyIdentifier}/postings` and `/postings/{postingId}`. **Data:** published posting title, location, released date, department, type, description, apply URL; private APIs expose authorized candidates/recruiting data. **Restrictions:** company identifier, pagination, app approval for private data. **Sandbox:** SmartRecruiters developer/test environment by request, not an open sandbox. **OAuth:** authorization/token endpoints are supplied in current SmartRecruiters developer/partner docs for registered apps; do not hard-code undocumented URLs.

### 67. Greenhouse Harvest API
**Public API:** Yes, for Greenhouse customers. **Auth:** HTTP Basic with an API key as username and blank password. **Scopes:** per-key permissions configured in Greenhouse; jobs search/list requires relevant `GET: Retrieve Job`/job permissions, and candidate data additionally needs explicit permissions. **Limits/price:** customer feature; Greenhouse documents rate limiting (commonly 50 requests per 10 seconds per key—verify current account docs). **Endpoint:** `GET https://harvest.greenhouse.io/v1/jobs` and `/jobs/{id}` (filters/pagination supported). **Data:** requisitions/jobs, departments/offices, openings, stages and, if permissioned, candidates/applications. **Restrictions:** tenant admin creates key and grants least privilege; sensitive candidate data has strict controls. **Sandbox:** customer test environment only. **OAuth:** none—Basic API key.

### 68. Jobvite API
**Public API:** Yes for Jobvite customers/integration partners, not general marketplace search. **Auth:** customer-issued API credentials/token or OAuth/SAML-based integration arrangements depending on module. **Scopes:** tenant-role/API permissions. **Limits/price:** contract-specific. **Endpoint/data:** Job Requisition/Job APIs are tenant-specific and expose authorized customer postings, candidates, applications, etc.; endpoint base/version is supplied to customer. **Restrictions:** partner/customer approval and PII controls. **Sandbox:** test/UAT tenant by agreement. **OAuth:** no universal public authorization/token URLs.

### 69. iCIMS API
**Public API:** Yes, customer/partner REST APIs; no cross-employer job search. **Auth:** OAuth 2.0 for approved integrations (and legacy customer integration credentials in some configurations). **Scopes:** iCIMS marketplace/tenant permissions for the authorized resources, such as jobs/candidates. **Limits/price:** subscription/contract-based. **Endpoint:** customer-specific iCIMS REST API endpoint(s), often under the customer’s iCIMS domain; jobs/requisitions are tenant resources. **Data:** authorized job/requisition, candidate, application, and workflow data. **Restrictions:** marketplace certification/customer authorization, PII consent, tenant configuration. **Sandbox:** partner/developer sandbox or customer test tenant by approval. **OAuth:** iCIMS supplies tenant/app-specific authorize and token URLs during onboarding; no single public endpoint should be assumed.

### 70. Bullhorn API
**Public API:** Yes. **Auth:** OAuth 2.0/REST login flow using client credentials plus user authorization (Bullhorn session token); API keys/app registration required. **Scopes:** Bullhorn entity permissions are controlled by the user’s Bullhorn role and API entitlements; job-order read/search requires JobOrder read access. **Limits/price:** customer/partner agreement and throttling; no universal public quota. **Endpoint:** authenticate against Bullhorn’s REST services, then use tenant `restUrl`, e.g. `GET {restUrl}/entity/JobOrder` with `query`/`where`; search APIs are tenant data. **Data:** job orders, candidates, clients, submissions and other authorized CRM/ATS entities. **Restrictions:** partner certification, tenant authorization, PII governance. **Sandbox:** Bullhorn provides sandbox/test corp access to approved partners/customers. **OAuth:** use the OAuth authorize/token endpoints and REST login URLs issued for your Bullhorn app/cluster; endpoints vary by data center, so obtain them from Bullhorn developer docs.

### 71. SAP SuccessFactors API
**Public API:** Yes for licensed SuccessFactors tenants. **Auth:** OAuth 2.0 (SAML bearer assertion or client credentials depending on configuration) and legacy Basic authentication may be available; use OAuth where supported. **Scopes:** OAuth client/user permissions plus Role-Based Permissions (RBP), e.g., Recruiting Management job requisition access. **Limits/price:** licensed/tenant-specific; SAP API throttling depends on service. **Endpoint:** OData v2, `https://api{datacenter}.successfactors.com/odata/v2/JobRequisition` (or tenant API host), filtered with OData. **Data:** authorized requisitions, postings, candidates/applications, employee/recruiting entities. **Restrictions:** RBP, consent, data residency and SAP tenant setup. **Sandbox:** SAP test/demo tenants for customers/partners, not public. **OAuth:** token URL is the SAP Identity Authentication/tenant OAuth token endpoint configured for the client; authorization flow details depend on IAS/tenant setup.

### 72. Oracle HCM API
**Public API:** Yes for Oracle Fusion HCM customers. **Auth:** OAuth 2.0 (confidential client; commonly client credentials for server integrations) or Basic auth for some REST services where enabled. **Scopes:** Oracle Identity Cloud/IAM resource scopes and HCM roles; recruiting job requisition access is role-controlled. **Limits/price:** licensed tenant/service limits. **Endpoint:** `https://<host>/hcmRestApi/resources/latest/...` (for example recruiting/job requisition resources available in the tenant version). **Data:** authorized recruiting requisitions/job openings, candidates, applications, workers and metadata. **Restrictions:** implementation role, REST privilege, tenant configuration and PII policies. **Sandbox:** customer test/pod environments, not public. **OAuth:** Oracle IAM/IDCS authorization and token endpoints are tenant-specific (`.../oauth2/v1/authorize`, `.../oauth2/v1/token` in many configurations); obtain from IAM discovery/tenant admin.

### 73. Workable API
**Public API:** Yes for Workable customers/partners. **Auth:** API key in `Authorization: Bearer {token}` (partner OAuth may be available by arrangement, but core API is token based). **Scopes:** key access is tied to a Workable account/user role; job/requisition/candidate data depends on permissions. **Limits/price:** paid Workable account; documented API limits are plan/endpoint dependent. **Endpoint:** `GET https://www.workable.com/api/v3/accounts/{subdomain}/jobs` and `/jobs/{shortcode}` (current v3 docs); public careers-page JSON endpoints are separate/subject to change. **Data:** jobs, descriptions, locations, departments, hiring pipeline and authorized candidates/applications. **Restrictions:** account admin must create key; PII requires lawful basis. **Sandbox:** trial/test account rather than universal sandbox. **OAuth:** no standard public OAuth URLs for the core API key flow.

### 74. Workday Recruiting API
Same platform model as **#62**. **Public API:** only for authorized Workday tenants/partners; not a marketplace. **Auth:** tenant-configured OAuth 2.0/client credentials or ISU. **Scope:** domain security for Recruiting. **Limits/price:** tenant contractual. **Endpoint:** tenant `ccx/api` Recruiting services. **Data:** authorized job requisitions/postings and recruiting records. **Restrictions/sandbox:** tenant approval/test tenant. **OAuth:** tenant-specific authorize/token endpoints.

### 75. Greenhouse Recruiting API
**Public API:** Greenhouse’s Recruiting data API is primarily **Harvest**; see **#67**. **Auth:** Basic API key. **Scopes:** per-key job/candidate/application permissions. **Limits/price:** customer feature; throttled (verify current docs). **Endpoint/data:** `https://harvest.greenhouse.io/v1/jobs` and related recruiting resources; authorized recruiting data. **Restrictions/sandbox/OAuth:** admin-issued least-privilege key; customer test environment; no OAuth.

### 76. JazzHR API
**Public API:** Yes for JazzHR customers. **Auth:** API key (commonly query/body `apikey` per JazzHR API docs). **Scopes:** account/user permissions; no OAuth scope model. **Limits/price:** subscription feature and undocumented/account limits. **Endpoint:** `https://api.resumatorapi.com/v1/jobs` (legacy JazzHR/Resumator API base; confirm current version), with account key/filtering. **Data:** jobs, candidates, applications, interviews and hiring workflows as authorized. **Restrictions:** tenant admin key and PII controls. **Sandbox:** test account by arrangement, no universal public sandbox. **OAuth:** none for documented API-key integration.

### 77. BambooHR API
**Public API:** Yes for BambooHR customers, but it is HRIS—not a job board. **Auth:** API key using HTTP Basic (key as username, arbitrary/blank password per docs). **Scopes:** key inherits creator’s permissions; Recruiting access depends on add-on/permissions. **Limits/price:** paid account; rate limits not universally published. **Endpoint:** company-specific `https://api.bamboohr.com/api/gateway.php/{subdomain}/v1/...`; some recruiting endpoints are customer-feature dependent. **Data:** authorized employee/HR data and, where enabled, applicant/recruiting data. **Restrictions:** sensitive HR data; admin authorization and DPA required. **Sandbox:** no public sandbox; trial/test account. **OAuth:** none for core API.

### 78. Zoho Recruit API
**Public API:** Yes. **Auth:** OAuth 2.0. **Scopes:** e.g. `ZohoRecruit.modules.JobOpenings.READ` for job openings; add `.ALL`, candidates/applications scopes only as needed. **Limits/price:** API limits vary by edition and are published in Zoho’s API limits; paid account/edition may be required for features. **Endpoint:** `GET https://recruit.zoho.{domain}/recruit/v2/JobOpenings` (or current v2 API domain) with criteria/page parameters. **Data:** job openings, clients, candidates, applications, interviews, custom fields subject to scope/profile. **Restrictions:** OAuth app/redirect registration, user profile permission and regional domain matching. **Sandbox:** Zoho Developer sandbox/test account; production data requires consent. **OAuth:** accounts regional domain, e.g. `https://accounts.zoho.com/oauth/v2/auth` and `https://accounts.zoho.com/oauth/v2/token` (use the data center appropriate to account).

### 79. Recruitee API
**Public API:** Yes for customers/partners. **Auth:** API token in `Authorization: Bearer` (or documented token scheme); OAuth for marketplace integrations may be partner-specific. **Scopes:** token/user role and company permissions; jobs/offers/candidates are authorized tenant resources. **Limits/price:** paid plan/account limits; no universally fixed public rate. **Endpoint:** `GET https://api.recruitee.com/c/{company_id}/offers` (v1) and offer detail routes. **Data:** job offers, pipelines, candidates, applications, notes and custom fields as permitted. **Restrictions:** admin-created token, PII controls, partner approval for broad integrations. **Sandbox:** test company by arrangement. **OAuth:** no universal public OAuth flow for normal personal API token access.

### 80. Personio API
**Public API:** Yes for Personio customers and marketplace partners. **Auth:** API credentials exchanged for bearer token (legacy/custom API) and OAuth 2.0 for partner integrations. **Scopes:** API credentials/partner scopes and Personio employee/recruiting permissions; recruiting data requires approved Recruiting API access. **Limits/price:** account/partner contract and documented throttling. **Endpoint:** Recruiting API is tenant/feature dependent; public career endpoints are not a general API. **Data:** authorized employees/absence/attendance and, when enabled, recruiting jobs/candidates/applications. **Restrictions:** API access must be enabled; strict GDPR/PII requirements; partner approval may be needed. **Sandbox:** Personio sandbox/test environment for approved partners/customers. **OAuth:** partner authorization/token URLs and scopes are supplied by Personio during partner onboarding—no safe generic public endpoint.

## Surveys, forms, and employee-experience APIs

These products are **not job-search platforms**. Their APIs can retrieve form definitions, submissions, survey responses, or HR analytics for an account that authorizes the app; their job-search scope and job-search endpoint are therefore **none/N/A**.

### 81. 15Five API
**Public API:** No broadly documented general public API for arbitrary job search; available integrations are customer/partner controlled. **Auth/scopes/limits/price:** contractual/tenant-specific. **Job search endpoint/data:** none; any authorized integration concerns employee-performance data. **Restrictions/sandbox/OAuth:** high-sensitivity HR data; vendor-provisioned access only.

### 82. Lattice API
**Public API:** Yes for customers/partners, but no job search. **Auth:** API key/token or OAuth for approved integrations, depending on product. **Scopes:** tenant-authorized people/performance/compensation data permissions. **Limits/price:** enterprise contract. **Endpoint/data:** no jobs endpoint; retrieves authorized HR/performance data. **Restrictions/sandbox/OAuth:** partner approval, employee privacy, test environment/flow vendor-specific.

### 83. Culture Amp API
**Public API:** Limited customer/partner integrations, not a public job-search API. **Auth:** vendor-issued integration credentials/OAuth as contracted. **Scopes/data:** authorized survey/employee data only; no job search. **Limits/price:** enterprise agreement. **Restrictions/sandbox/OAuth:** privacy and partner approval; no universal public flow/sandbox.

### 84. Glint API
**Public API:** No standalone public job-search API; Glint is a Microsoft/Viva employee-feedback product. **Auth/scopes/limits/price:** enterprise/tenant-specific. **Endpoint/data:** no job endpoint; authorized employee-feedback data only where integrations are offered. **Restrictions/sandbox/OAuth:** Microsoft/customer agreement; no public job OAuth flow.

### 85. Qualtrics API
**Public API:** Yes. **Auth:** API token in `X-API-TOKEN`; OAuth 2.0 exists for Qualtrics apps/integrations. **Scopes:** API token role/brand permissions; OAuth scopes are app/brand-defined. No job-search scope. **Limits/price:** license/brand dependent; Qualtrics publishes API limits by brand/endpoint. **Endpoint:** e.g. `GET https://{datacenter}.qualtrics.com/API/v3/surveys` and survey response export endpoints; no job search. **Data:** surveys, distributions, directories, responses, XM data as authorized. **Restrictions:** data residency and sensitive respondent data controls. **Sandbox:** trial/test brand or partner environment, not a universal sandbox. **OAuth:** Qualtrics OAuth authorize/token endpoints are data-center/brand/app specific; use registered-app documentation.

### 86. SurveyMonkey API
**Public API:** Yes. **Auth:** OAuth 2.0. **Scopes:** request documented scopes such as `surveys_read`, `surveys_write`, `responses_read`, `collectors_read` as needed; no job scope. **Limits/price:** API access/limits depend on plan and app; published limits apply. **Endpoint:** `GET https://api.surveymonkey.com/v3/surveys` and `/surveys/{id}/responses/bulk`. **Data:** surveys, pages/questions, collectors, responses, contacts subject to scopes. **Restrictions:** app registration, user consent, response-data privacy. **Sandbox:** developer account/test surveys; no wholly separate public sandbox generally. **OAuth:** `https://api.surveymonkey.com/oauth/authorize` and `https://api.surveymonkey.com/oauth/token`.

### 87. Typeform API
**Public API:** Yes. **Auth:** personal access token or OAuth 2.0. **Scopes:** OAuth scopes such as `forms:read`, `responses:read`, `webhooks:read/write`, request least privilege; no job scope. **Limits/price:** account plan plus documented rate limits (commonly endpoint/plan dependent). **Endpoint:** `GET https://api.typeform.com/forms`, `GET /forms/{form_id}/responses`. **Data:** forms, fields, response items/answers, themes, images, webhooks. **Restrictions:** token secrecy and respondent privacy. **Sandbox:** create a free/test workspace; no separate public sandbox. **OAuth:** `https://api.typeform.com/oauth/authorize`; `https://api.typeform.com/oauth/token`.

### 88. Formstack API
**Public API:** Yes. **Auth:** OAuth 2.0 (and API key/access token mechanisms documented by product/version). **Scopes:** authorized forms/submissions/documents resources; no job scope. **Limits/price:** plan/account-based and documented by Formstack. **Endpoint:** Forms API base `https://www.formstack.com/api/v2/`, e.g. `/form.json`, `/form/{id}/submission.json`. **Data:** forms, fields, submissions, files and account data as permitted. **Restrictions:** account authorization, sensitive submission/file handling. **Sandbox:** test account; no universal public sandbox. **OAuth:** Formstack developer authorization/token endpoints are provided with app registration; confirm current URLs/version.

### 89. JotForm API
**Public API:** Yes. **Auth:** API key in query/header; OAuth 2.0 for integrations. **Scopes:** API key/OAuth grants account forms/submissions; no job scope. **Limits/price:** free and paid accounts; Jotform publishes daily API call limits by plan. **Endpoint:** `GET https://api.jotform.com/user/forms`, `GET /form/{id}/submissions`. **Data:** forms, questions, submissions, reports, files, users depending on access. **Restrictions:** protect keys and respondent data; API key permissions/settings apply. **Sandbox:** test/free account; no separate public sandbox. **OAuth:** `https://api.jotform.com/oauth/authorize` and `https://api.jotform.com/oauth/token`.

### 90. Google Forms API
**Public API:** Yes. **Auth:** Google OAuth 2.0. **Scopes:** `https://www.googleapis.com/auth/forms.body.readonly` (form structure), `.../forms.responses.readonly` (responses), plus Drive scopes as required. No job scope. **Limits/price:** no charge for API itself; Google Workspace/API quota limits are published per project/user and adjustable by request. **Endpoint:** `GET https://forms.googleapis.com/v1/forms/{formId}` and `/forms/{formId}/responses`. **Data:** form schema/settings and responses for forms the user can access. **Restrictions:** Google Cloud project, OAuth consent screen, verification for sensitive/restricted scopes, user authorization. **Sandbox:** test Google account/project; no special sandbox. **OAuth:** `https://accounts.google.com/o/oauth2/v2/auth`; `https://oauth2.googleapis.com/token`.

### 91. Microsoft Forms API
**Public API:** No general Microsoft Graph API for reading arbitrary Microsoft Forms definitions/responses. **Auth:** Microsoft identity OAuth applies to supported Graph services, but does not create a Forms data API. **Scopes/limits/price/endpoint/data:** no supported job or general Forms retrieval endpoint. **Restrictions:** use approved Microsoft 365/export/Power Automate options where applicable; do not rely on undocumented endpoints. **Sandbox:** Microsoft 365 developer tenant can test supported Graph APIs, not Forms retrieval. **OAuth:** for supported Graph APIs: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize` and `/token`.

### 92. Tally API
**Public API:** Yes. **Auth:** API key/bearer token (Tally API key); no general OAuth flow for normal API access. **Scopes:** key accesses the workspace/forms it is authorized for; no job scope. **Limits/price:** API availability and limits depend on Tally plan; verify current limits. **Endpoint:** `GET https://api.tally.so/forms/{formId}/submissions` and documented form/workspace endpoints. **Data:** forms and submissions/responses, including fields/metadata. **Restrictions:** keep key private, handle respondent PII, and ensure plan/API entitlement. **Sandbox/OAuth:** test workspace; no OAuth for API-key flow.

### 93. Cognito Forms API
**Public API:** Yes. **Auth:** API key (integration/API access credentials); OAuth is not the standard public form API pattern. **Scopes:** key/account permissions control forms/entries; no job scope. **Limits/price:** plan/API access and quotas depend on Cognito Forms subscription. **Endpoint:** Cognito Forms API endpoints for forms and entries are documented per account/API version; use tenant-issued endpoint/key. **Data:** forms, entries/submissions, documents/workflows as authorized. **Restrictions:** configure API access and protect sensitive entries. **Sandbox:** test organization/account; no universal public sandbox. **OAuth:** N/A for normal API key integration.

### 94. Fillout API
**Public API:** Yes, for forms/submissions. **Auth:** API key/Bearer token. **Scopes:** workspace/form access represented by key permissions; no job scope. **Limits/price:** plan/account dependent; verify documentation. **Endpoint:** documented Fillout API, including forms and submission retrieval (current base `https://api.fillout.com/v1/`), e.g. form submissions. **Data:** forms, submission answers, metadata/files as authorized. **Restrictions:** secret management and respondent privacy. **Sandbox/OAuth:** test workspace; no standard OAuth flow.

### 95. Paperform API
**Public API:** Yes. **Auth:** API key/Bearer token. **Scopes:** account/form access from token; no job scope. **Limits/price:** plan-dependent/API terms. **Endpoint:** Paperform API v1, e.g. `https://api.paperform.co/v1/forms/{form_id}/submissions`. **Data:** forms, submissions, fields, payment/submission metadata where authorized. **Restrictions:** key and PII safeguards. **Sandbox:** test form/account; no public OAuth flow. **OAuth:** N/A for standard API-key API.

### 96. Formstack API (duplicate of 88)
Same finding as **#88**: public Forms API, OAuth 2.0/token mechanisms by product; authorized forms/submissions only; no job-search scope or endpoint; account-based limits and test account rather than universal sandbox.

### 97. Wufoo API
**Public API:** Yes. **Auth:** HTTP Basic using API key as username and a placeholder password. **Scopes:** key accesses authorized account forms/entries; no job scope. **Limits/price:** plan-based; API limits/usage are subject to Wufoo terms. **Endpoint:** `https://{subdomain}.wufoo.com/api/v3/forms.json` and `/forms/{formIdentifier}/entries.json`. **Data:** forms, fields, entry/submission data, reports/users as permitted. **Restrictions:** API key secrecy and respondent PII; subdomain is required. **Sandbox:** free/test account; no OAuth. **OAuth:** none.

### 98. Formsite API
**Public API:** Yes. **Auth:** API key/access token as documented by Formsite API. **Scopes:** account/form permissions; no job scope. **Limits/price:** Formsite plan/API entitlement dependent. **Endpoint:** Formsite REST API exposes form items/results under `https://fsapi.formsite.com/...` with account/server-specific path; use account API documentation. **Data:** forms/items, result sets/submissions, files and account information as authorized. **Restrictions:** credentials, privacy, plan access. **Sandbox:** test account; no standard OAuth flow. **OAuth:** N/A for API-key access.

### 99. Zoho Forms API
**Public API:** Yes. **Auth:** Zoho OAuth 2.0. **Scopes:** use Zoho Forms scopes such as `ZohoForms.forms.READ`, submission/report scopes as documented; no job scope. **Limits/price:** edition/API limits vary and are documented by Zoho. **Endpoint:** regional API domain, e.g. `GET https://forms.zoho.com/api/v1/{ownerName}/forms` and form/submission/report endpoints. **Data:** forms, fields, reports, submissions/attachments as scope permits. **Restrictions:** use correct Zoho data-center domain, OAuth consent and PII controls. **Sandbox:** Zoho developer/test account. **OAuth:** e.g. `https://accounts.zoho.com/oauth/v2/auth` and `/token`, replacing domain for the account’s data center.

### 100. HubSpot Forms API
**Public API:** Yes. **Auth:** private app access token or OAuth 2.0. **Scopes:** `forms`/`forms-uploaded-files` and CRM/contact scopes as needed; form definition read uses appropriate Forms scopes. No job scope. **Limits/price:** free developer test accounts exist; public API rate limits are app/account/tier specific (commonly 100 requests/10 seconds for many endpoints, but check current limits). **Endpoint:** form definitions: `GET https://api.hubapi.com/marketing/v3/forms`; submissions: `POST https://api.hsforms.com/submissions/v3/integration/submit/{portalId}/{formGuid}`; CRM records are separate. **Data:** form definitions/configuration and authorized submission/contact data. **Restrictions:** public submission endpoint is not authorization to export contacts; consent, privacy and portal scopes apply. **Sandbox:** HubSpot developer test accounts. **OAuth:** `https://app.hubspot.com/oauth/authorize`; `https://api.hubapi.com/oauth/v1/token`.

## Primary documentation and validation links

Use these as the authoritative update point before implementing; endpoint and rate-limit changes are common.

* LinkedIn: <https://learn.microsoft.com/linkedin/shared/authentication/authorization-code-flow> and <https://learn.microsoft.com/linkedin/>.
* Google Jobs structured data: <https://developers.google.com/search/docs/appearance/structured-data/job-posting>; Google Forms: <https://developers.google.com/workspace/forms/api/guides/authorizing>.
* Jooble: <https://jooble.org/api/about>; Arbeitnow: <https://www.arbeitnow.com/api/job-board-api>; Remotive: <https://remotive.com/api-documentation>; Remote OK: <https://remoteok.com/api>.
* Freelancer: <https://developers.freelancer.com/>; Upwork: <https://developer.upwork.com/>.
* Greenhouse Job Board/Harvest: <https://developers.greenhouse.io/job-board.html> and <https://developers.greenhouse.io/harvest.html>; Lever: <https://github.com/lever/postings-api>; Ashby: <https://developers.ashbyhq.com/>; SmartRecruiters: <https://developers.smartrecruiters.com/>.
* Workday: <https://community.workday.com/> (customer login); Bullhorn: <https://bullhorn.github.io/rest-api-docs/>; SAP SuccessFactors: <https://help.sap.com/docs/SAP_SUCCESSFACTORS_HXM_SUITE>; Oracle HCM: <https://docs.oracle.com/en/cloud/saas/human-resources/>; Workable: <https://workable.readme.io/>.
* Zoho Recruit/Forms: <https://www.zoho.com/recruit/developer-guide/apiv2/> and <https://www.zoho.com/forms/help/api/>; Recruitee: <https://docs.recruitee.com/>; Personio: <https://developer.personio.de/>; JazzHR: <https://www.jazzhr.com/api/>.
* SurveyMonkey: <https://developer.surveymonkey.com/api/v3/>; Typeform: <https://www.typeform.com/developers/>; Jotform: <https://api.jotform.com/docs/>; Qualtrics: <https://www.qualtrics.com/support/integrations/api-integration/>; HubSpot: <https://developers.hubspot.com/docs/api/working-with-oauth>.

## Practical conclusion

Only a small subset of the named consumer job boards offers a supported public search interface (notably Jooble, Arbeitnow, Remotive and Remote OK). The public ATS job-board endpoints are useful **per employer**, not as a single marketplace. Most remaining “job platforms” must be handled through a licensed partner program or omitted. For every OAuth integration, register a distinct application, use exact redirect URI matching and PKCE, request least privilege, store refresh tokens encrypted server-side, obey tenant/data-residency requirements, and build rate-limit backoff/caching before production.
