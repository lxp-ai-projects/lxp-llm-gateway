export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  if (!(window.isSecureContext || window.location.hostname === 'localhost')) {
    return;
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js');
  });
}
