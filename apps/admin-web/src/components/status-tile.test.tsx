import { screen } from '@testing-library/react';
import { test, expect } from 'vitest';

import { StatusTile } from './status-tile';
import { renderWithProviders } from '../test/test-utils';

test('StatusTile renders neutral content with fallback badge text', () => {
  renderWithProviders(<StatusTile label="Session" value="Authenticated" />);

  expect(screen.getByText('Session')).toBeInTheDocument();
  expect(screen.getByText('Authenticated')).toBeInTheDocument();
  expect(screen.getByText('live')).toBeInTheDocument();
});

test('StatusTile renders a custom icon and warning tone', () => {
  renderWithProviders(<StatusTile label="Gateway" value="Offline" tone="warning" icon={<span>icon</span>} />);

  expect(screen.getByText('Gateway')).toBeInTheDocument();
  expect(screen.getByText('Offline')).toBeInTheDocument();
  expect(screen.getByText('icon')).toBeInTheDocument();
});
