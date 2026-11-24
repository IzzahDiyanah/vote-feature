import { NewRequest } from '@/components/NewRequest';
import { RequireAuth } from '@/components/RequireAuth';

export default function NewRequestPage() {
  return (
    <RequireAuth>
      <NewRequest />
    </RequireAuth>
  );
}
