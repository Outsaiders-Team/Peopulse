'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from './ToastProvider';

export default function HistorySidebar({
  history,
  activeId,
  onSelect,
  onDeleteSuccess,
  onRenameSuccess,
}: {
  history: any[];
  activeId?: string | null;
  onSelect: (item: any) => void;
  onDeleteSuccess?: (deletedId: string) => void;
  onRenameSuccess?: (id: string, newFilename: string) => void;
}) {
  const showToast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
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

    const updatedPayload = {
      ...currentItem.payload,
      filename: trimmed,
    };

    const supabase = createClient();
    const { error } = await supabase
      .from('analyses')
      .update({ payload: updatedPayload })
      .eq('id', id);

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
      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2
          style={{
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '12px',
            paddingLeft: '8px',
            fontWeight: 600,
          }}
        >
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
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  }
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
                      style={{
                        width: '100%',
                        background: 'rgba(0, 0, 0, 0.3)',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '4px',
                        color: '#fff',
                        fontSize: '13px',
                        padding: '2px 6px',
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: isActive ? 600 : 500,
                        color: '#fff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={item.payload?.filename || 'Untitled Analysis'}
                    >
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
                      title="Rename analysis"
                      onClick={(e) => startRename(e, item)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.35)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        lineHeight: 1,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.35)')}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    type="button"
                    title="Delete analysis"
                    onClick={(e) => handleDelete(e, item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.35)',
                      fontSize: '16px',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      lineHeight: 1,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.35)')}
                  >
                    &times;
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: '8px',
            width: '100%',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff6b6b')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)')}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}