/**
 * Background service worker for extension lifecycle management
 */
import { registerInstallDateListener } from './shared/integrations/install-date';

export default defineBackground(() => {
  registerInstallDateListener();
  console.log('Hello background!', { id: browser.runtime.id });
});
