'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { errorMessage } from '@/lib/api';
import { useAuthenticate, useMe, usePageTitle } from '@/lib/hooks';
import { TextField } from './fields';
import { Alert, primaryButton, textLink } from './ui';

// only redirect to paths on this site
function safeNext(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

const SHOW_DEMO_HINT = process.env.NEXT_PUBLIC_DEMO_HINT === 'true';

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const isLogin = mode === 'login';
  usePageTitle(isLogin ? 'Log in' : 'Create account');

  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const me = useMe();
  const auth = useAuthenticate(mode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // already logged in, skip this page
  useEffect(() => {
    if (me.data) router.replace(next);
  }, [me.data, next, router]);

  function submit(e: FormEvent) {
    e.preventDefault();
    auth.mutate(
      { email, password, ...(isLogin ? {} : { name }) },
      { onSuccess: () => router.replace(next) },
    );
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-3xl font-bold tracking-tight">
        {isLogin ? 'Log in to Vote' : 'Create your account'}
      </h1>
      <p className="mt-1 text-muted">
        {isLogin ? 'Vote on requests and follow what gets built.' : 'Suggest features and vote on the ones you need.'}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {auth.isError && <Alert>{errorMessage(auth.error)}</Alert>}
        {!isLogin && (
          <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} />
        )}
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        <TextField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
          hint={isLogin ? undefined : 'At least 8 characters.'}
          required
        />
        <button type="submit" className={`${primaryButton} w-full`} disabled={auth.isPending}>
          {auth.isPending ? (isLogin ? 'Logging in…' : 'Creating account…') : isLogin ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted">
        {isLogin ? 'New here? ' : 'Already have an account? '}
        <Link href={isLogin ? '/register' : '/login'} className={textLink}>
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>

      {isLogin && SHOW_DEMO_HINT && (
        <div className="mt-8 border-t border-rule pt-4 text-sm text-muted">
          <p className="font-medium text-ink">Demo accounts (local seed data)</p>
          <p className="mt-1">
            <code>admin@example.com</code> (admin), <code>alice@example.com</code> or <code>john@example.com</code>.
            Password: <code>Password123!</code>
          </p>
        </div>
      )}
    </div>
  );
}
