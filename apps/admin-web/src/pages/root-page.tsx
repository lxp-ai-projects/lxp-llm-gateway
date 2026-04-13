import { useQuery } from '@tanstack/react-query';

const adminApiUrl = import.meta.env.VITE_ADMIN_API_URL ?? 'http://localhost:3002';

async function fetchHealth(): Promise<{ service: string; status: string }> {
  const response = await fetch(`${adminApiUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health request failed with ${response.status}`);
  }

  return response.json() as Promise<{ service: string; status: string }>;
}

export function RootPage() {
  const healthQuery = useQuery({
    queryKey: ['admin-api-health'],
    queryFn: fetchHealth,
  });

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
            {healthQuery.isPending && 'Loading'}
            {healthQuery.isError && 'Unavailable'}
            {healthQuery.data && `${healthQuery.data.status} (${healthQuery.data.service})`}
          </strong>
        </div>
      </section>
    </main>
  );
}
