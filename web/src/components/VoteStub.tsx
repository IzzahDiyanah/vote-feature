'use client';

import { useState } from 'react';
import { useVote } from '@/lib/hooks';
import { plural } from '@/lib/format';
import type { RequestSummary } from '@/lib/types';

/** Vote button. Count updates straight away and rolls back if the request fails. */
export function VoteStub({
  request,
  disabled = false,
}: {
  request: Pick<RequestSummary, 'id' | 'title' | 'voteCount' | 'hasVoted'>;
  disabled?: boolean;
}) {
  const vote = useVote(request.id);
  const [justVoted, setJustVoted] = useState(false);
  const { hasVoted, voteCount } = request;

  function toggle() {
    setJustVoted(!hasVoted); // only animate on a click, not on page load
    vote.mutate(!hasVoted);
  }

  return (
    <div className="flex w-[4.5rem] flex-col items-center">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={hasVoted}
        // disabled while pending so a double click does not send two
        disabled={disabled || vote.isPending}
        className={`flex w-full flex-col items-center rounded-md border px-1 pb-2 pt-2.5 transition-colors disabled:cursor-not-allowed ${
          hasVoted
            ? 'border-stamp bg-stamp-soft text-stamp'
            : 'border-rule bg-surface text-ink hover:border-ink disabled:hover:border-rule'
        }`}
      >
        <span className="sr-only">Vote for {request.title}. </span>
        <svg width="16" height="10" viewBox="0 0 16 10" aria-hidden="true" focusable="false">
          <path d="M1.5 8.5L8 2l6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="mt-1 font-display text-2xl font-bold leading-none tabular-nums" aria-hidden="true">
          {voteCount}
        </span>
        <span className="sr-only">{plural(voteCount, 'vote')}</span>
        <span aria-hidden="true" className="mt-1.5 h-5 text-xs font-semibold">
          {hasVoted ? (
            <span
              className={`stamped inline-block rounded-sm border-2 border-stamp px-1 leading-[1.05rem] ${justVoted ? 'animate-stamp' : ''}`}
            >
              voted
            </span>
          ) : (
            <span className="text-muted">{voteCount === 1 ? 'vote' : 'votes'}</span>
          )}
        </span>
      </button>
      {vote.isError && (
        <p role="alert" className="mt-1.5 text-center text-xs text-rose-800">
          Couldn’t save your vote. Try again.
        </p>
      )}
    </div>
  );
}
