export function shouldAttemptSessionRefresh(status: number, hasRetried: boolean): boolean {
  return status === 401 && !hasRetried;
}
