'use client';

import { useEffect, useRef, useState } from 'react';
import { useDebounced } from '@/lib/hooks';
import { STATUS_META } from '@/lib/status';
import { ListParams, SORTS, STATUSES } from '@/lib/types';
import { SelectField, TextField } from './fields';

const SORT_LABELS = { newest: 'Newest', votes: 'Most votes', comments: 'Most comments' } as const;

export function FilterBar({
  params,
  setParams,
}: {
  params: ListParams;
  setParams: (patch: Partial<ListParams>) => void;
}) {
  // input updates instantly, the URL/search waits 300ms after typing stops
  const [text, setText] = useState(params.q);
  const debounced = useDebounced(text.trim());
  const lastPushed = useRef(params.q);

  useEffect(() => {
    if (debounced !== lastPushed.current) {
      lastPushed.current = debounced;
      setParams({ q: debounced });
    }
  }, [debounced, setParams]);

  // URL changed elsewhere (back button, clear filters), sync the box
  useEffect(() => {
    if (params.q !== lastPushed.current) {
      lastPushed.current = params.q;
      setText(params.q);
    }
  }, [params.q]);

  return (
    <form role="search" aria-label="Filter requests" onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-[1fr_9.5rem_9.5rem]">
      <TextField
        label="Search"
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Title or description"
        maxLength={100}
      />
      <SelectField
        label="Status"
        value={params.status}
        onChange={(e) => setParams({ status: e.target.value as ListParams['status'] })}
      >
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </SelectField>
      <SelectField label="Sort by" value={params.sort} onChange={(e) => setParams({ sort: e.target.value as ListParams['sort'] })}>
        {SORTS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </SelectField>
    </form>
  );
}
