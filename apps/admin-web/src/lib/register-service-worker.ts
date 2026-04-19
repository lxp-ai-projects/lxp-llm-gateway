export function registerServiceWorker() {
  if (typeof navigator.serviceWorker === 'undefined') {
    return;
  }

  if (!import.meta.env.PROD) {
    void navigator.serviceWorker.getRegistrations?.().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
    return;
  }

  if (typeof navigator.serviceWorker.register !== 'function') {
    return;
  }

  if (!(window.isSecureContext || window.location.hostname === 'localhost')) {
    return;
  }

  window.addEventListener('load', () => {
    if (typeof navigator.serviceWorker?.register !== 'function') {
      return;
    }

    void navigator.serviceWorker.register('/service-worker.js');
  });
}
