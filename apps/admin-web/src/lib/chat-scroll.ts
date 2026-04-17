const AUTO_SCROLL_THRESHOLD_PX = 48;
const MIN_SCROLL_DELTA_PX = 12;

export function shouldStickToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= AUTO_SCROLL_THRESHOLD_PX;
}

export function scrollChatToBottom(
  container: Pick<HTMLElement, 'scrollTop' | 'scrollHeight' | 'clientHeight'>,
): void {
  if (container.scrollHeight - (container.scrollTop + container.clientHeight) <= MIN_SCROLL_DELTA_PX) {
    return;
  }

  container.scrollTop = container.scrollHeight - container.clientHeight;
}
