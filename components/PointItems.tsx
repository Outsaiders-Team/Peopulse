'use client';

import type { AnalysisPoint } from '@/lib/types';

export function PointItems({
  points,
  emptyMessage = 'No points recorded.',
}: {
  points: (AnalysisPoint | string)[];
  emptyMessage?: string;
}) {
  if (!points || points.length === 0) {
    return <p style={{ fontSize: '13px', color: '#64748b' }}>{emptyMessage}</p>;
  }

  const getSentimentBadge = (sentiment?: string) => {
    const s = sentiment?.toLowerCase();
    if (s === 'positive') {
      return { label: 'Positive', bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' };
    }
    if (s === 'negative') {
      return { label: 'Concern', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' };
    }
    return { label: 'Neutral', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' };
  };

  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {points.map((p, idx) => {
        const text = typeof p === 'string' ? p : p.text || (p as any).point || (p as any).theme || '';
        const sentiment = typeof p === 'object' && p ? p.sentiment : undefined;
        const badge = getSentimentBadge(sentiment);

        return (
          <li
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #f1f5f9',
            }}
          >
            {sentiment && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: badge.bg,
                  color: badge.color,
                  border: `1px solid ${badge.border}`,
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                {badge.label}
              </span>
            )}
            <span style={{ fontSize: '13.5px', color: '#1e293b', lineHeight: 1.5 }}>
              {text}
            </span>
          </li>
        );
      })}
    </ul>
  );
}