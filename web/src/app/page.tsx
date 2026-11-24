import { Suspense } from 'react';
import { RequestList } from '@/components/RequestList';
import { RequireAuth } from '@/components/RequireAuth';
import { ListSkeleton } from '@/components/ui';

export default function HomePage() {
  return (
    <RequireAuth>
      {/* useSearchParams needs Suspense */}
      <Suspense fallback={<ListSkeleton />}>
        <RequestList />
      </Suspense>
    </RequireAuth>
  );
}
