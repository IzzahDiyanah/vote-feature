import { RequestDetailView } from '@/components/RequestDetailView';
import { RequireAuth } from '@/components/RequireAuth';

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <RequireAuth>
      <RequestDetailView id={id} />
    </RequireAuth>
  );
}
