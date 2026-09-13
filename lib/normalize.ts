import type { AnalysisPayload, AnalysisPoint, Intensity, PulseTheme, QuestionAnalysis, Sentiment } from './types';

function toSentiment(value: unknown): Sentiment {
  return value === 'negative' ? 'negative' : 'positive';
}

function toIntensity(value: unknown): Intensity {
  return value === 'medium' || value === 'high' ? value : 'low';
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

function asPulseThemes(value: unknown): PulseTheme[] {
  if (!Array.isArray(value)) return [];

  const themes: PulseTheme[] = [];
  for (const item of value) {
    if (item == null || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const label = String(record.label ?? '').trim();
    const count = Number(record.count);
    if (!label || !Number.isFinite(count) || count <= 0) continue;

    const exampleResponses = Array.isArray(record.example_responses)
      ? record.example_responses.filter((response): response is string => typeof response === 'string').slice(0, 3)
      : [];
    themes.push({
      label,
      sentiment: toSentiment(record.sentiment),
      intensity: toIntensity(record.intensity),
      count: Math.round(count),
      share: 0,
      example_responses: exampleResponses,
    });
  }

  const totalCount = themes.reduce((sum, theme) => sum + theme.count, 0);
  return themes.map((theme) => ({ ...theme, share: totalCount ? theme.count / totalCount : 0 }));
}

/**
 * Normalizes model output into the shape the frontend renders: a handful of
 * overall themes, plus one summary block per question. Faithful port of
 * `backend/main.py::normalize_analysis_payload`.
 */
export function normalizeAnalysisPayload(payload: unknown): AnalysisPayload {
  if (payload == null || typeof payload !== 'object') {
    return { top_themes: [], questions: [], pulse_themes: [] };
  }

  const record = payload as Record<string, unknown>;
  const topThemes = asPointList(record.top_themes);
  const pulseThemes = asPulseThemes(record.pulse_themes);

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

  return { top_themes: topThemes, questions, pulse_themes: pulseThemes };
}
