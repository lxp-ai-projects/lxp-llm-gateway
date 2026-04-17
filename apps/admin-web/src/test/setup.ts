import '@testing-library/jest-dom/vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverMock {
  observe() {
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: () => 'blob:test-url',
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
  writable: true,
  value: () => undefined,
});
