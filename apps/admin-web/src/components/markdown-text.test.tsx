import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';

import { renderWithProviders } from '../test/test-utils';
import { MarkdownText } from './markdown-text';

test('MarkdownText renders headings, emphasis, and lists', () => {
  renderWithProviders(
    <MarkdownText
      value={`### Title

**Bold** and *italic*

- first
- second`}
    />,
  );

  expect(screen.getByText('Title')).toBeInTheDocument();
  expect(screen.getByText('Bold').tagName).toBe('STRONG');
  expect(screen.getByText('italic').tagName).toBe('EM');
  expect(screen.getByText('first')).toBeInTheDocument();
  expect(screen.getByText('second')).toBeInTheDocument();
});
