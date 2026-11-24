'use client';

import { useState, type FormEvent } from 'react';
import { ApiError, errorMessage } from '@/lib/api';
import { plural, timeAgo } from '@/lib/format';
import { useAddComment, useComments } from '@/lib/hooks';
import { TextArea } from './fields';
import { Alert, ErrorState, primaryButton } from './ui';

const MAX = 1000;

export function CommentSection({ requestId, closed }: { requestId: string; closed: boolean }) {
  const comments = useComments(requestId);
  const add = useAddComment(requestId);
  const [body, setBody] = useState('');

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    add.mutate(text, { onSuccess: () => setBody('') });
  }

  const shown = comments.data?.items.length ?? 0;
  const total = comments.data?.total ?? 0;

  return (
    <section id="comments" aria-labelledby="comments-heading" className="mt-10 scroll-mt-4">
      <h2 id="comments-heading" className="font-display text-xl font-semibold">
        {comments.data ? plural(total, 'comment') : 'Comments'}
      </h2>

      {comments.isPending ? (
        <p className="mt-4 text-muted" role="status">
          Loading comments…
        </p>
      ) : comments.isError ? (
        <div className="mt-4">
          <ErrorState message={errorMessage(comments.error)} onRetry={() => comments.refetch()} />
        </div>
      ) : total === 0 ? (
        <p className="mt-4 text-muted">{closed ? 'No comments.' : 'No comments yet. Add the first one.'}</p>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-rule">
            {comments.data.items.map((c) => (
              <li key={c.id} className="py-4">
                <p className="text-sm">
                  <span className="font-semibold">{c.author.name}</span>{' '}
                  <span className="text-muted">{timeAgo(c.createdAt)}</span>
                </p>
                <p className="mt-1 max-w-prose whitespace-pre-wrap break-words">{c.body}</p>
              </li>
            ))}
          </ul>
          {shown < total && <p className="text-sm text-muted">Showing the first {shown} comments.</p>}
        </>
      )}

      {closed ? (
        <p className="mt-4 text-sm text-muted">Comments are closed because this request was merged into another one.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          {add.isError && (
            <Alert>
              {add.error instanceof ApiError && add.error.code === 'REQUEST_MERGED'
                ? 'This request was just merged into another one, so it no longer accepts comments.'
                : errorMessage(add.error)}
            </Alert>
          )}
          <TextArea
            label="Add a comment"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={MAX}
            hint={`${body.length} of ${MAX} characters`}
          />
          <button type="submit" className={primaryButton} disabled={add.isPending || body.trim() === ''}>
            {add.isPending ? 'Posting…' : 'Post comment'}
          </button>
        </form>
      )}
    </section>
  );
}
