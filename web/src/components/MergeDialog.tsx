'use client';

import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api';
import { useDebounced, useMerge, useRequests } from '@/lib/hooks';
import type { RequestSummary } from '@/lib/types';
import { TextField } from './fields';
import { StatusBadge } from './StatusBadge';
import { Alert, primaryButton, secondaryButton } from './ui';

/** Pick the request to keep and merge this one into it. Uses the native <dialog> (focus trap + Escape). */
export function MergeDialog({
  source,
  onClose,
  onMerged,
}: {
  source: Pick<RequestSummary, 'id' | 'title'>;
  onClose: () => void;
  onMerged: (targetId: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [targetId, setTargetId] = useState<string | null>(null);
  const merge = useMerge(source.id);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const results = useRequests({ q, status: '', sort: 'votes', page: 1, pageSize: 8 });
  const candidates = (results.data?.items ?? []).filter((r) => r.id !== source.id);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="merge-title"
      className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-rule bg-surface p-6 text-ink backdrop:bg-ink/50"
    >
      <h2 id="merge-title" className="font-display text-xl font-semibold">
        Merge into another request
      </h2>
      <p className="mt-2 text-sm text-muted">
        Votes and comments on “{source.title}” move to the request you choose. People who voted on both are counted once.
        This can’t be undone.
      </p>

      <div className="mt-4">
        <TextField label="Find the request to keep" type="search" value={text} onChange={(e) => setText(e.target.value)} />
      </div>

      <fieldset className="mt-4">
        <legend className="mb-1 text-sm font-medium">Request to keep</legend>
        <div className="max-h-56 overflow-y-auto border-y border-rule" aria-busy={results.isFetching}>
          {results.isError ? (
            <p className="p-3 text-sm text-rose-800">{errorMessage(results.error)}</p>
          ) : candidates.length === 0 ? (
            <p className="p-3 text-sm text-muted">{results.isPending ? 'Loading…' : 'No other requests found.'}</p>
          ) : (
            candidates.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-start gap-3 border-b border-rule/60 p-3 last:border-b-0 has-[:checked]:bg-paper">
                <input
                  type="radio"
                  name="merge-target"
                  value={r.id}
                  checked={targetId === r.id}
                  onChange={() => setTargetId(r.id)}
                  className="mt-1.5"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{r.title}</span>
                  <span className="mt-0.5 flex items-center gap-3 text-sm text-muted">
                    <StatusBadge status={r.status} />
                    {r.voteCount} {r.voteCount === 1 ? 'vote' : 'votes'}
                  </span>
                </span>
              </label>
            ))
          )}
        </div>
      </fieldset>

      {merge.isError && (
        <div className="mt-4">
          <Alert>{errorMessage(merge.error)}</Alert>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" className={secondaryButton} onClick={() => ref.current?.close()} disabled={merge.isPending}>
          Cancel
        </button>
        <button
          type="button"
          className={primaryButton}
          disabled={!targetId || merge.isPending}
          onClick={() => targetId && merge.mutate(targetId, { onSuccess: () => onMerged(targetId) })}
        >
          {merge.isPending ? 'Merging…' : 'Merge request'}
        </button>
      </div>
    </dialog>
  );
}
