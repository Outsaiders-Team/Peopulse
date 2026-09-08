'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from './ToastProvider';

export default function CreateFormModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const showToast = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<
    { text: string; type: 'rating' | 'text' }[]
  >([
    { text: 'How satisfied were you with the activity?', type: 'rating' },
    { text: 'What did you find most helpful?', type: 'text' },
  ]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const addQuestion = () => {
    setQuestions([...questions, { text: '', type: 'text' }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      showToast('Please sign in to create forms.');
      setLoading(false);
      return;
    }

    // 1. Insert form
    const { data: newForm, error: formErr } = await supabase
      .from('forms')
      .insert({
        user_id: session.user.id,
        title: title.trim(),
        description: description.trim(),
      })
      .select()
      .single();

    if (formErr || !newForm) {
      showToast(`Error creating form: ${formErr?.message}`);
      setLoading(false);
      return;
    }

    // 2. Insert questions
    const questionRows = questions
      .filter((q) => q.text.trim() !== '')
      .map((q, idx) => ({
        form_id: newForm.id,
        question_text: q.text.trim(),
        question_type: q.type,
        order_index: idx,
      }));

    if (questionRows.length > 0) {
      await supabase.from('form_questions').insert(questionRows);
    }

    setLoading(false);
    showToast('Form created successfully!');
    onCreated();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
          color: '#0f172a',
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Create New Form</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Form Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Workshop Day 1 Evaluation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Description (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Brief instructions for respondents..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontFamily: 'inherit' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                Questions
              </label>
              <button
                type="button"
                onClick={addQuestion}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                + Add Question
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map((q, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    required
                    placeholder={`Question ${idx + 1}`}
                    value={q.text}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].text = e.target.value;
                      setQuestions(updated);
                    }}
                    style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const updated = [...questions];
                      updated[idx].type = e.target.value as 'rating' | 'text';
                      setQuestions(updated);
                    }}
                    style={{ padding: '8px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff' }}
                  >
                    <option value="text">Open Text</option>
                    <option value="rating">1–5 Stars</option>
                  </select>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuestion(idx)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '18px', cursor: 'pointer', padding: '0 4px' }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#0f172a', color: '#fff', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}
            >
              {loading ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}