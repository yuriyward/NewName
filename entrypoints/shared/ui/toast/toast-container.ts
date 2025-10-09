/**
 * Toast container and Shadow DOM creation utilities.
 */
import shadowDomStyles from '@/assets/tailwind.css?inline';

export const TOAST_ROOT_ID = 'newname-confirm-toast-root';

function createStyleElement(): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = shadowDomStyles;
  return style;
}

/**
 * Creates the Shadow DOM container for toast rendering.
 */
export function createContainer(): {
  host: HTMLDivElement;
  shadow: ShadowRoot;
  mount: HTMLDivElement;
} {
  const host = document.createElement('div');
  host.id = TOAST_ROOT_ID;
  host.setAttribute('data-newname', 'confirm-toast');
  // Specific resets instead of nuclear 'all: initial' to allow CSS inheritance
  host.style.position = 'fixed';
  host.style.zIndex = '2147483647';
  host.style.pointerEvents = 'none';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'closed' });
  const mount = document.createElement('div');
  shadow.appendChild(createStyleElement());
  shadow.appendChild(mount);
  return { host, shadow, mount };
}
