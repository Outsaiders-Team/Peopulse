import type { AnalysisPoint } from '@/lib/types';
import { CheckIcon, XIcon } from './icons';

export function PointItems({ points, emptyMessage }: { points: AnalysisPoint[]; emptyMessage?: string }) {
  if (points.length === 0) {
    if (!emptyMessage) return null;
    return (
      <li className="q-point q-point--empty">
        <span className="q-point-text">{emptyMessage}</span>
      </li>
    );
  }

  return (
    <>
      {points.map((point, i) => {
        const isNegative = point.sentiment === 'negative';
        return (
          <li
            key={i}
            className={`q-point ${isNegative ? 'q-point--negative' : 'q-point--positive'}`}
            data-sentiment={point.sentiment}
          >
            <span className="q-point-badge" aria-label={isNegative ? 'Negative' : 'Positive'}>
              {isNegative ? <XIcon className="q-point-icon" /> : <CheckIcon className="q-point-icon" />}
            </span>
            <span className="q-point-text">{point.text}</span>
          </li>
        );
      })}
    </>
  );
}
