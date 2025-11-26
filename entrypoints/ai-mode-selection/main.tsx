import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AiModeSelectionPage } from './AiModeSelectionPage';
import '@/assets/tailwind.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <StrictMode>
    <AiModeSelectionPage />
  </StrictMode>,
);
