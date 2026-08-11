import type { AnalysisResult, ApiErrorBody } from './types';

/** Same-origin API client — no base URL needed, the Route Handler lives in this app. */
export async function uploadCsv(file: File): Promise<AnalysisResult> {
  const form = new FormData();
  form.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/upload-csv', { method: 'POST', body: form });
  } catch {
    throw new Error('Could not reach the analysis server. Please try again.');
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const detail = (data as Partial<ApiErrorBody>).detail || res.statusText || 'Upload failed';
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return data as AnalysisResult;
}
