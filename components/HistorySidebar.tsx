'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from './ToastProvider';
import CreateFormModal from './CreateFormModal';

export default function HistorySidebar({
  history,
  activeId,
  onSelect,
  onDeleteSuccess,
  onRenameSuccess,
  onSelectFormAnalysis,
}: {
  history: any[];
  activeId?: string | null;
  onSelect: (item: any) => void;
  onDeleteSuccess?: (deletedId: string) => void;
  onRenameSuccess?: (id: string, newFilename: string) => void;
  onSelectFormAnalysis?: (analysisResult: any) => void;
}) {
  const showToast = useToast();
  const [tab, setTab] = useState<'analyses' | 'forms'>('analyses');
  const [forms, setForms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchForms = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('forms')
      .select('id, title, created_at, form_responses(id)')
      .order('created_at', { ascending: false });

    if (data) setForms(data);
  };

  useEffect(() => {
    if (tab === 'forms') {
      fetchForms();
    }
  }, [tab]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  };

  const copyFormLink = (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/f/${formId}`;
    navigator.clipboard.writeText(url);
    showToast('Shareable form link copied to clipboard!');
  };

  const handleGenerateSummary = async (e: React.MouseEvent, formId: string) => {
    e.stopPropagation();
    setGeneratingId(formId);

    try {
      const res = await fetch(`/api/analyze-form/${formId}`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate analysis');
      }

      showToast('Summary generated from live responses!');
      onSelectFormAnalysis?.(data);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setGeneratingId(null);
    }
  };

  const startRename = (e: React.MouseEvent, item: any) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditTitle(item.payload?.filename || 'Untitled Analysis');
  };

  const submitRename = async (id: string, currentItem: any) => {
    const trimmed = editTitle.trim();
    if (!trimmed || trimmed === currentItem.payload?.filename) {
      setEditingId(null);
      return;
    }

    const updatedPayload = { ...currentItem.payload, filename: trimmed };
    const supabase = createClient();
    const { error } = await supabase.from('analyses').update({ payload: updatedPayload }).eq('id', id);

    if (!error) {
      showToast('Analysis renamed.');
      onRenameSuccess?.(id, trimmed);
    } else {
      showToast(`Rename failed: ${error.message}`);
    }

    setEditingId(null);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = window.confirm('Are you sure you want to delete this analysis?');
    if (!confirmed) return;

    const supabase = createClient();
    const { error } = await supabase.from('analyses').delete().eq('id', id);

    if (!error) {
      showToast('Analysis removed.');
      onDeleteSuccess?.(id);
    } else {
      showToast(`Delete failed: ${error.message}`);
    }
  };

  return (
    <>
      <aside
        style={{
          width: '280px',
          minWidth: '280px',
          height: '100vh',
          background: 'rgba(255, 255, 255, 0.04)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '24px 16px',
          color: '#fff',
          zIndex: 20,
        }}
      >
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Tabs: Analyses vs Forms */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '2px' }}>
            <button
              type="button"
              onClick={() => setTab('analyses')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '6px',
                background: tab === 'analyses' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Analyses
            </button>
            <button
              type="button"
              onClick={() => setTab('forms')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '6px',
                background: tab === 'forms' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Forms
            </button>
          </div>

          {tab === 'analyses' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.5)', paddingLeft: '8px', fontWeight: 600 }}>
                Past Analyses
              </h2>

              {history.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', paddingLeft: '8px' }}>
                  No saved analyses yet.
                </p>
              ) : (
                history.map((item) => {
                  const isActive = activeId === item.id;
                  const isEditing = editingId === item.id;

                  return (
                    <div
                      key={item.id}
                      onClick={() => onSelect(item)}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                        border: isActive ? '1px solid rgba(255, 255, 255, 0.28)' : '1px solid rgba(255, 255, 255, 0.06)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editTitle}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') submitRename(item.id, item);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            onBlur={() => submitRename(item.id, item)}
                            style={{ width: '100%', background: 'rgba(0, 0, 0, 0.3)', border: '1px solid rgba(255, 255, 255, 0.3)', borderRadius: '4px', color: '#fff', fontSize: '13px', padding: '2px 6px' }}
                          />
                        ) : (
                          <div style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.payload?.filename || 'Untitled Analysis'}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '4px' }}>
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        {!isEditing && (
                          <button
                            type="button"
                            title="Rename"
                            onClick={(e) => startRename(e, item)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.35)', fontSize: '12px', cursor: 'pointer', padding: '4px' }}
                          >
                            ✎
                          </button>
                        )}
                        <button
                          type="button"
                          title="Delete"
                          onClick={(e) => handleDelete(e, item.id)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.35)', fontSize: '16px', cursor: 'pointer', padding: '4px' }}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
                <h2 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255, 255, 255, 0.5)', fontWeight: 600 }}>
                  Feedback Forms
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  + New
                </button>
              </div>

              {forms.length === 0 ? (
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.4)', paddingLeft: '8px' }}>
                  No forms created yet. Click "+ New" to make one.
                </p>
              ) : (
                forms.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {f.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '2px' }}>
                        {f.form_responses?.length || 0} responses
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={(e) => copyFormLink(e, f.id)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255,255,255,0.15)',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Copy Link
                      </button>
                      <button
                        type="button"
                        disabled={generatingId === f.id}
                        onClick={(e) => handleGenerateSummary(e, f.id)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: 'none',
                          background: '#2563eb',
                          color: '#fff',
                          fontSize: '11px',
                          fontWeight: 500,
                          cursor: generatingId === f.id ? 'default' : 'pointer',
                        }}
                      >
                        {generatingId === f.id ? 'Analyzing...' : '⚡ Generate'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={handleSignOut}
            style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px', cursor: 'pointer', padding: '8px', width: '100%', textAlign: 'left' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
          >
            Sign out
          </button>
        </div>
      </aside>

      <CreateFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={fetchForms}
      />
    </>
  );
}