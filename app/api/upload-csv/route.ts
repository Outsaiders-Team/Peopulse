import { NextRequest, NextResponse } from 'next/server';
import { buildFeedbackByQuestion, DataPipelineError, getFeedbackColumns } from '@/lib/data-pipeline';
import { apiError } from '@/lib/api-error';
import { analyzeFeedback } from '@/lib/llm';
import { normalizeAnalysisPayload } from '@/lib/normalize';
import { parseCsv, parseXlsx } from '@/lib/parse';
import type { AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs';
// Hobby plan max; bump if the project is on Pro/Enterprise.
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls']);
const MAX_RETRIES = 5;
const JSON_OBJECT_RE = /\{[\s\S]*\}/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError(400, 'Expected a multipart/form-data request with a "file" field.');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return apiError(400, 'No file was uploaded.');
  }

  const filename = file.name || '';
  const extension = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return apiError(400, 'Invalid file type. Please upload a CSV, XLSX, or XLS file.');
  }

  let table;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    table = extension === 'csv' ? parseCsv(buffer.toString('utf-8')) : parseXlsx(buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(400, `Failed to read file: ${message}`);
  }

  let feedbackByQuestion: Record<string, string[]>;
  try {
    const feedbackColumns = getFeedbackColumns(table);
    feedbackByQuestion = buildFeedbackByQuestion(table, feedbackColumns);
  } catch (err) {
    if (err instanceof DataPipelineError) return apiError(400, err.message);
    const message = err instanceof Error ? err.message : String(err);
    return apiError(400, `Failed to process the file's feedback columns: ${message}`);
  }

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let rawResponse: string;
    try {
      rawResponse = await analyzeFeedback(feedbackByQuestion);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return apiError(500, `Server Configuration Error: ${message}`);
    }

    const match = rawResponse.match(JSON_OBJECT_RE);
    const cleanJsonString = match ? match[0] : '{}';
    if (!match) {
      console.warn('WARNING: No JSON brackets found in the LLM response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanJsonString);
    } catch {
      console.warn(`FAILED TO PARSE on attempt ${attempt + 1} of ${MAX_RETRIES}:`, cleanJsonString);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000);
        continue;
      }
      return apiError(500, 'The LLM failed to return a valid JSON format.');
    }

    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      const errorMessage = String((parsed as { error: unknown }).error);
      if (errorMessage.includes('429')) {
        console.warn(`Server busy. Retrying attempt ${attempt + 1} of ${MAX_RETRIES}...`);
        await sleep(5000);
        continue;
      }
      return apiError(502, errorMessage);
    }

    const analysisSource =
      parsed && typeof parsed === 'object' && 'analysis' in parsed
        ? (parsed as { analysis: unknown }).analysis
        : parsed;
    const normalizedAnalysis = normalizeAnalysisPayload(analysisSource);

    if (normalizedAnalysis.questions.length === 0) {
      console.warn(`WARNING: Empty analysis on attempt ${attempt + 1} of ${MAX_RETRIES}. Retrying...`);
      continue;
    }

    return NextResponse.json<AnalysisResult>({
      status: 'success',
      filename,
      rows_detected: table.rowCount,
      analysis: normalizedAnalysis,
    });
  }

  return apiError(
    502,
    'The analysis engine did not return a usable result after multiple attempts. Please try again.'
  );
}
