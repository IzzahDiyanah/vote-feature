'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { ListParams, RequestStatus, SORTS, SortOption, STATUSES } from './types';

/** Search, filters, sort and page are kept in the URL so links and the back button work. */
export function useListParams() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const params: ListParams = useMemo(() => {
    const status = search.get('status') as RequestStatus | null;
    const sort = search.get('sort') as SortOption | null;
    const page = Number.parseInt(search.get('page') ?? '1', 10);
    return {
      q: search.get('q') ?? '',
      status: status && STATUSES.includes(status) ? status : '',
      sort: sort && SORTS.includes(sort) ? sort : 'newest',
      page: Number.isFinite(page) && page >= 1 ? page : 1,
    };
  }, [search]);

  const setParams = useCallback(
    (patch: Partial<ListParams>) => {
      const next = { ...params, ...patch };
      // reset to page 1 when a filter changes
      if (!('page' in patch)) next.page = 1;
      const qs = new URLSearchParams();
      if (next.q) qs.set('q', next.q);
      if (next.status) qs.set('status', next.status);
      if (next.sort !== 'newest') qs.set('sort', next.sort);
      if (next.page > 1) qs.set('page', String(next.page));
      const query = qs.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );

  const hasFilters = params.q !== '' || params.status !== '';
  return { params, setParams, hasFilters };
}
