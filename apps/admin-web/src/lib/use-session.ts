import { useQuery } from '@tanstack/react-query';

import { adminApiClient } from './api-client';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: () => adminApiClient.getSession(),
  });
}
