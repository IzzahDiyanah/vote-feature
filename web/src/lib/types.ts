export type Role = 'USER' | 'ADMIN';

export const STATUSES = ['UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'RELEASED', 'DECLINED'] as const;
export type RequestStatus = (typeof STATUSES)[number];

export const SORTS = ['newest', 'votes', 'comments'] as const;
export type SortOption = (typeof SORTS)[number];

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface RequestSummary {
  id: string;
  title: string;
  description: string;
  status: RequestStatus;
  officialResponse: string | null;
  officialResponseAt: string | null;
  mergedIntoId: string | null;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
  voteCount: number;
  commentCount: number;
  hasVoted: boolean;
}

export interface StatusChange {
  id: string;
  fromStatus: RequestStatus;
  toStatus: RequestStatus;
  createdAt: string;
}

export interface RequestDetail extends RequestSummary {
  statusHistory: StatusChange[];
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

export interface VoteState {
  requestId: string;
  voteCount: number;
  hasVoted: boolean;
}

export interface Stats {
  totals: { requests: number; votes: number; comments: number; mergedDuplicates: number; newLast7Days: number };
  byStatus: Record<RequestStatus, number>;
  topRequests: { id: string; title: string; status: RequestStatus; voteCount: number }[];
}

export interface ListParams {
  q: string;
  status: RequestStatus | '';
  sort: SortOption;
  page: number;
  pageSize?: number;
}
