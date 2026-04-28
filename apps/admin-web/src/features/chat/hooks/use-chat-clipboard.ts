import { useEffect, useRef, useState } from 'react';

import { copyText } from '../../../lib/copy-text';

export function useChatClipboard(setChatError: (value: string | null) => void) {
  const [copiedAssistantMessageId, setCopiedAssistantMessageId] = useState<
    string | null
  >(null);
  const copiedMessageTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedMessageTimeoutRef.current !== null) {
        window.clearTimeout(copiedMessageTimeoutRef.current);
      }
    };
  }, []);

  async function copyAssistantMessage(
    messageId: string,
    content: string,
  ): Promise<void> {
    try {
      await copyText(content);
      setCopiedAssistantMessageId(messageId);

      if (copiedMessageTimeoutRef.current !== null) {
        window.clearTimeout(copiedMessageTimeoutRef.current);
      }

      copiedMessageTimeoutRef.current = window.setTimeout(() => {
        setCopiedAssistantMessageId(null);
        copiedMessageTimeoutRef.current = null;
      }, 1800);
    } catch {
      setChatError(
        'Unable to copy the assistant response from this browser session.',
      );
    }
  }

  return {
    copiedAssistantMessageId,
    copyAssistantMessage,
  };
}
