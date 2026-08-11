'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UploadView } from './UploadView';
import { OutputView } from './OutputView';
import { useToast } from './ToastProvider';
import { uploadCsv } from '@/lib/api-client';
import { loadAnalysisResult, saveAnalysisResult } from '@/lib/storage';
import { USE_SAMPLE_ANALYSIS, fetchSampleAnalysis } from '@/lib/sample-analysis';
import type { AnalysisResult } from '@/lib/types';

export function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestedView = searchParams.get('view') === 'output' ? 'output' : 'upload';
  const view = requestedView === 'output' && analysis ? 'output' : 'upload';

  // Rehydrate a previous result from sessionStorage (client-only, unavailable
  // during SSR) on refresh / back navigation.
  useEffect(() => {
    const stored = loadAnalysisResult();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from an external, client-only store
    if (stored) setAnalysis(stored);
    setRestored(true);
  }, []);

  // Guard: output view without a stored analysis forces the upload view.
  useEffect(() => {
    if (restored && requestedView === 'output' && !analysis) {
      router.replace('/');
    }
  }, [restored, requestedView, analysis, router]);

  useEffect(() => {
    document.body.dataset.view = view;
    window.scrollTo(0, 0);
  }, [view]);

  const runAnalysis = useCallback(
    async (file: File | null) => {
      if (!file && !USE_SAMPLE_ANALYSIS) {
        showToast('Please select a CSV file first');
        return;
      }

      setLoading(true);
      try {
        const result = file ? await uploadCsv(file) : await fetchSampleAnalysis();
        saveAnalysisResult(result);
        setAnalysis(result);
        router.push('?view=output');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Analysis failed');
      } finally {
        setLoading(false);
      }
    },
    [router, showToast]
  );

  const handleNewFile = useCallback(() => {
    router.push('/');
  }, [router]);

  if (view === 'output' && analysis) {
    return <OutputView analysis={analysis} onNewFile={handleNewFile} />;
  }

  return <UploadView loading={loading} onAnalyze={runAnalysis} />;
}
