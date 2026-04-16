const AUTO_SCROLL_THRESHOLD_PX = 48;

export function shouldStickToBottom(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
): boolean {
  return scrollHeight - (scrollTop + clientHeight) <= AUTO_SCROLL_THRESHOLD_PX;
}

export function scrollChatToBottom(container: Pick<HTMLElement, 'scrollTop' | 'scrollHeight'>): void {
  container.scrollTop = container.scrollHeight;
}
