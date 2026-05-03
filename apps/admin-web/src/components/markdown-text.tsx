import { Text, Title } from '@mantine/core';
import type { TitleOrder } from '@mantine/core';
import type { ReactElement, ReactNode } from 'react';
import { Fragment } from 'react';

type MarkdownTextProps = {
  value: string;
  dimmed?: boolean;
};

type ParsedMarkdownTable = {
  headers: string[];
  rows: string[][];
};

function normalizeMarkdownSource(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => {
      if (line.includes('|')) {
        return line;
      }

      return line
        .replace(/\s+(---+)\s+(#{1,6}\s+)/g, '\n\n$1\n\n$2')
        .replace(/([.!?:"')])\s+(#{1,6}\s+)/g, '$1\n\n$2')
        .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
        .replace(/([.!?:"')])\s+(---+)\s+/g, '$1\n\n$2\n\n')
        .replace(/\s+(---+)\s+/g, '\n\n$1\n\n')
        .replace(/([.!?:"')])\s+(\d+\.\s+)/g, '$1\n$2')
        .replace(/([.!?:"')])\s+([*-]\s+)/g, '$1\n$2');
    })
    .join('\n');
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const tokens = value
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
    .filter(Boolean);

  return tokens.map((token, index) => {
    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={`${token}-${index}`}>{token.slice(2, -2)}</strong>;
    }

    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={`${token}-${index}`}>{token.slice(1, -1)}</em>;
    }

    if (token.startsWith('`') && token.endsWith('`')) {
      return <code key={`${token}-${index}`}>{token.slice(1, -1)}</code>;
    }

    return <Fragment key={`${token}-${index}`}>{token}</Fragment>;
  });
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = parseMarkdownTableRow(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-{3,}:?$/.test(cell))
  );
}

function parseMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function tryParseMarkdownTable(lines: string[], startIndex: number): {
  table: ParsedMarkdownTable;
  nextIndex: number;
} | null {
  const headerLine = lines[startIndex]?.trim() ?? '';
  const separatorLine = lines[startIndex + 1]?.trim() ?? '';

  if (!headerLine.includes('|') || !isMarkdownTableSeparator(separatorLine)) {
    return null;
  }

  const headers = parseMarkdownTableRow(headerLine);
  if (!headers.length) {
    return null;
  }

  const rows: string[][] = [];
  let nextIndex = startIndex + 2;

  while (nextIndex < lines.length) {
    const candidate = lines[nextIndex]?.trim() ?? '';
    if (!candidate || !candidate.includes('|')) {
      break;
    }

    rows.push(parseMarkdownTableRow(candidate));
    nextIndex += 1;
  }

  return {
    table: {
      headers,
      rows,
    },
    nextIndex,
  };
}

function renderMarkdownBlocks(value: string, dimmed = false): ReactElement[] {
  const lines = normalizeMarkdownSource(value).split('\n');
  const blocks: ReactElement[] = [];
  let listItems: Array<{ kind: 'ordered' | 'unordered'; text: string }> = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    blocks.push(
      <Text
        className="markdown-block"
        c={dimmed ? 'dimmed' : undefined}
        key={`paragraph-${blocks.length}`}
      >
        {renderInlineMarkdown(paragraphLines.join(' '))}
      </Text>,
    );
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    const isOrdered = listItems[0]?.kind === 'ordered';
    const ListTag = isOrdered ? 'ol' : 'ul';
    blocks.push(
      <ListTag className="markdown-list" key={`list-${blocks.length}`}>
        {listItems.map((item, index) => (
          <li key={`${item.kind}-${index}`}>
            {renderInlineMarkdown(item.text)}
          </li>
        ))}
      </ListTag>,
    );
    listItems = [];
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex] ?? '';
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const headingOrder = Math.min(
        headingMatch[1].length + 1,
        4,
      ) as TitleOrder;
      blocks.push(
        <Title
          className="markdown-heading"
          key={`heading-${blocks.length}`}
          order={headingOrder}
        >
          {renderInlineMarkdown(headingMatch[2])}
        </Title>,
      );
      continue;
    }

    const parsedTable = tryParseMarkdownTable(lines, lineIndex);
    if (parsedTable) {
      flushParagraph();
      flushList();
      blocks.push(
        <div className="markdown-table-scroll" key={`table-${blocks.length}`}>
          <table className="markdown-table">
            <thead>
              <tr>
                {parsedTable.table.headers.map((header, index) => (
                  <th key={`header-${index}`}>
                    {renderInlineMarkdown(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {parsedTable.table.rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>
                      {renderInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      lineIndex = parsedTable.nextIndex - 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(
        <hr className="markdown-divider" key={`divider-${blocks.length}`} />,
      );
      continue;
    }

    const orderedMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (orderedMatch) {
      flushParagraph();
      listItems.push({ kind: 'ordered', text: orderedMatch[1] });
      continue;
    }

    const unorderedMatch = /^[-*]\s+(.*)$/.exec(trimmed);
    if (unorderedMatch) {
      flushParagraph();
      listItems.push({ kind: 'unordered', text: unorderedMatch[1] });
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  flushParagraph();
  flushList();

  return blocks;
}

export function MarkdownText({ value, dimmed = false }: MarkdownTextProps) {
  return (
    <div className="markdown-text">{renderMarkdownBlocks(value, dimmed)}</div>
  );
}
