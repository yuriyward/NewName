# ADR 001: MediaInfo Three-Tier Architecture

## Status

Accepted

## Context

The extension needs to analyze media files (videos, audio) to extract metadata like duration, codec, resolution, and bitrate for intelligent filename generation. This analysis must happen before the download completes to suggest a filename during the `onDeterminingFilename` event.

### Constraints

1. **Chrome MV3 Service Workers**: Background service workers cannot execute WASM code due to CSP restrictions (no `unsafe-eval`)
2. **CORS Requirements**: Media URLs from arbitrary domains require proper origin headers for range requests
3. **Bandwidth Efficiency**: Cannot download entire large media files (multi-GB) just to extract metadata
4. **MediaInfo.js Requirements**: Requires WASM execution and range-based streaming support

## Decision

Implement a three-tier architecture with distinct responsibilities:

```
Background Service Worker → Offscreen Document → Sandboxed Iframe
```

### Tier 1: Background Service Worker
- **Role**: Download interception and coordination
- **Capabilities**: Can intercept downloads, has full extension APIs
- **Limitations**: Cannot execute WASM, cannot make CORS requests to arbitrary origins
- **Responsibilities**:
  - Listen to `chrome.downloads.onDeterminingFilename`
  - Queue media analysis requests
  - Apply analysis results to filename suggestions
  - Track download lifecycle

### Tier 2: Offscreen Document
- **Role**: Network bridge and lifecycle management
- **Capabilities**: Has proper document origin for CORS, can create sandboxed iframes
- **Limitations**: Cannot execute WASM (CSP restrictions)
- **Responsibilities**:
  - Create and manage sandboxed iframe lifecycle
  - Perform range-based HTTP fetches with proper CORS headers
  - Stream chunks between network and sandbox
  - Handle analysis timeouts and cleanup

### Tier 3: Sandboxed Iframe
- **Role**: WASM execution environment
- **Capabilities**: Can execute WASM (`unsafe-eval` allowed in sandbox)
- **Limitations**: No network access, no extension APIs
- **Responsibilities**:
  - Initialize MediaInfo.js WASM module
  - Process media chunks via streaming API
  - Extract metadata and return analysis results

## Message Passing Protocol

### Background ↔ Offscreen
- Uses `@webext-core/messaging` library
- Type-safe extension message passing
- Automatic serialization/deserialization

### Offscreen ↔ Sandbox
- Uses `window.postMessage` with typed protocol
- Custom message types defined in `sandbox-protocol.ts`
- `ArrayBuffer` transfer using Transferable objects (zero-copy)

## Bandwidth Optimization

- Uses HTTP Range requests to download only beginning of media file
- Typical analysis requires ~5% of total file size
- Adaptive chunk sizing based on file size
- Early termination when sufficient metadata extracted

## Performance Characteristics

- **Handshake overhead**: ~20ms for offscreen document + sandbox initialization
- **Analysis timeout**: 30 seconds maximum
- **Retry strategy**: 3 attempts with exponential backoff (20ms base)
- **Concurrent analyses**: Queue-based processing with handshake reuse

## Alternatives Considered

### Single-Tier (Background Only)
- **Rejected**: Cannot execute WASM in MV3 service workers

### Two-Tier (Background + Offscreen with inline WASM)
- **Rejected**: Offscreen documents inherit CSP, cannot execute WASM without sandbox

### Two-Tier (Background + Sandbox)
- **Rejected**: Sandboxed contexts cannot make network requests due to origin restrictions

### Server-Side Analysis
- **Rejected**: Privacy concerns (sends URLs to external server), requires backend infrastructure, network dependency

## Consequences

### Positive
- Fully client-side: No privacy concerns, no backend required
- Bandwidth efficient: Only downloads ~5% of media file
- Secure: Each tier operates within browser security boundaries
- Maintainable: Clear separation of concerns

### Negative
- Complexity: Three-tier message passing adds code complexity
- Debugging: Cross-context debugging requires multiple DevTools instances
- Handshake overhead: Initial setup requires ~20ms coordination
- Error handling: Must handle failures at three different levels

### Neutral
- Architecture is unlikely to change unless Chrome MV3 CSP policies are relaxed
- Similar pattern may be reusable for other WASM-based features

## References

- [Chrome Extension Service Workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
- [MediaInfo.js Documentation](https://mediainfo.js.org)
- [Chrome Offscreen Documents](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Content Security Policy for Extensions](https://developer.chrome.com/docs/extensions/develop/concepts/content-security-policy)
