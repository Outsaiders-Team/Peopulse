'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from './ToastProvider';

export default function SaveButton({
  analysisPayload,
  isAlreadySaved,
  onSaveSuccess,
}: {
  analysisPayload: any;
  isAlreadySaved?: boolean;
  onSaveSuccess?: (newId?: string) => void;
}) {
  const showToast = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (isAlreadySaved || saving) return;

    setSaving(true);
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      localStorage.setItem('pendingAnalysis', JSON.stringify(analysisPayload));

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/?view=output')}`,
        },
      });
      return;
    }

    const { data, error } = await supabase
      .from('analyses')
      .insert({
        user_id: session.user.id,
        payload: analysisPayload,
      })
      .select()
      .single();

    setSaving(false);

    if (!error) {
      showToast('Analysis saved successfully.');
      onSaveSuccess?.(data?.id);
    } else {
      showToast(`Failed to save: ${error.message}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={isAlreadySaved || saving}
      className="btn-ghost btn-ghost--outline"
      style={{
        opacity: isAlreadySaved ? 0.6 : 1,
        cursor: isAlreadySaved ? 'default' : 'pointer',
      }}
    >
      {isAlreadySaved ? 'Saved' : saving ? 'Saving...' : 'Save analysis'}
    </button>
  );
}