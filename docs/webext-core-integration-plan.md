# WebExt Core Messaging & Proxy Integration Plan

## Current cross-context communication
- `entrypoints/content.ts:80` batches page context payloads and calls `browser.runtime.sendMessage`, handling retries, exponential backoff, and deferred replays manually.
- `entrypoints/background.ts:167` subscribes directly to `browser.runtime.onMessage` and switches on the discriminated union from `ContentToBackgroundMessage` to update the page-context store.
- `entrypoints/shared/messaging/content-messages.ts:4` hard-codes the message union and duplicates payload shapes that already exist in the page-context store types.
- No other modules currently send runtime messages, so background↔content communication is one-way; UIs rely on shared storage modules (`settings`, `history`) rather than messaging for coordination.

## Limitations of the current approach
- Manual wiring to the runtime API lacks protocol-level typing across contexts; adding new message types requires duplicating literal strings and payload contracts in multiple files.
- Retry logic in `entrypoints/content.ts:80` duplicates concern-specific queueing that `@webext-core/messaging` already abstracts via promise-based send semantics, and failures resolve silently without caller insight.
- Background logic that mutates `page-context-store` is hidden behind message handlers, making it hard to reuse from other contexts (e.g., popup or tests) without reimplementing message glue.
- There is no structured channel for the background script to push events back to popups or other contexts; future flows (history viewer, rename previews) would need to reinvent another messaging layer.

## Target architecture with @webext-core/messaging
- Define a single protocol map (e.g., `ExtensionProtocol`) under `entrypoints/shared/messaging/extension-messaging.ts` using `defineExtensionMessaging` so message names and payload contracts stay in one place.
- Expose focused helpers (`sendExtensionMessage.pageContextUpdated`, `onExtensionMessage.linkContext`, etc.) that wrap the generated `sendMessage`/`onMessage` and hide raw runtime APIs from feature code.
- Use typed return values for acknowledgement/diagnostics where useful (e.g., background can return whether the context was stored) instead of relying on fire-and-forget semantics.
- Reserve additional protocol slots for background→UI broadcasts (history updates, rename previews), allowing future consumers to subscribe without touching low-level listeners.

## Target architecture with @webext-core/proxy-service
- Extract `PageContextService` in `entrypoints/shared/services/page-context-service.ts`, wrapping `updatePageContext`, `clearPageContext`, and `getPageContext` from `entrypoints/shared/state/page-context-store.ts:39`.
- Register the service inside `entrypoints/background.ts` during `defineBackground` setup so the real implementation only exists in the service worker.
- Replace content script message dispatch with proxy calls (`getPageContextService().publishSnapshot(...)`) so content code uses a typed async API and leaves transport/retry concerns to the proxy layer.
- Evaluate additional proxy surfaces: a `HistoryService` around `entrypoints/shared/history/history.ts:101`, and an `InstantBaselineService` that wraps rename evaluations for popup/on-demand flows, keeping data access in the background.

## Migration steps
1. **Introduce shared protocol module**: create `entrypoints/shared/messaging/extension-messaging.ts`, define the protocol map, and export typed helpers; update existing message union definitions to reuse these types.
2. **Refactor background listeners**: swap `browser.runtime.onMessage.addListener` for `onExtensionMessage.pageContextUpdated`/`onExtensionMessage.linkContext` handlers, performing sender validation in one place and returning structured outcomes.
3. **Update content publisher**: layer the current retry/backoff queue on top of the new `sendExtensionMessage` helpers (or simplify once proxy adoption lands), guaranteeing promise rejection surfaces to callers.
4. **Introduce and register `PageContextService`**: wrap store mutations, register in background startup, and expose `getPageContextService()` for content scripts; migrate `content.ts` to call the proxy service and delete the manual messaging queue once parity is confirmed.
5. **Add background→UI events**: leverage the messaging protocol to broadcast when history entries are added or settings change, enabling popup components to subscribe without bespoke storage polling.
6. **Extend proxy coverage**: after page-context flow parity, encapsulate history reads/writes and rename evaluations behind additional proxy services so all storage and download logic executes in the background.
7. **Cleanup and documentation**: remove `ContentToBackgroundMessage`, consolidate type definitions, and update `docs/PRD-technical-perspective.md:44` (and other references) to describe the new messaging/service architecture.

## Testing and rollout checklist
- Run `bun run test`, `bun run verify`, and targeted manual download checks to ensure proxy-based context updates do not regress rename suggestions.
- Add unit coverage for `PageContextService` (mocking the proxy) and integration tests that exercise the messaging helpers end-to-end via `fakeBrowser`.
- Smoke the popup after proxy adoption to confirm settings flows remain unaffected and new background events do not introduce race conditions.

## Open questions / follow-ups
- Decide whether content should keep a lightweight retry layer on top of proxy calls or rely on proxy-service error propagation alone for resiliency.
- Determine how to expose tab identifiers through the proxy cleanly when calls originate from non-tab contexts (e.g., popup) so background can scope page-context access safely.
- Confirm whether future contextual-upgrade flows need bidirectional streaming; if so, evaluate `definePortMessaging` (from @webext-core) before implementation to avoid another migration.
