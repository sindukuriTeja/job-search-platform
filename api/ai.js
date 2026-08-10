/**
 * NVIDIA NIM-powered career AI endpoint.
 * The key is intentionally read only from NVIDIA_API_KEY at runtime.
 */
const axios = require('axios');

const NIM_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-70b-instruct';

function cleanJson(value) {
  if (typeof value !== 'string') return value;
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = (fenced ? fenced[1] : value).trim();
  try { return JSON.parse(candidate); } catch (_) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error('The AI returned an invalid JSON response. Please try again.');
  }
}

async function ask(system, user, { json = false, temperature = 0.35 } = {}) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new Error('NVIDIA AI is not configured. Set NVIDIA_API_KEY in the server environment.');
  try {
    const response = await axios.post(NIM_URL, {
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature,
      max_tokens: 1800,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 45000 });
    const content = response.data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('NVIDIA NIM returned an empty response.');
    return json ? cleanJson(content) : content.trim();
  } catch (error) {
    const detail = error.response?.data?.error?.message || error.message;
    console.error('NVIDIA NIM request failed:', detail);
    throw new Error(`AI request failed: ${detail}`);
  }
}

async function aiParseResume(resumeText) {
  if (!resumeText?.trim()) throw new Error('Resume text is required.');
  return ask(
    'You are a precise resume parser. Return ONLY valid JSON. Do not invent facts. Use empty strings, empty arrays, or 0 where unavailable. experience_level must be fresher, junior, mid, or senior.',
    `Parse this resume into exactly this schema: {"name":"","email":"","phone":"","location":"","skills":[],"experience_years":0,"experience_level":"fresher","education":[],"certifications":[],"projects":[],"summary":"","suggested_job_titles":[],"suggested_industries":[]}\n\nRESUME:\n${resumeText.slice(0, 18000)}`,
    { json: true, temperature: 0.15 }
  );
}

async function aiMatchJobs(resumeData, jobs) {
  if (!resumeData || !Array.isArray(jobs)) throw new Error('Resume data and a jobs array are required.');
  return ask(
    'You are a job-matching analyst. Return ONLY JSON in the form {"jobs":[...]}. For every input job return one item, retaining its index, with match_score (integer 0-100) and explanation (brief, factual). Sort jobs by descending match_score. Never fabricate qualifications.',
    `RESUME:\n${JSON.stringify(resumeData)}\n\nJOBS (each job has an index):\n${JSON.stringify(jobs.slice(0, 40).map((job, index) => ({ index, ...job })))}`,
    { json: true, temperature: 0.2 }
  );
}

async function aiChatSearch(userMessage, chatHistory = []) {
  if (!userMessage?.trim()) throw new Error('A search message is required.');
  const safeHistory = Array.isArray(chatHistory) ? chatHistory.slice(-10).map(({ role, content }) => ({ role, content })) : [];
  return ask(
    'You are NexJobs, a helpful job-search assistant. Return ONLY JSON: {"response":"helpful concise reply","search_intent":{"keywords":[],"skills":[],"location":"","experience_level":"fresher|junior|mid|senior|any","job_titles":[],"work_preference":"remote|hybrid|onsite|any"}}. Extract only supported intent; ask a short follow-up in response when important information is missing.',
    JSON.stringify({ chat_history: safeHistory, user_message: userMessage }),
    { json: true, temperature: 0.35 }
  );
}

async function aiGenerateCoverLetter(resumeData, jobDescription, companyName) {
  if (!resumeData || !jobDescription?.trim()) throw new Error('Resume data and job description are required.');
  return ask(
    'You write concise, authentic, professional cover letters. Do not make up experience, metrics, company facts, or contact details. Return only the finished letter, with a greeting and closing.',
    `Candidate resume data:\n${JSON.stringify(resumeData)}\n\nCompany: ${companyName || 'the hiring company'}\n\nJob description:\n${jobDescription.slice(0, 12000)}`,
    { temperature: 0.55 }
  );
}

async function aiOptimizeProfile(resumeData, goal) {
  if (!resumeData || !goal?.trim()) throw new Error('Resume data and an optimization goal are required.');
  return ask(
    'You are an expert career writer. Improve the provided profile strictly from the supplied facts. Return only polished ready-to-use text. Be concise and professional.',
    `Goal: ${goal}\n\nResume data:\n${JSON.stringify(resumeData)}`,
    { temperature: 0.5 }
  );
}

async function processRequest(body) {
  const { type, payload = {} } = body || {};
  switch (type) {
    case 'parse_resume': return aiParseResume(payload.resumeText || payload.text);
    case 'match_jobs': return aiMatchJobs(payload.resumeData || payload.resume, payload.jobs);
    case 'chat_search': return aiChatSearch(payload.userMessage || payload.message, payload.chatHistory || payload.history);
    case 'generate_cover_letter': return aiGenerateCoverLetter(payload.resumeData || payload.resume, payload.jobDescription, payload.companyName);
    case 'optimize_profile': return aiOptimizeProfile(payload.resumeData || payload.resume, payload.goal);
    default: throw new Error('Invalid AI operation type.');
  }
}

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try { return res.status(200).json({ data: await processRequest(req.body) }); }
  catch (error) { return res.status(500).json({ error: error.message }); }
}

// Vercel uses the default export. handler supports the project’s existing Netlify-style API pattern.
module.exports = handler;
module.exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: JSON.stringify({ error: 'Method not allowed' }) };
  try { return { statusCode: 200, headers: cors, body: JSON.stringify({ data: await processRequest(JSON.parse(event.body || '{}')) }) }; }
  catch (error) { return { statusCode: 500, headers: cors, body: JSON.stringify({ error: error.message }) }; }
};
module.exports.aiParseResume = aiParseResume;
module.exports.aiMatchJobs = aiMatchJobs;
module.exports.aiChatSearch = aiChatSearch;
module.exports.aiGenerateCoverLetter = aiGenerateCoverLetter;
module.exports.aiOptimizeProfile = aiOptimizeProfile;
