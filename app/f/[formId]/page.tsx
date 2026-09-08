'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function PublicFormPage() {
  const { formId } = useParams<{ formId: string }>();
  const [form, setForm] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      if (!formId) return;
      const supabase = createClient();

      const { data: formData, error: fErr } = await supabase
        .from('forms')
        .select('*')
        .eq('id', formId)
        .single();

      if (fErr || !formData) {
        setError('Form not found or has been removed.');
        setLoading(false);
        return;
      }

      setForm(formData);

      const { data: qData } = await supabase
        .from('form_questions')
        .select('*')
        .eq('form_id', formId)
        .order('order_index', { ascending: true });

      setQuestions(qData || []);
      setLoading(false);
    }

    loadForm();
  }, [formId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const supabase = createClient();
    const submissionId = crypto.randomUUID();

    const rowsToInsert = questions.map((q) => ({
      form_id: formId,
      submission_id: submissionId,
      question_id: q.id,
      response_value: answers[q.id] || '',
    }));

    const { error: insertErr } = await supabase.from('form_responses').insert(rowsToInsert);

    setSubmitting(false);
    if (!insertErr) {
      setSubmitted(true);
    } else {
      alert(`Submission failed: ${insertErr.message}`);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
        Loading form...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', maxWidth: '480px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✓</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', marginBottom: '8px' }}>
            Thank you for your feedback!
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Your responses have been recorded anonymously.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '48px 16px', background: '#f8fafc', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '640px' }}>
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            {form.title}
          </h1>
          {form.description && (
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.5 }}>
              {form.description}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '24px',
                border: '1px solid #e2e8f0',
              }}
            >
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', color: '#1e293b', marginBottom: '12px' }}>
                {idx + 1}. {q.question_text}
              </label>

              {q.question_type === 'rating' ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: star.toString() })}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: answers[q.id] === star.toString() ? '#2563eb' : '#cbd5e1',
                        background: answers[q.id] === star.toString() ? '#eff6ff' : '#ffffff',
                        color: answers[q.id] === star.toString() ? '#1d4ed8' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      ★ {star}
                    </button>
                  ))}
                </div>
              ) : (
                <textarea
                  rows={3}
                  required
                  placeholder="Type your answer here..."
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '14px',
              borderRadius: '8px',
              background: '#0f172a',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '15px',
              cursor: submitting ? 'default' : 'pointer',
              opacity: submitting ? 0.7 : 1,
              marginTop: '8px',
            }}
          >
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}