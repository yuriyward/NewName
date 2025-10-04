/**
 * React popup entry point and application bootstrapping
 */

import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import '@/assets/tailwind.css';
import { updateSettings } from '@/entrypoints/shared/settings/settings';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

// Enable debug mode
await updateSettings({
  debug: {
    enabled: true,
    level: 'detailed',
  },
});

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </React.StrictMode>,
);
