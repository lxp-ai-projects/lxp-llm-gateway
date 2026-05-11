import { useQuery } from '@tanstack/react-query';

import { adminApiClient } from './api-client';

export function useSetupStatus() {
  return useQuery({
    queryKey: ['setup-status'],
    queryFn: () => adminApiClient.getSetupStatus(),
    staleTime: 10_000,
    retry: false,
  });
}

