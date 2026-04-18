import { screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { RoleGuard } from './role-guard';

vi.mock('../lib/use-session', () => ({
  useSession: () => ({
    data: {
      userUuid: 'user-uuid',
      email: 'patrick@example.com',
      displayName: 'Patrick',
      status: 'active',
      roles: ['user'],
    },
  }),
}));

test('RoleGuard renders a restricted message for unauthorized roles', () => {
  renderWithProviders(
    <RoleGuard allowedRoles={['admin']}>
      <div>secret admin surface</div>
    </RoleGuard>,
  );

  expect(screen.getByText('Restricted surface')).toBeInTheDocument();
  expect(screen.queryByText('secret admin surface')).not.toBeInTheDocument();
});
