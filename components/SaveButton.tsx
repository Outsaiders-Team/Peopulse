'use client'

import { createClient } from '@/utils/supabase/client'

export default function SaveButton({ analysisPayload }: { analysisPayload: any }) {
  const handleSave = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      sessionStorage.setItem('pendingAnalysis', JSON.stringify(analysisPayload))
      
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      return
    }

    const { error } = await supabase.from('analyses').insert({
      user_id: session.user.id,
      payload: analysisPayload
    })

    if (!error) {
      alert('Analysis saved successfully.')
    }
  }

  return (
    <button 
      onClick={handleSave} 
      className="bg-blue-600 text-white px-4 py-2 rounded"
    >
      Save Analysis
    </button>
  )
}