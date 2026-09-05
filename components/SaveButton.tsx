'use client';

import { createClient } from '@/utils/supabase/client';

export default function SaveButton({
  analysisPayload,
  onSaveSuccess,
}: {
  analysisPayload: any;
  onSaveSuccess?: () => void;
}) {
  const handleSave = async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      sessionStorage.setItem('pendingAnalysis', JSON.stringify(analysisPayload));

      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      return;
    }

    const { error } = await supabase.from('analyses').insert({
      user_id: session.user.id,
      payload: analysisPayload,
    });

    if (!error) {
      alert('Analysis saved successfully.');
      onSaveSuccess?.();
    } else {
      alert(`Failed to save analysis: ${error.message}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      className="btn-ghost btn-ghost--outline"
    >
      Save analysis
    </button>
  );
}