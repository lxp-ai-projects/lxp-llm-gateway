export function registerServiceWorker() {
  if (typeof navigator.serviceWorker === 'undefined') {
    return;
  }

  void navigator.serviceWorker.getRegistrations?.().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}
