import Link from 'next/link';
import { plural, timeAgo } from '@/lib/format';
import type { RequestSummary } from '@/lib/types';
import { StatusBadge } from './StatusBadge';
import { VoteStub } from './VoteStub';

/** One row in the list: vote button on the left, details on the right */
export function RequestRow({ request: r }: { request: RequestSummary }) {
  return (
    <li className="grid grid-cols-[auto_1fr] gap-4 border-b border-rule py-5">
      <div className="border-r border-dashed border-rule pr-4">
        <VoteStub request={r} />
      </div>
      <div className="min-w-0">
        <h2 className="font-display text-lg font-semibold leading-snug">
          <Link href={`/requests/${r.id}`} className="hover:underline hover:underline-offset-4">
            {r.title}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-2 text-[0.95rem] text-muted">{r.description}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <StatusBadge status={r.status} />
          <span>
            {r.author.name}, {timeAgo(r.createdAt)}
          </span>
          <Link href={`/requests/${r.id}#comments`} className="hover:text-ink hover:underline">
            {plural(r.commentCount, 'comment')}
          </Link>
          {r.officialResponse && <span className="font-medium text-ink">Official response</span>}
        </div>
      </div>
    </li>
  );
}
