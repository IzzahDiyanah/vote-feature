import type { RequestStatus } from './types';

/** Status shown as text + icon, not just colour */
export const STATUS_META: Record<RequestStatus, { label: string; text: string }> = {
  UNDER_REVIEW: { label: 'Under review', text: 'text-slate-600' },
  PLANNED: { label: 'Planned', text: 'text-blue-700' },
  IN_PROGRESS: { label: 'In progress', text: 'text-amber-800' },
  RELEASED: { label: 'Released', text: 'text-green-800' },
  DECLINED: { label: 'Declined', text: 'text-rose-800' },
};
