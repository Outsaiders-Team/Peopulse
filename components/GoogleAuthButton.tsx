'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function GoogleAuthButton() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    checkUser();
  }, []);

  const handleSignIn = async () => {
    const supabase = createClient();
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : 'https://peo-pulse.vercel.app';

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/`,
      },
    });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    window.location.reload();
  };

  if (loading) return null;

  if (user) {
    return (
      <div
        style={{
          marginTop: '28px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 14px',
          borderRadius: '10px',
          background: 'rgba(15, 23, 42, 0.04)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          width: 'fit-content',
        }}
      >
        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
          {user.email}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          style={{
            background: 'none',
            border: 'none',
            color: '#dc2626',
            fontSize: '12px',
            cursor: 'pointer',
            padding: '2px 4px',
            textDecoration: 'underline',
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignIn}
      style={{
        marginTop: '28px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 18px',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        background: '#ffffff',
        color: '#1e293b',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#94a3b8';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = '#ffffff';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        />
      </svg>
      Sign in with Google
    </button>
  );
}