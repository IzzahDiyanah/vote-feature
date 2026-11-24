import { STATUS_META } from '@/lib/status';
import type { RequestStatus } from '@/lib/types';

/** Icon fills up as the status progresses so it is not colour only */
function StatusIcon({ status }: { status: RequestStatus }) {
  const common = { width: 14, height: 14, viewBox: '0 0 14 14', 'aria-hidden': true, focusable: false } as const;
  const ring = <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" />;
  switch (status) {
    case 'UNDER_REVIEW':
      return <svg {...common}>{ring}</svg>;
    case 'PLANNED':
      return (
        <svg {...common}>
          {ring}
          <path d="M7 1.5a5.5 5.5 0 0 1 0 11z" fill="currentColor" />
        </svg>
      );
    case 'IN_PROGRESS':
      return (
        <svg {...common}>
          {ring}
          <path d="M7 7V1.5A5.5 5.5 0 1 1 1.5 7z" fill="currentColor" />
        </svg>
      );
    case 'RELEASED':
      return (
        <svg {...common}>
          <circle cx="7" cy="7" r="6" fill="currentColor" />
          <path d="M4.2 7.2l2 2 3.6-4" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'DECLINED':
      return (
        <svg {...common}>
          {ring}
          <path d="M3.5 10.5l7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${meta.text}`}>
      <StatusIcon status={status} />
      {meta.label}
    </span>
  );
}
