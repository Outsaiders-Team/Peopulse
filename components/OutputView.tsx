// @ts-nocheck
'use client';
import SaveButton from '@/components/SaveButton'

import type { AnalysisResult } from '@/lib/types';
import { PointItems } from './PointItems';
import { QuestionAccordionItem } from './QuestionAccordionItem';

export function OutputView({ analysis, onNewFile }: { analysis: AnalysisResult; onNewFile: () => void }) {
  const { filename, rows_detected: rows, analysis: payload } = analysis;
  const topThemes = payload.top_themes ?? [];
  const questions = payload.questions ?? [];
  const suggestions = payload.suggestions;

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
              <div style={{ display: 'flex', gap: '12px' }}>
                <SaveButton analysisPayload={analysis} />
                <button type="button" className="btn-ghost btn-ghost--outline" onClick={onNewFile}>
                  New file
                </button>
              </div>
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

            {suggestions && (
              <section className="suggestions-panel" aria-labelledby="suggestions-heading">
                <h2 id="suggestions-heading" className="section-label">
                  Recommendations for your program
                </h2>
                <div className="suggestions-content">
                  {suggestions.overall_assessment && (
                    <div className="suggestion-block">
                      <h3 className="suggestion-subtitle">Overall Assessment</h3>
                      <p className="suggestion-text">{suggestions.overall_assessment}</p>
                    </div>
                  )}

                  {suggestions.key_issue && (
                    <div className="suggestion-block">
                      <h3 className="suggestion-subtitle">Key Issue/Opportunity</h3>
                      <p className="suggestion-text-bold">{suggestions.key_issue.title}</p>
                      <p className="suggestion-text">{suggestions.key_issue.explanation}</p>
                    </div>
                  )}

                  {suggestions.recommendations && suggestions.recommendations.length > 0 && (
                    <div className="suggestion-block">
                      <h3 className="suggestion-subtitle">Recommended Actions</h3>
                      <ul className="recommendations-list">
                        {suggestions.recommendations.map((rec, idx) => (
                          <li key={idx} className="recommendation-item">
                            <div className="recommendation-priority">
                              Priority {rec.priority}
                            </div>
                            <div className="recommendation-content">
                              <p className="recommendation-action">
                                <strong>{rec.action}</strong>
                              </p>
                              <p className="recommendation-reason">
                                <strong>Why:</strong> {rec.reason}
                              </p>
                              <p className="recommendation-meta">
                                <strong>Timeframe:</strong> {rec.timeframe} | <strong>Target:</strong> {rec.target}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {suggestions.monitoring_metrics && suggestions.monitoring_metrics.length > 0 && (
                    <div className="suggestion-block">
                      <h3 className="suggestion-subtitle">Metrics to Monitor</h3>
                      <ul className="metrics-list">
                        {suggestions.monitoring_metrics.map((metric, idx) => (
                          <li key={idx}>{metric}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {suggestions.data_limitations && suggestions.data_limitations.length > 0 && (
                    <div className="suggestion-block">
                      <h3 className="suggestion-subtitle">Data Limitations</h3>
                      <ul className="limitations-list">
                        {suggestions.data_limitations.map((limitation, idx) => (
                          <li key={idx}>{limitation}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            )}
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
