import type { AnalysisPayload, AnalysisPoint, QuestionAnalysis, Sentiment } from './types';

function toSentiment(value: unknown): Sentiment {
  return value === 'negative' ? 'negative' : 'positive';
}

/**
 * Normalizes heard_often / also_worth_noting / top_themes entries into
 * `{ text, sentiment }`. Legacy tolerance: plain strings coerce to
 * `sentiment: 'positive'`; invalid sentiment values fall back to 'positive'.
 */
function asPointList(value: unknown): AnalysisPoint[] {
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? [{ text, sentiment: 'positive' }] : [];
  }

  if (!Array.isArray(value)) return [];

  const points: AnalysisPoint[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const text = item.trim();
      if (text) points.push({ text, sentiment: 'positive' });
      continue;
    }
    if (item == null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const text = String(record.text ?? '').trim();
    if (!text) continue;
    points.push({ text, sentiment: toSentiment(record.sentiment) });
  }
  return points;
}

/**
 * Normalizes model output into the shape the frontend renders: a handful of
 * overall themes, plus one summary block per question. Faithful port of
 * `backend/main.py::normalize_analysis_payload`.
 */
export function normalizeAnalysisPayload(payload: unknown): AnalysisPayload {
  if (payload == null || typeof payload !== 'object') {
    return { top_themes: [], questions: [] };
  }

  const record = payload as Record<string, unknown>;
  const topThemes = asPointList(record.top_themes);

  const rawQuestions = Array.isArray(record.questions) ? record.questions : [];
  const questions: QuestionAnalysis[] = [];

  for (const item of rawQuestions) {
    if (item == null || typeof item !== 'object') continue;
    const q = item as Record<string, unknown>;
    if (!q.question) continue;

    questions.push({
      question: String(q.question),
      summary: String(q.summary ?? ''),
      heard_often: asPointList(q.heard_often),
      also_worth_noting: asPointList(q.also_worth_noting),
    });
  }

  return { top_themes: topThemes, questions };
}
