'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/api';
import { useSetResponse, useSetStatus } from '@/lib/hooks';
import { STATUS_META } from '@/lib/status';
import { RequestDetail, RequestStatus, STATUSES } from '@/lib/types';
import { SelectField, TextArea } from './fields';
import { MergeDialog } from './MergeDialog';
import { Alert, primaryButton, secondaryButton } from './ui';

/** Admin only. The API checks this too, this just hides the UI. */
export function AdminPanel({ request }: { request: RequestDetail }) {
  const router = useRouter();
  const setStatus = useSetStatus(request.id);
  const setResponse = useSetResponse(request.id);
  const [status, setStatusValue] = useState<RequestStatus>(request.status);
  const [response, setResponseValue] = useState(request.officialResponse ?? '');
  const [merging, setMerging] = useState(false);

  // reset the form when the request changes
  useEffect(() => setStatusValue(request.status), [request.status]);
  useEffect(() => setResponseValue(request.officialResponse ?? ''), [request.officialResponse]);

  const responseChanged = response.trim() !== (request.officialResponse ?? '') && response.trim() !== '';

  return (
    <section aria-labelledby="admin-heading" className="mt-10 border-t-2 border-ink pt-5">
      <h2 id="admin-heading" className="font-display text-xl font-semibold">
        Admin actions
      </h2>

      <div className="mt-5 grid gap-6">
        <div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-48">
              <SelectField label="Status" value={status} onChange={(e) => setStatusValue(e.target.value as RequestStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </SelectField>
            </div>
            <button
              type="button"
              className={primaryButton}
              disabled={status === request.status || setStatus.isPending}
              onClick={() => setStatus.mutate(status)}
            >
              {setStatus.isPending ? 'Updating…' : 'Update status'}
            </button>
          </div>
          <div aria-live="polite" className="mt-2 min-h-5 text-sm">
            {setStatus.isError && <Alert>{errorMessage(setStatus.error)}</Alert>}
            {setStatus.isSuccess && status === request.status && <span className="text-green-800">Status updated.</span>}
          </div>
        </div>

        <div>
          <TextArea
            label="Official response"
            rows={4}
            maxLength={2000}
            value={response}
            onChange={(e) => setResponseValue(e.target.value)}
            hint="Everyone can see this on the request."
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={!responseChanged || setResponse.isPending}
              onClick={() => setResponse.mutate(response.trim())}
            >
              {setResponse.isPending ? 'Saving…' : 'Save response'}
            </button>
            <span aria-live="polite" className="text-sm">
              {setResponse.isSuccess && !responseChanged && <span className="text-green-800">Response saved.</span>}
            </span>
          </div>
          {setResponse.isError && (
            <div className="mt-2">
              <Alert>{errorMessage(setResponse.error)}</Alert>
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">Duplicate?</p>
          <button type="button" className={secondaryButton} onClick={() => setMerging(true)}>
            Merge into another request…
          </button>
        </div>
      </div>

      {merging && (
        <MergeDialog
          source={request}
          onClose={() => setMerging(false)}
          onMerged={(targetId) => router.push(`/requests/${targetId}`)}
        />
      )}
    </section>
  );
}
