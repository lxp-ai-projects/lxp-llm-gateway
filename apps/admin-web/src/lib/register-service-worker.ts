export function registerServiceWorker() {
  if (typeof navigator.serviceWorker === 'undefined') {
    return;
  }

  void (async () => {
    try {
      const registrations =
        (await navigator.serviceWorker.getRegistrations?.()) ?? [];
      await Promise.all(
        registrations.map(async (registration) => {
          try {
            await registration.unregister();
          } catch {
            // Ignore cleanup failures while retiring the service worker path.
          }
        }),
      );
    } catch {
      // Ignore cleanup failures while retiring the service worker path.
    }
  })();
}
