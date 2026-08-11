import type { AnalysisResult } from './types';

const ANALYSIS_STORAGE_KEY = 'peopulse:lastAnalysis';

export function saveAnalysisResult(result: AnalysisResult) {
  try {
    sessionStorage.setItem(ANALYSIS_STORAGE_KEY, JSON.stringify(result));
  } catch (err) {
    console.warn('Could not save analysis to sessionStorage:', err);
  }
}

export function loadAnalysisResult(): AnalysisResult | null {
  try {
    const raw = sessionStorage.getItem(ANALYSIS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AnalysisResult) : null;
  } catch (err) {
    console.warn('Could not load analysis from sessionStorage:', err);
    return null;
  }
}
