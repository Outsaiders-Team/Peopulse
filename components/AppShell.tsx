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
import { createClient } from '@/utils/supabase/client';
import HistorySidebar from '@/components/HistorySidebar';

export function AppShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToast();

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // New state for Supabase auth and history
  const [history, setHistory] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);

  const requestedView = searchParams.get('view') === 'output' ? 'output' : 'upload';
  const view = requestedView === 'output' && analysis ? 'output' : 'upload';

  // 1. Existing local storage hydration
  useEffect(() => {
    const stored = loadAnalysisResult();
    if (stored) setAnalysis(stored);
    setRestored(true);
  }, []);

  // 2. New Supabase history fetch
  useEffect(() => {
    const fetchHistory = async () => {
      const supabase = createClient();
      
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      setSession(activeSession);

      if (activeSession) {
        const { data, error } = await supabase
          .from('analyses')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setHistory(data);
        }
      }
    };

    fetchHistory();
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

  // Handle clicking a past analysis from the sidebar
  const handleHistorySelect = useCallback((historicalPayload: AnalysisResult) => {
    saveAnalysisResult(historicalPayload); // Keep local storage in sync
    setAnalysis(historicalPayload);
    router.push('?view=output');
  }, [router]);

  // The return statement is refactored to wrap the views in a flex layout
  return (
    <div className="flex h-screen w-full">
      {session && (
        <HistorySidebar 
          history={history} 
          onSelect={handleHistorySelect} 
        />
      )}
      
      <main className="flex-1 overflow-y-auto">
        {view === 'output' && analysis ? (
          <OutputView analysis={analysis} onNewFile={handleNewFile} />
        ) : (
          <UploadView loading={loading} onAnalyze={runAnalysis} />
        )}
      </main>
    </div>
  );
}