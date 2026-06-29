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

Object.defineProperty(document, 'fonts', {
  configurable: true,
  writable: true,
  value: {
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  },
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

Object.defineProperty(Element.prototype, 'scrollIntoView', {
  writable: true,
  value: () => undefined,
});

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  writable: true,
  value: {
    writeText: async () => undefined,
  },
});

Object.defineProperty(navigator, 'serviceWorker', {
  configurable: true,
  writable: true,
  value: {
    register: async () => ({ scope: '/' }),
  },
});
