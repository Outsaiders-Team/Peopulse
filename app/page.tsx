import { Suspense } from 'react';
import { AppShell } from '@/components/AppShell';
import { ToastProvider } from '@/components/ToastProvider';

export default function Home() {
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
