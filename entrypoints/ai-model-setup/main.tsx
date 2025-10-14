/**
 * React app entry point for AI model onboarding flow
 */
import { HeroUIProvider } from '@heroui/react';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { AIModelSetupPage } from './AIModelSetupPage';
import '@/assets/tailwind.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element with id "root" not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HeroUIProvider>
      <AIModelSetupPage />
    </HeroUIProvider>
  </React.StrictMode>,
);
