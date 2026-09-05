'use client'

import { useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/ToastProvider';

export default function Home() {
  
  // This hook runs once when the page loads. 
  // It checks for a logged-in user and a pending analysis in the cache.
  useEffect(() => {
    const processPendingSave = async () => {
      const pendingData = sessionStorage.getItem('pendingAnalysis')
      if (!pendingData) return

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        const payload = JSON.parse(pendingData)
        
        // Insert the cached data into Supabase
        const { error } = await supabase.from('analyses').insert({
          user_id: session.user.id,
          payload: payload
        })

        if (!error) {
          // Clear the cache so it doesn't upload twice
          sessionStorage.removeItem('pendingAnalysis')
          alert('Your pending analysis has been saved to your account.')
        }
      }
    }

    processPendingSave()
  }, [])

  return (
    <div id="app">
      <ToastProvider>
        <Suspense fallback={null}>
          <AppShell />
        </Suspense>
      </ToastProvider>
    </div>
  );
}