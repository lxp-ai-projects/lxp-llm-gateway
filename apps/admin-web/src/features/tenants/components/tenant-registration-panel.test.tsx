import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { renderWithProviders } from '../../../test/test-utils';
import { TenantRegistrationPanel } from './tenant-registration-panel';

const { client } = vi.hoisted(() => ({
  client: {
    getTenantRegistrationSettings: vi.fn(),
    getTenantRegistrationEmailReadiness: vi.fn(),
    getTenantPublicHosts: vi.fn(),
    updateTenantRegistrationSettings: vi.fn(),
    createTenantPublicHost: vi.fn(),
    deleteTenantPublicHost: vi.fn(),
    updateTenantPublicHost: vi.fn(),
  },
}));

vi.mock('../../../lib/admin-api-client', () => ({ adminApiClient: client }));

beforeEach(() => {
  client.getTenantRegistrationSettings.mockResolvedValue({ enabled: false });
  client.getTenantRegistrationEmailReadiness.mockResolvedValue({
    tenantRegistrationEnabled: false,
    globalRegistrationEnabled: true,
    provider: 'smtp',
    status: 'ready',
    fromEmail: 'noreply@example.com',
  });
  client.getTenantPublicHosts.mockResolvedValue([]);
  client.updateTenantRegistrationSettings.mockResolvedValue({ enabled: true });
  client.createTenantPublicHost.mockResolvedValue({ id: 'host-1' });
  client.deleteTenantPublicHost.mockResolvedValue(undefined);
});

test('shows the multi-tenant warning and updates registration state', async () => {
  renderWithProviders(
    <TenantRegistrationPanel tenantId="tenant-1" activeTenantCount={2} />,
  );

  expect(
    await screen.findByText(/hostname mapping is required/i),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Allow public registration'));

  await waitFor(() => {
    expect(client.updateTenantRegistrationSettings).toHaveBeenCalledWith(
      'tenant-1',
      true,
    );
  });
});

test('submits a hostname and prevents an empty submission', async () => {
  renderWithProviders(
    <TenantRegistrationPanel tenantId="tenant-1" activeTenantCount={1} />,
  );

  const addButton = await screen.findByRole('button', { name: 'Add hostname' });
  expect(addButton).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Public hostname'), {
    target: { value: 'app.example.com' },
  });
  fireEvent.click(addButton);

  await waitFor(() => {
    expect(client.createTenantPublicHost).toHaveBeenCalledWith(
      'tenant-1',
      'app.example.com',
    );
  });
});

test('warns when the selected email provider is not ready', async () => {
  client.getTenantRegistrationEmailReadiness.mockResolvedValue({
    tenantRegistrationEnabled: true,
    globalRegistrationEnabled: true,
    provider: 'mailersend',
    status: 'not_ready',
    fromEmail: null,
  });

  renderWithProviders(
    <TenantRegistrationPanel tenantId="tenant-1" activeTenantCount={1} />,
  );

  expect(
    await screen.findByText(/email delivery: not ready/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/provider: mailersend/i)).toBeInTheDocument();
});

test('shows disabled delivery and the global registration warning', async () => {
  client.getTenantRegistrationEmailReadiness.mockResolvedValue({
    tenantRegistrationEnabled: false,
    globalRegistrationEnabled: false,
    provider: 'smtp',
    status: 'disabled',
    fromEmail: null,
  });

  renderWithProviders(
    <TenantRegistrationPanel tenantId="tenant-1" activeTenantCount={1} />,
  );

  expect(
    await screen.findByText(/global registration kill switch is off/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/email delivery: disabled/i)).toBeInTheDocument();
});
