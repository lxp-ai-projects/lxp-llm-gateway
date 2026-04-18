import React from 'react';
import ReactDOM from 'react-dom/client';
import '@mantine/core/styles.css';
import { RouterProvider } from 'react-router-dom';

import { AppProviders } from './app/providers';
import { router } from './app/router';
import { registerServiceWorker } from './lib/register-service-worker';
import './styles.css';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
