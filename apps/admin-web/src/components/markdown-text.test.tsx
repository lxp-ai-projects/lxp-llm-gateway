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

test('MarkdownText normalizes inline markdown blocks emitted in a single paragraph', () => {
  renderWithProviders(
    <MarkdownText
      value={`Rose noire et baie de genievre. ### Ce que les fans disent\n1. Premier point\n2. Deuxieme point`}
    />,
  );

  expect(screen.getByText('Ce que les fans disent')).toBeInTheDocument();
  expect(screen.getByText('Premier point')).toBeInTheDocument();
  expect(screen.getByText('Deuxieme point')).toBeInTheDocument();
});

test('MarkdownText separates a horizontal rule from an inline heading marker', () => {
  renderWithProviders(
    <MarkdownText
      value={`Citation parfum. --- ### Mon avis perso\n- Premier point`}
    />,
  );

  expect(screen.getByText('Mon avis perso')).toBeInTheDocument();
  expect(screen.queryByText(/^###/)).not.toBeInTheDocument();
  expect(screen.getByText('Premier point')).toBeInTheDocument();
});

test('MarkdownText renders level 4 headings', () => {
  renderWithProviders(
    <MarkdownText
      value={`#### 2️⃣ Scène 2 : Le Dîner (ou comment te rendre fou avant même le dessert)`}
    />,
  );

  expect(
    screen.getByText(
      '2️⃣ Scène 2 : Le Dîner (ou comment te rendre fou avant même le dessert)',
    ),
  ).toBeInTheDocument();
  expect(screen.queryByText(/^####/)).not.toBeInTheDocument();
});

test('MarkdownText renders GitHub-style tables', () => {
  renderWithProviders(
    <MarkdownText
      value={`| Provider | Status |
| --- | --- |
| Anthropic | Native |
| Mistral | Compatible |`}
    />,
  );

  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Anthropic' })).toBeInTheDocument();
  expect(screen.getByRole('cell', { name: 'Compatible' })).toBeInTheDocument();
});
