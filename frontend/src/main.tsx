import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1e2535',
                color: '#e8ecf4',
                border: '1px solid #2a3348',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#0d2016' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#1f0a0a' } },
            }}
          />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
