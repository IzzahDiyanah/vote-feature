import { RequireAuth } from '@/components/RequireAuth';
import { StatsView } from '@/components/StatsView';

export default function AdminPage() {
  return (
    <RequireAuth admin>
      <StatsView />
    </RequireAuth>
  );
}
