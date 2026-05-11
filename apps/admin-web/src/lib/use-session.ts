import { useQuery } from '@tanstack/react-query';

import { adminApiClient } from './api-client';

export function useSession(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => adminApiClient.getSession(),
    enabled: options?.enabled ?? true,
  });
}
