import type { CellValue, Table } from './parse';

export class DataPipelineError extends Error {}

const KEYWORDS = ['feedback', 'comment', 'remark', 'suggestion', 'description', 'message'];
const BLANK_VALUES = new Set(['', 'n/a', 'na', 'none', 'nil']);

function isMissing(value: CellValue): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function isNumericValue(value: CellValue): boolean {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed !== '' && !Number.isNaN(Number(trimmed));
  }
  return false;
}

/** Mirrors pandas: a column is object/string dtype unless every value parses as a number. */
function isTextColumn(values: CellValue[]): boolean {
  const nonNull = values.filter((v) => !isMissing(v));
  if (nonNull.length === 0) return false;
  return nonNull.some((v) => !isNumericValue(v));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Random sample without replacement, mirroring pandas' Series.sample(). */
function sampleArray<T>(items: T[], size: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  for (let i = 0; i < size && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(idx, 1)[0]);
  }
  return result;
}

/**
 * Identifies the most likely feedback column(s) in a parsed table.
 * Faithful port of `backend/services/data_pipeline.py::get_feedback_column`.
 */
export function getFeedbackColumns(table: Table): string[] {
  const feedbackCols: string[] = [];

  for (const col of table.columns) {
    const values = table.columnValues.get(col) ?? [];
    if (!isTextColumn(values)) continue;

    const nonNull = values.filter((v) => !isMissing(v)).map((v) => String(v));
    if (nonNull.length === 0) continue;

    const sample = sampleArray(nonNull, Math.min(100, nonNull.length));

    let score = 0;

    const colLower = col.toLowerCase();
    if (KEYWORDS.some((k) => colLower.includes(k))) score += 50;

    const avgLen = mean(sample.map((s) => s.length));
    if (avgLen > 30) score += 20;
    else if (avgLen < 15) score -= 20;

    const uniquenessRatio = new Set(sample).size / sample.length;
    if (uniquenessRatio > 0.9) score += 20;
    else if (uniquenessRatio < 0.2) score -= 30;

    const avgSpaces = mean(sample.map((s) => (s.match(/ /g) || []).length));
    if (avgSpaces > 5) score += 10;

    if (score >= 40) feedbackCols.push(col);
  }

  return feedbackCols;
}

/**
 * Groups responses by question (one feedback column = one question).
 * Faithful port of `backend/services/data_pipeline.py::build_feedback_by_question`.
 */
export function buildFeedbackByQuestion(
  table: Table,
  feedbackCols: string[]
): Record<string, string[]> {
  if (!feedbackCols || feedbackCols.length === 0) {
    throw new DataPipelineError('No feedback columns identified to analyze.');
  }

  const byQuestion: Record<string, string[]> = {};

  for (const col of feedbackCols) {
    const values = table.columnValues.get(col) ?? [];
    const responses = values
      .filter((v) => !isMissing(v))
      .map((v) => String(v).trim())
      .filter((r) => !BLANK_VALUES.has(r.toLowerCase()));
    if (responses.length) byQuestion[col] = responses;
  }

  if (Object.keys(byQuestion).length === 0) {
    throw new DataPipelineError('Feedback columns were found, but all responses were empty.');
  }

  return byQuestion;
}
