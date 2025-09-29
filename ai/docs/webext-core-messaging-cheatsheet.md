# WebExt Core Cheat Sheet

Quick reference for using `@webext-core/messaging` and `@webext-core/proxy-service` inside NewName.

## Messaging (`@webext-core/messaging`)

### Define the protocol once

```ts
// entrypoints/shared/messaging/extension-messaging.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

export interface ExtensionMessagingProtocol {
  resolveRuntimeContext(): {
    tabId?: number;
    frameId?: number;
    url?: string | null;
  };
}

export const {
  sendMessage: sendExtensionMessage,
  onMessage: onExtensionMessage,
} = defineExtensionMessaging<ExtensionMessagingProtocol>();
```

### Register listeners in the background

```ts
// entrypoints/background.ts
onExtensionMessage('resolveRuntimeContext', ({ sender }) => ({
  tabId: sender.tab?.id ?? undefined,
  frameId: sender.frameId,
  url: sender.url ?? sender.tab?.url ?? null,
}));
```

- Listener receives a typed `message` object (`data`, `sender`, etc.).
- Return values become the promise result for the caller.
- Add new protocol entries here when more background handlers are needed.

### Call from any context

```ts
const runtimeContext = await sendExtensionMessage('resolveRuntimeContext');
```

- Calls always return promises.
- Optional second argument lets you target a specific tab/frame if required (`sendExtensionMessage('type', data, { tabId, frameId }))`.
- Prefer using targeted helpers exported from `extension-messaging.ts` so features avoid raw string literals.

## Proxy services (`@webext-core/proxy-service`)

### Define & register the service

```ts
// entrypoints/shared/state/page-context-service.ts
export const [registerPageContextService, getPageContextService] =
  defineProxyService('PageContextService', () => ({
    async publish({ tabId, url, context }) {
      const normalizedUrl = typeof url === 'string' ? url : undefined;
      if (typeof tabId === 'number' && Number.isFinite(tabId)) {
        updatePageContext(tabId, context, normalizedUrl);
        return;
      }
      if (normalizedUrl) {
        updatePageContextByUrl(normalizedUrl, context);
      }
    },
    async read({ tabId, url }) {
      if (typeof tabId === 'number' && Number.isFinite(tabId)) {
        const context = getPageContext(tabId);
        if (context) return context;
      }
      if (typeof url === 'string' && url.length > 0) {
        return getPageContextByUrl(url);
      }
      return null;
    },
    async clear(tabId) {
      if (typeof tabId === 'number' && Number.isFinite(tabId)) {
        clearPageContext(tabId);
      }
    },
    async prune() {
      pruneStaleContexts();
    },
  }));
```

```ts
// entrypoints/background.ts
const pageContextService = registerPageContextService();
```

- Register only in the background (typically inside `defineBackground`).
- The returned service instance (`pageContextService`) is the real implementation; only available in background.

### Consume the proxy from other contexts

```ts
// entrypoints/content.ts
await getPageContextService().publish({
  tabId,
  url: document.location.href,
  context: {
    title,
    heading,
  },
});
```

- `getPageContextService()` returns a proxy; calls are marshalled back to background automatically.
- Proxy methods are always async. Await the promise to handle errors.
- If the background throws, the proxy rejects with the same error.

### Tips

- Always derive the service name (`'PageContextService'`) from domain intent. Each must be globally unique.
- Keep service methods granular (publish/read/clear/etc.) so they compose well for multiple consumers.
- Need dependencies when registering? Accept them as args in `registerPageContextService(...)` and pass them from the background.

## Patterns to follow

- **Add protocol entries + listeners together**: update the `ExtensionMessagingProtocol` interface and register the handler in `background.ts` before calling from other contexts.
- **Reuse domain helpers**: services should delegate to domain modules (`page-context-store`, `history`, etc.), keeping business logic centralized.
- **Handle retries at the edge**: contexts that publish frequently (like content scripts) can wrap proxy calls with retry logic, but the service itself should remain side-effect free beyond the delegated work.
- **Testing**: use `@webext-core/fake-browser` to stub messaging when running Vitest; register the service in test setup and call proxy functions just like production code.

## Common errors & fixes

| Symptom | Likely Cause | Fix |
| --- | --- | --- |
| `Browser.runtime.getManifest not implemented` during build/test | Proxy accessed before registration (e.g., top-level `getService()` in background) | Only call `getService()` outside the background or after `registerService()` runs. Content scripts should `getService()` lazily when sending a request. |
| `No listener found for message type` | Forgot to register handler in background | Add `onExtensionMessage('type', handler)` before using `sendExtensionMessage('type', ...)`. |
| Proxy call never resolves | Method throws synchronously in background without returning/awaiting | Ensure service methods `await` async work and propagate errors with `throw`. |
| Type mismatch | Protocol/service interface out of sync | Update shared interface definitions and re-run `bun run compile`. |

## Quick checklist when adding a new flow

1. Extend `ExtensionMessagingProtocol` (and docblock) if you need a new background interaction.
2. Register the handler in `background.ts`.
3. Export helper functions (or proxies) from shared modules so callers avoid stringly-typed usage.
4. If lots of stateful work lives in background, wrap it with `defineProxyService` and expose only async methods.
5. Add Vitest coverage using `fakeBrowser` for messaging + direct unit tests for service logic.

Refer back to `ai/docs/WebExt-Core.md` for the broader coverage and documentation.
