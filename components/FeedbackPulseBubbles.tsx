'use client';

import { useEffect, useRef, useState } from 'react';
import type { PulseTheme } from '@/lib/types';
import { CheckIcon, XIcon } from './icons';

const positions = [
  [8, 18],
  [39, 8],
  [68, 23],
  [24, 57],
  [55, 58],
  [82, 62],
  [4, 73],
  [42, 78],
  [70, 78],
];

function formatShare(share: number) {
  return `${Math.round(share * 100)}%`;
}

export function FeedbackPulseBubbles({ themes, totalResponses }: { themes: PulseTheme[]; totalResponses: number }) {
  const [selected, setSelected] = useState<PulseTheme | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const maxCount = Math.max(...themes.map((theme) => theme.count), 1);
  const minCount = Math.min(...themes.map((theme) => theme.count), maxCount);

  useEffect(() => {
    if (!selected) return;
    previousFocus.current = document.activeElement as HTMLElement;
    const focusable = modalRef.current?.querySelector<HTMLElement>('[data-modal-close]');
    focusable?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'Tab') {
        event.preventDefault();
        focusable?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocus.current?.focus();
    };
  }, [selected]);

  function bubbleSize(count: number) {
    const spread = maxCount === minCount ? 1 : (count - minCount) / (maxCount - minCount);
    return 92 + spread * 78;
  }

  return (
    <section className="pulse-bubbles takeaway" aria-labelledby="pulse-heading">
      <h2 id="pulse-heading" className="section-label">Citizen Feedback Pulse</h2>
      <p className="page-sub pulse-subtitle">What citizens are saying most frequently</p>
      <div className="pulse-stage" aria-label={`${themes.length} feedback themes from ${totalResponses} responses`}>
        {themes.map((theme, index) => {
          const size = bubbleSize(theme.count);
          const [left, top] = positions[index % positions.length];
          const sentimentLabel = theme.sentiment === 'negative' ? 'Negative' : 'Positive';
          return (
            <button
              key={`${theme.label}-${index}`}
              type="button"
              className={`pulse-bubble pulse-bubble--${theme.sentiment} pulse-bubble--${theme.intensity}`}
              style={{ width: size, height: size, left: `${left}%`, top: `${top}%` }}
              onClick={() => setSelected(theme)}
              aria-label={`${theme.label}, ${theme.count} responses, ${formatShare(theme.share)}, ${sentimentLabel} sentiment, ${theme.intensity} intensity`}
            >
              <span className="pulse-bubble-label">{theme.label}</span>
              <span className="pulse-bubble-count">{theme.count}</span>
              <span className="pulse-tooltip" role="tooltip">
                {theme.label} · {theme.count} responses · {formatShare(theme.share)} · {sentimentLabel} · {theme.intensity} intensity
              </span>
            </button>
          );
        })}
      </div>
      <div className="pulse-legend" aria-label="Pulse chart legend">
        <span><strong>Bubble size</strong> frequency</span>
        <span><strong>Color</strong> sentiment</span>
        <span><strong>Outline/glow</strong> intensity</span>
      </div>

      {selected && (
        <div className="pulse-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}>
          <div className="pulse-modal-panel" role="dialog" aria-modal="true" aria-labelledby="pulse-modal-heading" ref={modalRef}>
            <button type="button" className="pulse-modal-close" data-modal-close onClick={() => setSelected(null)}>Close</button>
            <h3 id="pulse-modal-heading" className="q-title">{selected.label}</h3>
            <div className="pulse-modal-meta">
              <span>{selected.count} responses</span>
              <span>{formatShare(selected.share)} of pulse themes</span>
              <span className={`pulse-modal-sentiment pulse-modal-sentiment--${selected.sentiment}`}>
                {selected.sentiment === 'negative' ? <XIcon /> : <CheckIcon />}
                {selected.sentiment} sentiment
              </span>
              <span>{selected.intensity} intensity</span>
            </div>
            <ul className="q-points pulse-examples">
              {selected.example_responses.length ? selected.example_responses.map((response, index) => (
                <li className={`q-point q-point--${selected.sentiment}`} key={`${response}-${index}`}>
                  <span className="q-point-badge">{selected.sentiment === 'negative' ? <XIcon /> : <CheckIcon />}</span>
                  <span className="q-point-text">{response}</span>
                </li>
              )) : <li className="q-point q-point--empty"><span className="q-point-text">No example responses were returned.</span></li>}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}