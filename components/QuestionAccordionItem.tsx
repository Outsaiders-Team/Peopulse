'use client';

import { useState } from 'react';
import type { QuestionAnalysis } from '@/lib/types';
import { ChevronIcon } from './icons';
import { PointItems } from './PointItems';

export function QuestionAccordionItem({
  question,
  index,
  defaultOpen,
}: {
  question: QuestionAnalysis;
  index: number;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const headId = `q-head-${index}`;
  const bodyId = `q-body-${index}`;

  return (
    <article className={`q-item${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="q-head"
        aria-expanded={open}
        aria-controls={bodyId}
        id={headId}
        onClick={() => setOpen((prev) => !prev)}
      >
        <div className="q-head-text">
          <h3 className="q-title">{question.question}</h3>
          <p className="q-summary">{question.summary}</p>
        </div>
        <span className="q-chevron" aria-hidden="true">
          <ChevronIcon />
        </span>
      </button>
      <div className="q-detail-panel" id={bodyId} role="region" aria-labelledby={headId} aria-hidden={!open}>
        <div className="q-detail-panel__inner">
          <div className="q-detail">
            <div className="q-group">
              <p className="q-group-label">Heard often</p>
              <ul className="q-points">
                <PointItems
                  points={question.heard_often}
                  emptyMessage="No recurring points were identified for this question."
                />
              </ul>
            </div>
            {question.also_worth_noting.length > 0 && (
              <div className="q-group">
                <p className="q-group-label">Also worth noting</p>
                <ul className="q-points q-points--aside">
                  <PointItems points={question.also_worth_noting} />
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
