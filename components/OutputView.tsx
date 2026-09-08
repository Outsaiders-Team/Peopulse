// @ts-nocheck
'use client';
import SaveButton from '@/components/SaveButton';
import ExportPdfButton from '@/components/ExportPdfButton';

import type { AnalysisResult } from '@/lib/types';
import { PointItems } from './PointItems';
import { QuestionAccordionItem } from './QuestionAccordionItem';

export function OutputView({
  analysis,
  isAlreadySaved,
  onNewFile,
  onSaveSuccess,
}: {
  analysis: AnalysisResult;
  isAlreadySaved?: boolean;
  onNewFile: () => void;
  onSaveSuccess?: (newId?: string) => void;
}) {
  const filename = analysis?.filename || 'Untitled Analysis';
  const rows = analysis?.rows_detected ?? 0;

  const payload = analysis?.analysis ?? analysis ?? {};
  const topThemes = payload.top_themes ?? [];
  const questions = payload.questions ?? [];
  const suggestions = payload.suggestions;
  const ratingMetrics = payload.rating_metrics || [];

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
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                }}
              >
                <SaveButton
                  analysisPayload={analysis}
                  isAlreadySaved={isAlreadySaved}
                  onSaveSuccess={onSaveSuccess}
                />
                <ExportPdfButton analysis={analysis} />
                <button
                  type="button"
                  className="btn-ghost btn-ghost--outline"
                  onClick={onNewFile}
                >
                  New file
                </button>
              </div>
            </header>

            {/* Quantitative Scorecards */}
            {ratingMetrics.length > 0 && (
              <section style={{ marginBottom: '24px' }}>
                <h2 className="section-label" style={{ marginBottom: '12px' }}>
                  Numerical Ratings
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  {ratingMetrics.map((rm: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '16px',
                        borderRadius: '12px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, marginBottom: '6px' }}>
                        {rm.question}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
                          {rm.average}
                        </span>
                        <span style={{ color: '#f59e0b', fontSize: '18px' }}>★</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                          / 5.0 ({rm.count} {rm.count === 1 ? 'rating' : 'ratings'})
                        </span>
                      </div>
                      {rm.breakdown && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '10px' }}>
                          {[5, 4, 3, 2, 1].map((star) => (
                            <div key={star} style={{ flex: 1, textAlign: 'center' }}>
                              <div
                                style={{
                                  height: '4px',
                                  borderRadius: '2px',
                                  background: rm.breakdown[star] ? '#3b82f6' : '#e2e8f0',
                                  marginBottom: '2px',
                                }}
                              />
                              <span style={{ fontSize: '9px', color: '#64748b' }}>
                                {star}★
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

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