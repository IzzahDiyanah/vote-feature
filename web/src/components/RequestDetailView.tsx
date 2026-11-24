'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ApiError, errorMessage } from '@/lib/api';
import { formatDate, timeAgo } from '@/lib/format';
import { useMe, usePageTitle, useRequest, useUpdateRequest } from '@/lib/hooks';
import { STATUS_META } from '@/lib/status';
import { AdminPanel } from './AdminPanel';
import { CommentSection } from './CommentSection';
import { RequestForm } from './RequestForm';
import { StatusBadge } from './StatusBadge';
import { Alert, ErrorState, ListSkeleton, secondaryButton, textLink } from './ui';
import { VoteStub } from './VoteStub';

export function RequestDetailView({ id }: { id: string }) {
  const me = useMe().data;
  const query = useRequest(id);
  const update = useUpdateRequest(id);
  const [editing, setEditing] = useState(false);
  usePageTitle(query.data?.title ?? 'Request');

  const back = (
    <Link href="/" className={`${textLink} text-sm`}>
      Back to all requests
    </Link>
  );

  if (query.isPending) return <ListSkeleton rows={1} />;

  if (query.isError) {
    const notFound = query.error instanceof ApiError && (query.error.status === 404 || query.error.status === 400);
    return (
      <div className="space-y-4">
        {back}
        {notFound ? (
          <Alert>This request doesn’t exist, or it was removed.</Alert>
        ) : (
          <ErrorState message={errorMessage(query.error)} onRetry={() => query.refetch()} />
        )}
      </div>
    );
  }

  const r = query.data;
  const merged = r.mergedIntoId !== null;
  const isAuthor = me?.id === r.author.id;

  return (
    <article>
      {back}

      {merged && (
        <div className="mt-4">
          <Alert tone="info">
            This request was merged into another one, and its votes and comments moved there.{' '}
            <Link href={`/requests/${r.mergedIntoId}`} className={textLink}>
              Open the request it was merged into
            </Link>
          </Alert>
        </div>
      )}

      <div className="mt-6 grid grid-cols-[auto_1fr] gap-5">
        <div className="border-r border-dashed border-rule pr-5">
          <VoteStub request={r} disabled={merged} />
        </div>

        <div className="min-w-0">
          {editing ? (
            <RequestForm
              initial={{ title: r.title, description: r.description }}
              submitLabel="Save changes"
              onSubmit={async (values) => {
                await update.mutateAsync(values);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          ) : (
            <>
              <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{r.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                <StatusBadge status={r.status} />
                <span>
                  {r.author.name}, <time dateTime={r.createdAt}>{formatDate(r.createdAt)}</time>
                </span>
              </div>
              <p className="mt-5 max-w-prose whitespace-pre-wrap break-words text-[1.05rem]">{r.description}</p>
              {isAuthor && !merged && (
                <button type="button" className={`${secondaryButton} mt-4`} onClick={() => setEditing(true)}>
                  Edit request
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {r.officialResponse && (
        <section aria-labelledby="response-heading" className="mt-8 border-l-4 border-ink bg-surface py-4 pl-5 pr-4">
          <h2 id="response-heading" className="font-display text-lg font-semibold">
            Official response
          </h2>
          {r.officialResponseAt && <p className="text-sm text-muted">{timeAgo(r.officialResponseAt)}</p>}
          <p className="mt-2 max-w-prose whitespace-pre-wrap break-words">{r.officialResponse}</p>
        </section>
      )}

      {r.statusHistory.length > 0 && (
        <section aria-labelledby="history-heading" className="mt-8">
          <h2 id="history-heading" className="font-display text-lg font-semibold">
            Status history
          </h2>
          <ol className="mt-2 space-y-1 text-sm">
            {r.statusHistory.map((c) => (
              <li key={c.id} className="text-muted">
                <time dateTime={c.createdAt}>{formatDate(c.createdAt)}</time>: {STATUS_META[c.fromStatus].label} to{' '}
                <span className="font-medium text-ink">{STATUS_META[c.toStatus].label}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {me?.role === 'ADMIN' && !merged && <AdminPanel request={r} />}

      <CommentSection requestId={r.id} closed={merged} />
    </article>
  );
}
