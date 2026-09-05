'use client';

import { useState } from 'react';
import type { AnalysisResult, AnalysisPoint } from '@/lib/types';

export default function ExportPdfButton({ analysis }: { analysis: AnalysisResult }) {
  const [exporting, setExporting] = useState(false);

  const extractText = (item: AnalysisPoint | string | any): string => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.text || item.point || item.theme || item.summary || JSON.stringify(item);
    }
    return '';
  };

  const handleDownload = async () => {
    if (!analysis || exporting) return;
    setExporting(true);

    try {
      // Dynamic import ensures no SSR hydration conflict
      const { jsPDF } = await import('jspdf');

      const doc = new jsPDF({
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const filename = analysis.filename || 'Feedback Analysis';
      const rows = analysis.rows_detected ?? 0;
      const payload = analysis.analysis ?? analysis ?? {};
      const topThemes: AnalysisPoint[] = payload.top_themes ?? [];
      const questions = payload.questions ?? [];
      const suggestions = payload.suggestions;

      // Brand Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42);
      doc.text('Peopulse Summary Report', margin, y);
      y += 24;

      // Metadata
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`File: ${filename}  |  ${rows} feedback entries analyzed`, margin, y);
      y += 18;

      // Divider Line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(1);
      doc.line(margin, y, pageWidth - margin, y);
      y += 24;

      // Section: Top Themes
      if (topThemes.length > 0) {
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.text('What people said the most', margin, y);
        y += 16;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);

        topThemes.forEach((item) => {
          const themeStr = extractText(item);
          if (!themeStr) return;
          const lines = doc.splitTextToSize(`•  ${themeStr}`, contentWidth);
          checkPageBreak(lines.length * 14 + 6);
          doc.text(lines, margin + 4, y);
          y += lines.length * 14 + 6;
        });

        y += 12;
      }

      // Section: By Question
      if (questions.length > 0) {
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.text('Question Breakdown', margin, y);
        y += 16;

        questions.forEach((q: any, idx: number) => {
          const qTitle = `${idx + 1}. ${q.question || q.title || 'Question'}`;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(15, 23, 42);

          const qLines = doc.splitTextToSize(qTitle, contentWidth);
          checkPageBreak(qLines.length * 14 + 10);
          doc.text(qLines, margin, y);
          y += qLines.length * 14 + 6;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);

          const rawPoints = q.points || q.themes || (q.summary ? [q.summary] : []);
          rawPoints.forEach((p: any) => {
            const pointStr = extractText(p);
            if (!pointStr) return;
            const pLines = doc.splitTextToSize(`- ${pointStr}`, contentWidth - 12);
            checkPageBreak(pLines.length * 13 + 4);
            doc.text(pLines, margin + 12, y);
            y += pLines.length * 13 + 4;
          });

          y += 10;
        });

        y += 10;
      }

      // Section: Recommendations
      if (suggestions) {
        checkPageBreak(40);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(30, 41, 59);
        doc.text('Recommendations & Assessment', margin, y);
        y += 16;

        if (suggestions.overall_assessment) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text('Overall Assessment:', margin, y);
          y += 14;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.setTextColor(71, 85, 105);
          const assessLines = doc.splitTextToSize(suggestions.overall_assessment, contentWidth);
          checkPageBreak(assessLines.length * 13 + 12);
          doc.text(assessLines, margin, y);
          y += assessLines.length * 13 + 12;
        }

        if (suggestions.key_issue?.title) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text(`Key Issue: ${suggestions.key_issue.title}`, margin, y);
          y += 14;

          if (suggestions.key_issue.explanation) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(71, 85, 105);
            const issueLines = doc.splitTextToSize(suggestions.key_issue.explanation, contentWidth);
            checkPageBreak(issueLines.length * 13 + 12);
            doc.text(issueLines, margin, y);
            y += issueLines.length * 13 + 12;
          }
        }

        if (suggestions.recommendations?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(15, 23, 42);
          doc.text('Recommended Actions:', margin, y);
          y += 14;

          suggestions.recommendations.forEach((rec: any) => {
            const actionText = `[Priority ${rec.priority || 'Normal'}] ${rec.action}`;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9.5);
            doc.setTextColor(30, 41, 59);
            const actLines = doc.splitTextToSize(actionText, contentWidth - 10);
            checkPageBreak(actLines.length * 13 + 6);
            doc.text(actLines, margin + 10, y);
            y += actLines.length * 13 + 4;

            if (rec.reason) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(9);
              doc.setTextColor(100, 116, 139);
              const reasonLines = doc.splitTextToSize(`Why: ${rec.reason}`, contentWidth - 10);
              checkPageBreak(reasonLines.length * 12 + 8);
              doc.text(reasonLines, margin + 10, y);
              y += reasonLines.length * 12 + 8;
            }
          });
        }
      }

      const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`${safeName}_summary.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={exporting}
      className="btn-ghost btn-ghost--outline"
    >
      {exporting ? 'Generating...' : 'Export PDF'}
    </button>
  );
}