export type StreamableHttpResponse = {
  status(code: number): StreamableHttpResponse;
  setHeader(name: string, value: string): void;
  flushHeaders?(): void;
  end(chunk?: string): void;
};
