'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [devLoading, setDevLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setError('');
    setDevLoading(true);

    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Dev login failed');
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setError('Dev login failed. Is the database running?');
    } finally {
      setDevLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0B0E14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo and Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#4F46E5',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: '0 25px 50px -12px rgba(79, 70, 229, 0.25)'
          }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 900,
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '-0.05em',
            margin: '0 0 8px 0'
          }}>
            CampaignOS
          </h1>
          <p style={{
            color: '#6B7280',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.2em',
            fontSize: '11px',
            margin: 0
          }}>
            Sign in to continue
          </p>
        </div>

        {/* Login Form Card */}
        <div style={{
          backgroundColor: '#161B22',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid #30363D'
        }}>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: '#F87171',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                marginBottom: '24px'
              }}>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 900,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#0B0E14',
                  border: '1px solid #30363D',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '10px',
                fontWeight: 900,
                color: '#9CA3AF',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  backgroundColor: '#0B0E14',
                  border: '1px solid #30363D',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                backgroundColor: loading ? '#6366F1' : '#4F46E5',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '13px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.25)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div style={{
            marginTop: '24px',
            paddingTop: '24px',
            borderTop: '1px solid #30363D',
            textAlign: 'center'
          }}>
            <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={{ color: '#818CF8', fontWeight: 700, textDecoration: 'none' }}>
                Create one
              </Link>
            </p>
          </div>

          {/* Dev Login - only shown in development */}
          {process.env.NODE_ENV !== 'production' && (
            <div style={{
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #30363D',
              textAlign: 'center'
            }}>
              <button
                type="button"
                onClick={handleDevLogin}
                disabled={devLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: devLoading ? '#065F46' : '#047857',
                  color: 'white',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '12px',
                  border: '1px solid #059669',
                  cursor: devLoading ? 'not-allowed' : 'pointer',
                  opacity: devLoading ? 0.7 : 1,
                }}
              >
                {devLoading ? 'Logging in...' : 'Dev Login (Skip Auth)'}
              </button>
              <p style={{ color: '#4B5563', fontSize: '11px', marginTop: '8px', margin: '8px 0 0 0' }}>
                Development only - creates a test account automatically
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
