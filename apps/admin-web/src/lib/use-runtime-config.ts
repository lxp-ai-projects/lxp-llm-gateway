import { useQuery } from '@tanstack/react-query';

import { adminApiClient } from './api-client';

export function useRuntimeConfig() {
  return useQuery({
    queryKey: ['runtime-config'],
    queryFn: () => adminApiClient.getRuntimeConfig(),
  });
}
