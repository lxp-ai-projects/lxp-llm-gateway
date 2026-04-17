import { fireEvent, screen, waitFor } from '@testing-library/react';
import { test, expect, vi, afterEach } from 'vitest';

import { InstallAppButton } from './install-app-button';
import { renderWithProviders } from '../test/test-utils';

afterEach(() => {
  vi.restoreAllMocks();
});

test('InstallAppButton appears after beforeinstallprompt and triggers prompt', async () => {
  const prompt = vi.fn(async () => undefined);
  const userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });
  const event = new Event('beforeinstallprompt');
  Object.assign(event, {
    prompt,
    userChoice,
    preventDefault: vi.fn(),
  });

  renderWithProviders(<InstallAppButton />);
  expect(screen.queryByRole('button', { name: /install app/i })).not.toBeInTheDocument();

  fireEvent(window, event);

  const [button] = await screen.findAllByRole('button', { name: /install app/i });
  fireEvent.click(button);

  await waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
});
