import type { ReactElement, ReactNode } from 'react';
import { Fragment } from 'react';
import { Text, Title } from '@mantine/core';
import type { TitleOrder } from '@mantine/core';

type MarkdownTextProps = {
  value: string;
  dimmed?: boolean;
};

function renderInlineMarkdown(value: string): ReactNode[] {
  const tokens = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).filter(Boolean);

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

function renderMarkdownBlocks(value: string, dimmed = false): ReactElement[] {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactElement[] = [];
  let listItems: Array<{ kind: 'ordered' | 'unordered'; text: string }> = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    blocks.push(
      <Text className="markdown-block" c={dimmed ? 'dimmed' : undefined} key={`paragraph-${blocks.length}`}>
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
          <li key={`${item.kind}-${index}`}>{renderInlineMarkdown(item.text)}</li>
        ))}
      </ListTag>,
    );
    listItems = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const headingOrder = Math.min(headingMatch[1].length + 1, 4) as TitleOrder;
      blocks.push(
        <Title className="markdown-heading" key={`heading-${blocks.length}`} order={headingOrder}>
          {renderInlineMarkdown(headingMatch[2])}
        </Title>,
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushParagraph();
      flushList();
      blocks.push(<hr className="markdown-divider" key={`divider-${blocks.length}`} />);
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
  return <div className="markdown-text">{renderMarkdownBlocks(value, dimmed)}</div>;
}
