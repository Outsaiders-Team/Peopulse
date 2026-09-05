import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import type { AnalysisPayload } from './types';

const GEMINI_MODEL = 'gemini-3.5-flash-lite';

const FREE_MODELS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'inclusionai/ling-3.0-flash:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
];

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

/**
 * Optimized: Feeds a concise, compressed summary to the recommendations prompt
 * instead of duplicating verbose sub-lists, drastically cutting prompt processing time.
 */
function buildRecommendationsUserContent(
  analysis: AnalysisPayload,
  rowsDetected: number
): string {
  const themes = analysis.top_themes.map((t) => `- [${t.sentiment}] ${t.text}`).join('\n');
  const questionsSummary = analysis.questions
    .map(
      (q) => `Q: "${q.question}"
Summary: ${q.summary}
Key Points: ${q.heard_often.slice(0, 3).map((p) => p.text).join('; ')}`
    )
    .join('\n---\n');

  return `Feedback entries: ${rowsDetected}
Top Themes:
${themes}

Per-Question Insights:
${questionsSummary}

Provide concise, high-impact, actionable recommendations for an LGU.`;
}

/**
 * Direct Gemini fetch with disabled thinking budget for zero-latency starts.
 */
async function callGeminiDirect(
  systemPrompt: string,
  userContent: string,
  maxOutputTokens = 2048,
  responseMimeType?: string
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is missing');
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Lower temperature yields faster token convergence
        maxOutputTokens,
        ...(responseMimeType ? { responseMimeType } : {}),
        // Disable internal thinking phase to begin immediate output streaming
        thinkingConfig: {
          thinkingLevel: "MINIMAL",
        },
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API HTTP ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini API returned an empty or malformed completion');
  }

  return text;
}

async function callOpenRouterFallback(
  systemPrompt: string,
  userContent: string,
  model: string,
  max_tokens = 2048
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is missing');
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
  });

  const response = await client.chat.completions.create({
    model,
    max_tokens,
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  });

  return response.choices[0]?.message?.content ?? '';
}

export async function analyzeFeedback(
  feedbackByQuestion: Record<string, string[]>,
  attempt = 0
): Promise<string> {
  const systemPrompt = loadSystemPrompt();
  const userContent = buildUserContent(feedbackByQuestion);

  console.log(`[LLM Engine] [Attempt ${attempt}] Triggering Primary: Google Gemini (${GEMINI_MODEL})...`);
  try {
    // 2048 tokens max for analysis
    const rawResult = await callGeminiDirect(systemPrompt, userContent, 2048, 'application/json');
    console.log(`\x1b[32m✔ [LLM Engine] Analysis resolved via Primary: Google Gemini (${GEMINI_MODEL})\x1b[0m`);
    return rawResult;
  } catch (geminiErr) {
    const geminiErrorMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
    console.warn(
      `\x1b[33m⚠ [LLM Engine] Primary Gemini failed: "${geminiErrorMsg}". Falling back to OpenRouter...\x1b[0m`
    );

    const fallbackModel = FREE_MODELS[attempt % FREE_MODELS.length];
    console.log(`[LLM Engine] Triggering Fallback: OpenRouter (${fallbackModel})...`);

    try {
      const rawResult = await callOpenRouterFallback(systemPrompt, userContent, fallbackModel, 2048);
      console.log(`\x1b[32m✔ [LLM Engine] Analysis resolved via Fallback: OpenRouter (${fallbackModel})\x1b[0m`);
      return rawResult;
    } catch (fallbackErr) {
      const fallbackErrorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error(`\x1b[31m✖ [LLM Engine] Both Primary and Fallback failed.\x1b[0m`);

      return JSON.stringify({
        error: `(lib/llm.ts) Both models failed. Gemini: [${geminiErrorMsg}] | OpenRouter [${fallbackModel}]: [${fallbackErrorMsg}]`,
      });
    }
  }
}

export async function generateRecommendations(
  analysis: AnalysisPayload,
  rowsDetected: number,
  attempt = 0
): Promise<string> {
  const systemPrompt = loadRecommendationsPrompt();
  const userContent = buildRecommendationsUserContent(analysis, rowsDetected);

  console.log(`[LLM Engine] Triggering Primary for Recommendations: Google Gemini (${GEMINI_MODEL})...`);
  try {
    // Recommendations only need ~1024 tokens max
    const rawResult = await callGeminiDirect(systemPrompt, userContent, 1024, 'application/json');
    console.log(`\x1b[32m✔ [LLM Engine] Recommendations generated via Gemini (${GEMINI_MODEL})\x1b[0m`);
    return rawResult;
  } catch (geminiErr) {
    const geminiErrorMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr);
    console.warn(
      `\x1b[33m⚠ [LLM Engine] Gemini recommendations failed: "${geminiErrorMsg}". Falling back to OpenRouter...\x1b[0m`
    );

    const fallbackModel = FREE_MODELS[attempt % FREE_MODELS.length];
    try {
      const rawResult = await callOpenRouterFallback(systemPrompt, userContent, fallbackModel, 1024);
      console.log(`\x1b[32m✔ [LLM Engine] Recommendations generated via OpenRouter (${fallbackModel})\x1b[0m`);
      return rawResult;
    } catch (fallbackErr) {
      const fallbackErrorMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      return JSON.stringify({
        error: `(lib/llm.ts) Recommendations failed. Gemini: [${geminiErrorMsg}] | OpenRouter: [${fallbackErrorMsg}]`,
      });
    }
  }
}