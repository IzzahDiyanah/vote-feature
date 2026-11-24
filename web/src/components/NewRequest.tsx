'use client';

import { useRouter } from 'next/navigation';
import { useCreateRequest, usePageTitle } from '@/lib/hooks';
import { RequestForm } from './RequestForm';

export function NewRequest() {
  usePageTitle('New request');
  const router = useRouter();
  const create = useCreateRequest();

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-bold tracking-tight">New request</h1>
      <p className="mb-6 text-muted">Check the list first. If someone already asked, vote for theirs instead.</p>
      <RequestForm
        submitLabel="Submit request"
        onSubmit={async (values) => {
          const created = await create.mutateAsync(values);
          router.push(`/requests/${created.id}`);
        }}
        onCancel={() => router.push('/')}
      />
    </div>
  );
}
