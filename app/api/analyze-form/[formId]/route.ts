import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeFeedback, generateRecommendations } from '@/lib/llm';
import type { AnalysisPayload } from '@/lib/types';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ formId: string }> }
) {
  try {
    const { formId } = await params;
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Fetch form info
    const { data: form, error: formErr } = await supabase
      .from('forms')
      .select('title')
      .eq('id', formId)
      .eq('user_id', session.user.id)
      .single();

    if (formErr || !form) {
      return NextResponse.json({ error: 'Form not found or unauthorized' }, { status: 404 });
    }

    // 2. Fetch questions
    const { data: questions, error: qErr } = await supabase
      .from('form_questions')
      .select('id, question_text, question_type, order_index')
      .eq('form_id', formId)
      .order('order_index', { ascending: true });

    if (qErr || !questions || questions.length === 0) {
      return NextResponse.json({ error: 'No questions found in this form' }, { status: 400 });
    }

    // 3. Fetch responses
    const { data: responses, error: rErr } = await supabase
      .from('form_responses')
      .select('question_id, response_value, submission_id')
      .eq('form_id', formId);

    if (rErr) {
      return NextResponse.json({ error: rErr.message }, { status: 500 });
    }

    if (!responses || responses.length === 0) {
      return NextResponse.json(
        { error: 'No responses have been submitted to this form yet.' },
        { status: 400 }
      );
    }

    const uniqueSubmissions = new Set(responses.map((r) => r.submission_id)).size;

    // 4. Compute Quantitative / Numerical Metrics
    const ratingMetrics: {
      question: string;
      average: number;
      count: number;
      breakdown: Record<number, number>;
    }[] = [];

    const feedbackByQuestion: Record<string, string[]> = {};

    for (const q of questions) {
      const qResponses = responses.filter(
        (r) => r.question_id === q.id && r.response_value && r.response_value.trim() !== ''
      );

      if (q.question_type === 'rating') {
        const numericValues = qResponses
          .map((r) => parseFloat(r.response_value))
          .filter((v) => !isNaN(v));

        if (numericValues.length > 0) {
          const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
          const avg = Number((sum / numericValues.length).toFixed(1));

          const breakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
          numericValues.forEach((val) => {
            const rounded = Math.round(val);
            if (breakdown[rounded] !== undefined) breakdown[rounded]++;
          });

          ratingMetrics.push({
            question: q.question_text,
            average: avg,
            count: numericValues.length,
            breakdown,
          });

          // Feed formatted rating context into the LLM
          feedbackByQuestion[q.question_text] = [
            `Average rating: ${avg}/5 across ${numericValues.length} reviews. (Breakdown: ${Object.entries(breakdown).map(([k, v]) => `${k}★: ${v}`).join(', ')})`
          ];
        }
      } else {
        const textAnswers = qResponses.map((r) => r.response_value.trim());
        if (textAnswers.length > 0) {
          feedbackByQuestion[q.question_text] = textAnswers;
        }
      }
    }

    if (Object.keys(feedbackByQuestion).length === 0) {
      return NextResponse.json(
        { error: 'No valid answers found to analyze.' },
        { status: 400 }
      );
    }

    // 5. Run LLM Engine
    const rawAnalysisString = await analyzeFeedback(feedbackByQuestion);
    const parsedAnalysis: AnalysisPayload = JSON.parse(rawAnalysisString);

    // 6. Run Recommendations Engine
    try {
      const rawRecs = await generateRecommendations(parsedAnalysis, uniqueSubmissions);
      parsedAnalysis.suggestions = JSON.parse(rawRecs);
    } catch (e) {
      console.warn('Failed to generate recommendations for live form:', e);
    }

    // 7. Inject quantitative metrics directly into the payload
    (parsedAnalysis as any).rating_metrics = ratingMetrics;

    const result = {
      filename: `${form.title} (Live Form)`,
      rows_detected: uniqueSubmissions,
      analysis: parsedAnalysis,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error analyzing form:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}