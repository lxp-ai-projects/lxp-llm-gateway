export function registerServiceWorker() {
  if (typeof navigator.serviceWorker?.register !== 'function') {
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
