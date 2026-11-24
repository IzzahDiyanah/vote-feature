'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLogout, useMe } from '@/lib/hooks';

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold tracking-tight">
      Vote
    </Link>
  );
}

export function Header() {
  const { data: user } = useMe();
  const logout = useLogout();
  const router = useRouter();
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Requests' },
    { href: '/requests/new', label: 'New request' },
    ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Stats' }] : []),
  ];

  return (
    <header className="border-b border-rule bg-surface">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <Wordmark />
        {user ? (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <nav aria-label="Main" className="flex gap-4 text-sm">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={pathname === l.href ? 'page' : undefined}
                  className="py-1 font-medium text-muted hover:text-ink aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted">
                {user.name}
                {user.role === 'ADMIN' && ' (admin)'}
              </span>
              <button
                type="button"
                className="font-medium underline decoration-rule underline-offset-4 hover:decoration-ink"
                onClick={() => logout.mutate(undefined, { onSettled: () => router.replace('/login') })}
              >
                Log out
              </button>
            </div>
          </div>
        ) : (
          <nav aria-label="Account" className="flex gap-4 text-sm font-medium">
            <Link href="/login">Log in</Link>
            <Link href="/register">Create account</Link>
          </nav>
        )}
      </div>
    </header>
  );
}
