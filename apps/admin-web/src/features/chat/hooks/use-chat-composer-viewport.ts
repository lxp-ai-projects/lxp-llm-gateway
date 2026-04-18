import { type CSSProperties, useLayoutEffect, useState } from 'react';

export function useChatComposerViewport(
  panelRef: React.RefObject<HTMLDivElement | null>,
  dependency: string,
): Pick<CSSProperties, 'left' | 'width'> {
  const [composerViewportStyle, setComposerViewportStyle] = useState<
    Pick<CSSProperties, 'left' | 'width'>
  >({});

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }

    const updateComposerViewportStyle = () => {
      const rect = panel.getBoundingClientRect();
      setComposerViewportStyle({
        left: `${Math.max(rect.left, 16)}px`,
        width: `${Math.max(rect.width, 0)}px`,
      });
    };

    updateComposerViewportStyle();

    const resizeObserver = new ResizeObserver(() => {
      updateComposerViewportStyle();
    });
    resizeObserver.observe(panel);
    window.addEventListener('resize', updateComposerViewportStyle);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateComposerViewportStyle);
    };
  }, [panelRef, dependency]);

  return composerViewportStyle;
}
