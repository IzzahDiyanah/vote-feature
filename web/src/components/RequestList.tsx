'use client';

import Link from 'next/link';
import { errorMessage } from '@/lib/api';
import { plural } from '@/lib/format';
import { useRequests, usePageTitle } from '@/lib/hooks';
import { useListParams } from '@/lib/list-params';
import { FilterBar } from './FilterBar';
import { RequestRow } from './RequestRow';
import { EmptyState, ErrorState, ListSkeleton, primaryButton, secondaryButton } from './ui';

export function RequestList() {
  usePageTitle('Feature requests');
  const { params, setParams, hasFilters } = useListParams();
  const list = useRequests(params);
  const totalPages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Feature requests</h1>
          <p className="text-muted">Vote for what you need. Comment to add detail.</p>
        </div>
        <Link href="/requests/new" className={primaryButton}>
          New request
        </Link>
      </div>

      <FilterBar params={params} setParams={setParams} />

      <div className="mt-6" aria-busy={list.isFetching}>
        {list.isPending ? (
          <ListSkeleton />
        ) : list.isError ? (
          <ErrorState message={errorMessage(list.error)} onRetry={() => list.refetch()} />
        ) : list.data.items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No requests match">
              <p>Try a different search or status.</p>
              <button type="button" className={`${secondaryButton} mt-4`} onClick={() => setParams({ q: '', status: '' })}>
                Clear filters
              </button>
            </EmptyState>
          ) : (
            <EmptyState title="No requests yet">
              <p>Be the first to suggest a feature.</p>
              <Link href="/requests/new" className={`${primaryButton} mt-4`}>
                New request
              </Link>
            </EmptyState>
          )
        ) : (
          <>
            <p className="mb-1 text-sm text-muted" role="status">
              {plural(list.data.total, 'request')}
              {hasFilters ? ' found' : ''}
            </p>
            <ul className="border-t border-rule">
              {list.data.items.map((r) => (
                <RequestRow key={r.id} request={r} />
              ))}
            </ul>
            {totalPages > 1 && (
              <nav aria-label="Pages" className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={params.page <= 1}
                  onClick={() => setParams({ page: params.page - 1 })}
                >
                  Previous
                </button>
                <span className="text-sm text-muted">
                  Page {params.page} of {totalPages}
                </span>
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={params.page >= totalPages}
                  onClick={() => setParams({ page: params.page + 1 })}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
