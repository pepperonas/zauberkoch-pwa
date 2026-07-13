import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { SnackbarProvider } from './components/ui/Snackbar';
import { AppProvider } from './state/app';
import { ViewTransitionProvider } from './state/viewTransition';
import './styles/tokens.css';
import './styles/base.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// We own scroll restoration (reset on forward nav, restore on back) coordinated
// with the route transition — stop the browser from racing it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ViewTransitionProvider>
          <AppProvider>
            <SnackbarProvider>
              <App />
            </SnackbarProvider>
          </AppProvider>
        </ViewTransitionProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
