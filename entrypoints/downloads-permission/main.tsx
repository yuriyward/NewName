import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { DownloadsPermissionPage } from './DownloadsPermissionPage';
import '@/assets/tailwind.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <DownloadsPermissionPage />
    </HeroUIProvider>
  </React.StrictMode>,
);
