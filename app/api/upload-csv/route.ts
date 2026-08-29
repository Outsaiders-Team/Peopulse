import { NextRequest, NextResponse } from 'next/server';
import { buildFeedbackByQuestion, DataPipelineError, getFeedbackColumns } from '@/lib/data-pipeline';
import { apiError } from '@/lib/api-error';
import { analyzeFeedback, generateRecommendations } from '@/lib/llm';
import { normalizeAnalysisPayload } from '@/lib/normalize';
import { parseCsv, parseXlsx } from '@/lib/parse';
import type { AnalysisResult } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ALLOWED_EXTENSIONS = new Set(['csv', 'xlsx', 'xls']);
const MAX_RETRIES = 5;
const JSON_OBJECT_RE = /\{[\s\S]*\}/;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Repairs commonly mangled LLM JSON (single quotes as delimiters, trailing commas).
 */
function sanitizeJsonString(str: string): string {
  return str
    .replace(/(?<=[:,\s\[{])\s*'([^'\\]*(?:\\.[^'\\]*)*)'\s*(?=[,:\]}])/g, '"$1"')
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

function safeParseJson(jsonString: string): unknown {
  try {
    return JSON.parse(jsonString);
  } catch {
    const sanitized = sanitizeJsonString(jsonString);
    return JSON.parse(sanitized);
  }
}

export async function POST(request: NextRequest) {
  console.time('Total Route Execution');

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    console.timeEnd('Total Route Execution');
    return apiError(400, 'Expected a multipart/form-data request with a "file" field.');
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    console.timeEnd('Total Route Execution');
    return apiError(400, 'No file was uploaded.');
  }

  const filename = file.name || '';
  const extension = filename.includes('.') ? filename.split('.').pop()!.toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    console.timeEnd('Total Route Execution');
    return apiError(400, 'Invalid file type. Please upload a CSV, XLSX, or XLS file.');
  }

  console.time('File Parsing & Data Pipeline');
  let table;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    table = extension === 'csv' ? parseCsv(buffer.toString('utf-8')) : parseXlsx(buffer);
  } catch (err) {
    console.timeEnd('File Parsing & Data Pipeline');
    console.timeEnd('Total Route Execution');
    const message = err instanceof Error ? err.message : String(err);
    return apiError(400, `Failed to read file: ${message}`);
  }

  let feedbackByQuestion: Record<string, string[]>;
  try {
    const feedbackColumns = getFeedbackColumns(table);
    feedbackByQuestion = buildFeedbackByQuestion(table, feedbackColumns);
  } catch (err) {
    console.timeEnd('File Parsing & Data Pipeline');
    console.timeEnd('Total Route Execution');
    if (err instanceof DataPipelineError) return apiError(400, err.message);
    const message = err instanceof Error ? err.message : String(err);
    return apiError(400, `Failed to process the file's feedback columns: ${message}`);
  }
  console.timeEnd('File Parsing & Data Pipeline');

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    console.log(`\n--- Processing Attempt ${attempt + 1}/${MAX_RETRIES} ---`);
    let rawResponse: string;

    console.time(`Attempt ${attempt + 1} - Step 1: analyzeFeedback`);
    try {
      rawResponse = await analyzeFeedback(feedbackByQuestion, attempt);
    } catch (err) {
      console.timeEnd(`Attempt ${attempt + 1} - Step 1: analyzeFeedback`);
      console.timeEnd('Total Route Execution');
      const message = err instanceof Error ? err.message : String(err);
      return apiError(500, `Server Configuration Error: ${message}`);
    }
    console.timeEnd(`Attempt ${attempt + 1} - Step 1: analyzeFeedback`);

    console.time(`Attempt ${attempt + 1} - Step 2: JSON Parsing & Validation`);
    const match = rawResponse.match(JSON_OBJECT_RE);
    const cleanJsonString = match ? match[0] : '{}';
    if (!match) {
      console.warn('WARNING: No JSON brackets found in the LLM response.');
    }

    let parsed: unknown;
    try {
      parsed = safeParseJson(cleanJsonString);
    } catch {
      console.timeEnd(`Attempt ${attempt + 1} - Step 2: JSON Parsing & Validation`);
      console.warn(`FAILED TO PARSE on attempt ${attempt + 1} of ${MAX_RETRIES}:`, cleanJsonString);
      if (attempt < MAX_RETRIES - 1) {
        await sleep(1000);
        continue;
      }
      console.timeEnd('Total Route Execution');
      return apiError(500, 'The LLM failed to return a valid JSON format.');
    }

    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      console.timeEnd(`Attempt ${attempt + 1} - Step 2: JSON Parsing & Validation`);
      const errorMessage = String((parsed as { error: unknown }).error);
      if (errorMessage.includes('429')) {
        console.warn(`Server busy. Retrying attempt ${attempt + 1} of ${MAX_RETRIES}...`);
        await sleep(5000);
        continue;
      }
      console.timeEnd('Total Route Execution');
      return apiError(502, errorMessage);
    }

    const analysisSource =
      parsed && typeof parsed === 'object' && 'analysis' in parsed
        ? (parsed as { analysis: unknown }).analysis
        : parsed;
    const normalizedAnalysis = normalizeAnalysisPayload(analysisSource);

    if (normalizedAnalysis.questions.length === 0) {
      console.timeEnd(`Attempt ${attempt + 1} - Step 2: JSON Parsing & Validation`);
      console.warn(`WARNING: Empty analysis on attempt ${attempt + 1} of ${MAX_RETRIES}. Retrying...`);
      continue;
    }
    console.timeEnd(`Attempt ${attempt + 1} - Step 2: JSON Parsing & Validation`);

    // Step 3: Generate recommendations with Gemini primary
    console.time(`Attempt ${attempt + 1} - Step 3: generateRecommendations`);
    let suggestionsResponse = '';
    try {
      suggestionsResponse = await generateRecommendations(normalizedAnalysis, table.rowCount, attempt);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Failed to generate recommendations: ${message}`);
    }
    console.timeEnd(`Attempt ${attempt + 1} - Step 3: generateRecommendations`);

    // Step 4: Parse recommendations with automatic sanitization
    let suggestions = undefined;
    if (suggestionsResponse) {
      try {
        const suggestionsMatch = suggestionsResponse.match(JSON_OBJECT_RE);
        const cleanSuggestionsJson = suggestionsMatch ? suggestionsMatch[0] : null;
        if (cleanSuggestionsJson) {
          suggestions = safeParseJson(cleanSuggestionsJson);
        }
      } catch (err) {
        console.warn('Failed to parse recommendations JSON:', err);
      }
    }

    console.timeEnd('Total Route Execution');

    return NextResponse.json<AnalysisResult>({
      status: 'success',
      filename,
      rows_detected: table.rowCount,
      analysis: {
        ...normalizedAnalysis,
        suggestions,
      },
    });
  }

  console.timeEnd('Total Route Execution');
  return apiError(
    502,
    'The analysis engine did not return a usable result after multiple attempts. Please try again.'
  );
}