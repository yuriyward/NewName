/**
 * Settings page entry point
 */
import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { SettingsPage } from './SettingsPage';
import '@/assets/tailwind.css';

const root = document.getElementById('root');

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <HeroUIProvider>
        <SettingsPage />
      </HeroUIProvider>
    </React.StrictMode>,
  );
}
