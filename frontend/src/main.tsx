import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';

import { router } from './App';
import { SnackbarProvider } from './components/ui/Snackbar';
import { AppProvider } from './state/app';
import './styles/tokens.css';
import './styles/base.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// react-router owns scroll restoration (via <ScrollRestoration/> in the shell),
// coordinated with its view transitions — stop the browser from racing it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

// AppProvider / SnackbarProvider use no router hooks, so they wrap the router;
// their context stays available to every route element.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <SnackbarProvider>
          <RouterProvider router={router} />
        </SnackbarProvider>
      </AppProvider>
    </QueryClientProvider>
  </StrictMode>,
);
