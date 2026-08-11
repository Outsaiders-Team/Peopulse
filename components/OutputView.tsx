import type { AnalysisResult } from '@/lib/types';
import { PointItems } from './PointItems';
import { QuestionAccordionItem } from './QuestionAccordionItem';

export function OutputView({ analysis, onNewFile }: { analysis: AnalysisResult; onNewFile: () => void }) {
  const { filename, rows_detected: rows, analysis: payload } = analysis;
  const topThemes = payload.top_themes ?? [];
  const questions = payload.questions ?? [];

  return (
    <div className="page active" id="page-output">
      <div className="shell">
        <div className="sheet">
          <div className="sheet-output">
            <header className="page-head--row">
              <div>
                <h1 className="page-title">Here&rsquo;s your summary.</h1>
                <p className="page-sub" id="output-meta">
                  <span className="output-meta-file">{filename}</span>
                  <span className="output-meta-count">
                    {rows} feedback {rows === 1 ? 'entry' : 'entries'} analyzed
                  </span>
                </p>
              </div>
              <button type="button" className="btn-ghost btn-ghost--outline" onClick={onNewFile}>
                New file
              </button>
            </header>

            <section className="takeaway" aria-labelledby="themes-heading">
              <h2 id="themes-heading" className="section-label">
                What people said the most
              </h2>
              <ul className="theme-list" id="theme-list">
                <PointItems points={topThemes} emptyMessage="No overall themes were returned by the model." />
              </ul>
            </section>

            <section className="questions-panel" aria-labelledby="questions-heading">
              <h2 id="questions-heading" className="section-label">
                By question
              </h2>
              <div className="questions" id="questions-list">
                {questions.length ? (
                  questions.map((q, idx) => (
                    <QuestionAccordionItem key={idx} question={q} index={idx + 1} defaultOpen={idx === 0} />
                  ))
                ) : (
                  <p className="q-summary">No per-question analysis was returned by the model.</p>
                )}
              </div>
            </section>
          </div>
        </div>

        <footer className="output-footer" aria-label="Peopulse">
          <span className="brand-badge" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-badge-img" src="/assets/peopulse-mark.png" alt="" width={32} height={32} decoding="async" />
          </span>
          Peopulse
        </footer>
      </div>
    </div>
  );
}
