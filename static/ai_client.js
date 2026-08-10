/** Client helpers for the server-side NVIDIA NIM integration. */
const NEXJOBS_AI_HISTORY_KEY = 'nexjobs_ai_chat_history';

async function callAI(type, payload = {}) {
  const response = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, payload }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'The AI service is unavailable. Please try again.');
  return body.data;
}
function parseResumeWithAI(text) { return callAI('parse_resume', { resumeText: text }); }
function chatWithAI(message, history) { return callAI('chat_search', { userMessage: message, chatHistory: history }); }
function generateCoverLetter(resume, job) { return callAI('generate_cover_letter', { resumeData: resume, jobDescription: job.description || job.jobDescription || '', companyName: job.companyName || job.company || '' }); }
function optimizeProfile(resume, goal) { return callAI('optimize_profile', { resumeData: resume, goal }); }
function getAIChatHistory() { try { return JSON.parse(localStorage.getItem(NEXJOBS_AI_HISTORY_KEY)) || []; } catch (_) { return []; } }
function saveAIChatHistory(history) { localStorage.setItem(NEXJOBS_AI_HISTORY_KEY, JSON.stringify((history || []).slice(-20))); }
function setAILoading(button, loading, label) { if (!button) return; if (loading) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${label || 'Working...'}`; } else { button.disabled = false; button.innerHTML = button.dataset.label || button.innerHTML; } }
window.callAI = callAI; window.parseResumeWithAI = parseResumeWithAI; window.chatWithAI = chatWithAI; window.generateCoverLetter = generateCoverLetter; window.optimizeProfile = optimizeProfile; window.getAIChatHistory = getAIChatHistory; window.saveAIChatHistory = saveAIChatHistory; window.setAILoading = setAILoading;
