'use client';

import Link from 'next/link';
import { errorMessage } from '@/lib/api';
import { plural } from '@/lib/format';
import { usePageTitle, useStats } from '@/lib/hooks';
import { STATUS_META } from '@/lib/status';
import { STATUSES } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { ErrorState, ListSkeleton } from './ui';

export function StatsView() {
  usePageTitle('Stats');
  const stats = useStats();

  if (stats.isPending) return <ListSkeleton rows={3} />;
  if (stats.isError) return <ErrorState message={errorMessage(stats.error)} onRetry={() => stats.refetch()} />;

  const { totals, byStatus, topRequests } = stats.data;
  const biggest = Math.max(1, ...STATUSES.map((s) => byStatus[s]));
  const figures = [
    { label: 'Open requests', value: totals.requests },
    { label: 'Votes', value: totals.votes },
    { label: 'Comments', value: totals.comments },
    { label: 'New this week', value: totals.newLast7Days },
    { label: 'Merged duplicates', value: totals.mergedDuplicates },
  ];

  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Stats</h1>
      <p className="text-muted">A quick read on how people use Vote.</p>

      <dl className="mt-6 grid grid-cols-2 border-y border-ink sm:grid-cols-5">
        {figures.map((f) => (
          <div key={f.label} className="border-b border-rule px-1 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:px-4 sm:first:pl-0 sm:last:border-r-0">
            <dt className="text-sm text-muted">{f.label}</dt>
            <dd className="font-display text-3xl font-bold tabular-nums">{f.value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="by-status" className="mt-10">
        <h2 id="by-status" className="font-display text-xl font-semibold">
          Requests by status
        </h2>
        <ul className="mt-3 space-y-3">
          {STATUSES.map((s) => (
            <li key={s} className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-3 text-sm">
              <span>{STATUS_META[s].label}</span>
              <span className="h-3 bg-rule/50" aria-hidden="true">
                <span className="block h-full bg-ink" style={{ width: `${(byStatus[s] / biggest) * 100}%` }} />
              </span>
              <span className="text-right font-medium tabular-nums">{byStatus[s]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="top" className="mt-10">
        <h2 id="top" className="font-display text-xl font-semibold">
          Most voted
        </h2>
        {topRequests.length === 0 ? (
          <p className="mt-2 text-muted">No requests yet.</p>
        ) : (
          <ol className="mt-2 divide-y divide-rule border-y border-rule">
            {topRequests.map((r, i) => (
              <li key={r.id} className="grid grid-cols-[1.5rem_1fr_auto] items-baseline gap-3 py-3">
                <span className="text-muted tabular-nums">{i + 1}</span>
                <span className="min-w-0">
                  <Link href={`/requests/${r.id}`} className="font-medium hover:underline">
                    {r.title}
                  </Link>
                  <span className="ml-3 inline-block align-middle">
                    <StatusBadge status={r.status} />
                  </span>
                </span>
                <span className="font-display font-bold tabular-nums">{plural(r.voteCount, 'vote')}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
