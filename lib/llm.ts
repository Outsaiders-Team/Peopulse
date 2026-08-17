import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import type { AnalysisPayload } from './types';

// Rotate across a few free models — if one is queued/rate-limited on a given
// attempt, the next retry tries a different one instead of hammering the
// same congested model. Order = preference; put your best-performing ones first.
const FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

// Free-tier requests can hang far longer than a paid model would. Cap each
// individual attempt so a stuck request fails fast and the retry loop in
// the route handler can move on to the next model instead of stalling.
const REQUEST_TIMEOUT_MS = 15_000;

let promptCache: string | null = null;
let recommendationsPromptCache: string | null = null;

function loadSystemPrompt(): string {
  if (promptCache) return promptCache;
  const promptPath = path.join(process.cwd(), 'prompts', 'llm_prompt.md');
  try {
    promptCache = fs.readFileSync(promptPath, 'utf-8');
    return promptCache;
  } catch {
    throw new Error(`Prompt file not found at path: ${promptPath}`);
  }
}

function loadRecommendationsPrompt(): string {
  if (recommendationsPromptCache) return recommendationsPromptCache;
  const promptPath = path.join(process.cwd(), 'prompts', 'recommendations_prompt.md');
  try {
    recommendationsPromptCache = fs.readFileSync(promptPath, 'utf-8');
    return recommendationsPromptCache;
  } catch {
    throw new Error(`Recommendations prompt file not found at path: ${promptPath}`);
  }
}

function buildUserContent(feedbackByQuestion: Record<string, string[]>): string {
  const sections = Object.entries(feedbackByQuestion).map(
    ([question, responses]) => `Question: ${question}\nResponses: ${responses.join(' | ')}`
  );
  return `Here is the raw citizen feedback, grouped by question:\n\n${sections.join('\n\n')}`;
}

function buildRecommendationsUserContent(
  analysis: AnalysisPayload,
  rowsDetected: number
): string {
  return `Based on the analysis of ${rowsDetected} citizen feedback entries, here is the structured analysis:

Top Themes:
${analysis.top_themes.map((t) => `- [${t.sentiment}] ${t.text}`).join('\n')}

Per-Question Breakdown:
${analysis.questions
  .map(
    (q) => `
Question: "${q.question}"
Summary: ${q.summary}
Heard Often:
${q.heard_often.map((p) => `  - [${p.sentiment}] ${p.text}`).join('\n')}
Also Worth Noting:
${q.also_worth_noting.map((p) => `  - [${p.sentiment}] ${p.text}`).join('\n') || '  (none)'}
`
  )
  .join('\n---\n')}

Please provide actionable recommendations for an LGU to address the issues and opportunities identified in this feedback.`;
}

/**
 * Sends grouped feedback to the LLM and returns the raw completion text.
 * Faithful port of `backend/services/llm_analytics.py::analyze_feedback`.
 * Network/API errors are swallowed and returned as a `{"error": "..."}`
 * JSON string so the caller's regex/JSON parsing + retry loop still applies;
 * only a missing prompt file throws (matches the Python config-error path).
 *
 * `attempt` selects which free model to use this round (round-robin over
 * FREE_MODELS) — pass the route handler's retry counter here so each retry
 * lands on a different model instead of re-hitting the one that just failed
 * or rate-limited.
 */
export async function analyzeFeedback(
  feedbackByQuestion: Record<string, string[]>,
  attempt = 0
): Promise<string> {
  const systemPrompt = loadSystemPrompt();
  const model = FREE_MODELS[attempt % FREE_MODELS.length];

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 4096,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildUserContent(feedbackByQuestion) },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({ error: `(lib/llm.ts) [${model}] API connection failed: ${message}` });
  }
}

/**
 * Generates recommendations based on the analysis results.
 * Uses the recommendations prompt and analysis data to generate actionable
 * suggestions for LGU program implementers.
 */
export async function generateRecommendations(
  analysis: AnalysisPayload,
  rowsDetected: number,
  attempt = 0
): Promise<string> {
  const systemPrompt = loadRecommendationsPrompt();
  const model = FREE_MODELS[attempt % FREE_MODELS.length];

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: REQUEST_TIMEOUT_MS,
  });

  try {
    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: buildRecommendationsUserContent(analysis, rowsDetected) },
      ],
    });

    return response.choices[0]?.message?.content ?? '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return JSON.stringify({
      error: `(lib/llm.ts) [${model}] API connection failed: ${message}`,
    });
  }
}