'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { useMe } from '@/lib/hooks';
import { Alert, ErrorState, ListSkeleton } from './ui';

/** Wraps pages that need a login (or admin). Only hides the page, the API does the real check. */
export function RequireAuth({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (me.isSuccess && !me.data) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [me.isSuccess, me.data, pathname, router]);

  if (me.isPending) return <ListSkeleton rows={3} />;
  if (me.isError) return <ErrorState message={errorMessage(me.error)} onRetry={() => me.refetch()} />;
  if (!me.data) return null; // redirecting to login
  if (admin && me.data.role !== 'ADMIN') {
    return <Alert>You need an administrator account to see this page.</Alert>;
  }
  return <>{children}</>;
}
