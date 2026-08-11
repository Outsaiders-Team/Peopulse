import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

const MODEL = 'inclusionai/ling-3.0-flash:free';

let promptCache: string | null = null;

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

function buildUserContent(feedbackByQuestion: Record<string, string[]>): string {
  const sections = Object.entries(feedbackByQuestion).map(
    ([question, responses]) => `Question: ${question}\nResponses: ${responses.join(' | ')}`
  );
  return `Here is the raw citizen feedback, grouped by question:\n\n${sections.join('\n\n')}`;
}

/**
 * Sends grouped feedback to the LLM and returns the raw completion text.
 * Faithful port of `backend/services/llm_analytics.py::analyze_feedback`.
 * Network/API errors are swallowed and returned as a `{"error": "..."}`
 * JSON string so the caller's regex/JSON parsing + retry loop still applies;
 * only a missing prompt file throws (matches the Python config-error path).
 */
export async function analyzeFeedback(feedbackByQuestion: Record<string, string[]>): Promise<string> {
  const systemPrompt = loadSystemPrompt();

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  });

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
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
    return JSON.stringify({ error: `(lib/llm.ts) API connection failed: ${message}` });
  }
}
