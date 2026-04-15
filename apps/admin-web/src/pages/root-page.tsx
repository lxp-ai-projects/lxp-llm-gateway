import { useQuery } from '@tanstack/react-query';

const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL ?? 'http://localhost:3002';
const gatewayApiUrl = import.meta.env.VITE_GATEWAY_API_URL ?? 'http://localhost:3001';

async function fetchHealth(baseUrl: string): Promise<{ status: string; info?: Record<string, unknown> }> {
  const response = await fetch(`${baseUrl}/api/v1/health`);
  if (!response.ok) {
    throw new Error(`Health request failed with ${response.status}`);
  }

  return response.json() as Promise<{ status: string; info?: Record<string, unknown> }>;
}

export function RootPage() {
  const adminHealthQuery = useQuery({
    queryKey: ['admin-api-health'],
    queryFn: () => fetchHealth(adminApiUrl),
  });
  const gatewayHealthQuery = useQuery({
    queryKey: ['gateway-api-health'],
    queryFn: () => fetchHealth(gatewayApiUrl),
  });

  function renderHealthStatus(
    query: typeof adminHealthQuery,
    serviceName: string,
  ): string {
    if (query.isPending) {
      return 'Loading';
    }

    if (query.isError) {
      return 'Unavailable';
    }

    return `${query.data?.status ?? 'unknown'} (${serviceName})`;
  }

  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">lxp-llm-gateway</p>
        <h1>Admin Control Plane</h1>
        <p className="lede">
          React 19, Vite, React Router, and TanStack Query are now the baseline.
        </p>
        <div className="status-card">
          <span className="status-label">admin-api health</span>
          <strong>
            {renderHealthStatus(adminHealthQuery, 'admin-api')}
          </strong>
        </div>
        <div className="status-card">
          <span className="status-label">gateway-api health</span>
          <strong>
            {renderHealthStatus(gatewayHealthQuery, 'gateway-api')}
          </strong>
        </div>
      </section>
    </main>
  );
}
