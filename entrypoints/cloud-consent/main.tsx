import React from 'react';
import ReactDOM from 'react-dom/client';
import { CloudConsentPage } from './CloudConsentPage';
import '@/assets/tailwind.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <React.StrictMode>
    <CloudConsentPage />
  </React.StrictMode>,
);
