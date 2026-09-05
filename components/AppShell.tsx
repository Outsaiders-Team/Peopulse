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
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [session, setSession] = useState<any>(null);

  const requestedView = searchParams.get('view') === 'output' ? 'output' : 'upload';
  const view = requestedView === 'output' && analysis ? 'output' : 'upload';

  const fetchHistory = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session: activeSession },
    } = await supabase.auth.getSession();
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
  }, []);

  // Hydrate local cache and check for pending saves from OAuth redirects
  useEffect(() => {
    const stored = loadAnalysisResult();
    if (stored) setAnalysis(stored);
    setRestored(true);

    const processPendingSave = async () => {
      const pendingData = sessionStorage.getItem('pendingAnalysis');
      if (!pendingData) {
        fetchHistory();
        return;
      }

      const supabase = createClient();
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();

      if (activeSession) {
        const payload = JSON.parse(pendingData);
        const { error } = await supabase.from('analyses').insert({
          user_id: activeSession.user.id,
          payload: payload,
        });

        if (!error) {
          sessionStorage.removeItem('pendingAnalysis');
          showToast('Your pending analysis has been saved to your account.');
          fetchHistory();
        }
      } else {
        fetchHistory();
      }
    };

    processPendingSave();
  }, [fetchHistory, showToast]);

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
        setActiveAnalysisId(null);
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
    setActiveAnalysisId(null);
    router.push('/');
  }, [router]);

  const handleHistorySelect = useCallback(
    (item: any) => {
      saveAnalysisResult(item.payload);
      setAnalysis(item.payload);
      setActiveAnalysisId(item.id);
      router.push('?view=output');
    },
    [router]
  );

  const handleDeleteSuccess = useCallback(
    (deletedId: string) => {
      setHistory((prev) => prev.filter((item) => item.id !== deletedId));
      if (activeAnalysisId === deletedId) {
        setActiveAnalysisId(null);
        router.push('/');
      }
    },
    [activeAnalysisId, router]
  );

  const isAlreadySaved =
    Boolean(activeAnalysisId) ||
    Boolean(
      analysis &&
        history.some(
          (h) =>
            h.payload?.filename === analysis?.filename &&
            h.payload?.rows_detected === analysis?.rows_detected
        )
    );

  return (
    <div style={{ display: 'flex', width: '100vw', minHeight: '100vh', overflowX: 'hidden' }}>
      {session && (
        <HistorySidebar
          history={history}
          activeId={activeAnalysisId}
          onSelect={handleHistorySelect}
          onDeleteSuccess={handleDeleteSuccess}
        />
      )}

      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        {view === 'output' && analysis ? (
          <OutputView
            analysis={analysis}
            isAlreadySaved={isAlreadySaved}
            onNewFile={handleNewFile}
            onSaveSuccess={fetchHistory}
          />
        ) : (
          <UploadView loading={loading} onAnalyze={runAnalysis} />
        )}
      </main>
    </div>
  );
}