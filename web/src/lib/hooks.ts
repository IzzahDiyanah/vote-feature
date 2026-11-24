'use client';

import { keepPreviousData, QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import type {
  Comment,
  ListParams,
  Page,
  RequestDetail,
  RequestStatus,
  RequestSummary,
  Stats,
  User,
  VoteState,
} from './types';

// query keys in one place
export const keys = {
  me: ['me'] as const,
  requests: ['requests'] as const,
  list: (p: ListParams) => ['requests', 'list', p] as const,
  detail: (id: string) => ['requests', 'detail', id] as const,
  comments: (id: string) => ['comments', id] as const,
  stats: ['stats'] as const,
};

function listQuery(p: ListParams) {
  const qs = new URLSearchParams();
  if (p.q) qs.set('q', p.q);
  if (p.status) qs.set('status', p.status);
  qs.set('sort', p.sort);
  qs.set('page', String(p.page));
  if (p.pageSize) qs.set('pageSize', String(p.pageSize));
  return qs.toString();
}

// session

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async (): Promise<User | null> => {
      try {
        return (await api<{ user: User }>('/auth/me')).user;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null; // not logged in
        throw e;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useAuthenticate(mode: 'login' | 'register') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string; name?: string }) =>
      api<{ user: User }>(`/auth/${mode}`, { method: 'POST', body }),
    onSuccess: ({ user }) => {
      qc.removeQueries({ queryKey: keys.requests });
      qc.setQueryData(keys.me, user);
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSettled: () => {
      qc.clear(); // clear the cache so the next user does not see old data
      qc.setQueryData(keys.me, null);
    },
  });
}

// requests

export function useRequests(params: ListParams, enabled = true) {
  return useQuery({
    queryKey: keys.list(params),
    queryFn: () => api<Page<RequestSummary>>(`/requests?${listQuery(params)}`),
    placeholderData: keepPreviousData, // keep old page while the next one loads
    enabled,
  });
}

export function useRequest(id: string) {
  return useQuery({
    queryKey: keys.detail(id),
    queryFn: () => api<RequestDetail>(`/requests/${id}`),
  });
}

export function useCreateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      api<RequestSummary>('/requests', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

export function useUpdateRequest(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { title?: string; description?: string }) =>
      api<RequestSummary>(`/requests/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

// voting

// same as the server: voting twice does nothing
export function applyVote<T extends { voteCount: number; hasVoted: boolean }>(item: T, vote: boolean): T {
  if (vote === item.hasVoted) return item;
  return { ...item, hasVoted: vote, voteCount: item.voteCount + (vote ? 1 : -1) };
}

function patchRequestCaches(qc: QueryClient, id: string, patch: (r: any) => any) {
  qc.setQueriesData<Page<RequestSummary>>({ queryKey: ['requests', 'list'] }, (old) =>
    old && { ...old, items: old.items.map((r) => (r.id === id ? patch(r) : r)) },
  );
  qc.setQueryData<RequestDetail>(keys.detail(id), (old) => old && patch(old));
}

/**
 * Optimistic vote: update the cached copies first, roll back on error,
 * then refetch so sorted lists reorder.
 */
export function useVote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vote: boolean) =>
      api<VoteState>(`/requests/${id}/vote`, { method: vote ? 'PUT' : 'DELETE' }),
    onMutate: async (vote) => {
      await qc.cancelQueries({ queryKey: keys.requests });
      const snapshot = qc.getQueriesData({ queryKey: keys.requests });
      patchRequestCaches(qc, id, (r) => applyVote(r, vote));
      return { snapshot };
    },
    onError: (_error, _vote, context) => {
      context?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (state) => {
      patchRequestCaches(qc, id, (r) => ({ ...r, voteCount: state.voteCount, hasVoted: state.hasVoted }));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.requests }),
  });
}

// comments

export function useComments(id: string) {
  return useQuery({
    queryKey: keys.comments(id),
    queryFn: () => api<Page<Comment>>(`/requests/${id}/comments?pageSize=100`),
  });
}

export function useAddComment(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => api<Comment>(`/requests/${id}/comments`, { method: 'POST', body: { body } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.comments(id) });
      qc.invalidateQueries({ queryKey: keys.requests }); // comment counts changed
    },
  });
}

// admin

export function useSetStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: RequestStatus) =>
      api<RequestDetail>(`/admin/requests/${id}/status`, { method: 'PATCH', body: { status } }),
    onSuccess: (detail) => {
      qc.setQueryData(keys.detail(id), detail);
      qc.invalidateQueries({ queryKey: ['requests', 'list'] });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useSetResponse(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      api<RequestDetail>(`/admin/requests/${id}/response`, { method: 'PUT', body: { message } }),
    onSuccess: (detail) => {
      qc.setQueryData(keys.detail(id), detail);
      qc.invalidateQueries({ queryKey: ['requests', 'list'] });
    },
  });
}

export function useMerge(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (targetId: string) =>
      api<RequestDetail>(`/admin/requests/${id}/merge`, { method: 'POST', body: { targetId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.requests });
      qc.invalidateQueries({ queryKey: ['comments'] });
      qc.invalidateQueries({ queryKey: keys.stats });
    },
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: () => api<Stats>('/admin/stats') });
}

// utils

export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Vote`;
  }, [title]);
}
