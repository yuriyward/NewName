================
CODE SNIPPETS
================
TITLE: Install and Run Demo Extension
DESCRIPTION: Steps to install dependencies, build the project, navigate to the messaging demo package, and start the development server using pnpm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
cd webext-core
pnpm i
pnpm build
cd packages/messaging-demo
pnpm dev
```

--------------------------------

TITLE: Install and Run Demo Extension
DESCRIPTION: Steps to install dependencies, build the project, navigate to the messaging demo package, and start the development server using pnpm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging-demo/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
cd webext-core
pnpm i
pnpm build
cd packages/messaging-demo
pnpm dev
```

--------------------------------

TITLE: Install @webext-core/storage
DESCRIPTION: Installs the @webext-core/storage package using pnpm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/storage/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
pnpm i @webext-core/storage
```

--------------------------------

TITLE: Injected Script Messaging Example
DESCRIPTION: Shows how an injected script receives an initialization message, performs its setup, and then sends a message back to the content script using the defined messenger.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_9

LANGUAGE: ts
CODE:
```
import { websiteMessenger } from './website-messaging';

websiteMessenger.onMessage('init', data => {
  // initialize injected script

  // eventually, send data back to the content script
  websiteMessenger.sendMessage('somethingHappened', { ... });
});
```

--------------------------------

TITLE: Install with NPM
DESCRIPTION: Install the @webext-core/match-patterns package using npm or pnpm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/match-patterns
```

--------------------------------

TITLE: Install @webext-core/match-patterns
DESCRIPTION: Command to install the @webext-core/match-patterns package using pnpm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/match-patterns/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
pnpm i @webext-core/match-patterns
```

--------------------------------

TITLE: Install Dependencies and Build Project
DESCRIPTION: Steps to clone the repository, install project dependencies using Bun, and build all packages for the first time.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/2.contributing.md#_snippet_0

LANGUAGE: shell
CODE:
```
git clone {your-fork}
cd webext-core
bun i
bun run build
```

--------------------------------

TITLE: Install via CDN
DESCRIPTION: Download the library using curl for CDN installation.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_2

LANGUAGE: sh
CODE:
```
curl -o match-patterns.js https://cdn.jsdelivr.net/npm/@webext-core/match-patterns/lib/index.global.js
```

--------------------------------

TITLE: Install fake-browser Package
DESCRIPTION: Installs the @webext-core/fake-browser package as a development dependency using pnpm. This package provides an in-memory implementation of webextension-polyfill for testing.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i -D @webext-core/fake-browser

```

--------------------------------

TITLE: Install @webext-core/fake-browser
DESCRIPTION: Installs the `@webext-core/fake-browser` package as a development dependency using pnpm. This package provides an in-memory implementation of `webextension-polyfill` for testing purposes.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/fake-browser/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
pnpm i -D @webext-core/fake-browser
```

--------------------------------

TITLE: Install @webext-core/proxy-service via NPM
DESCRIPTION: Command to install the proxy-service library using a package manager like pnpm or npm.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_3

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/proxy-service
```

--------------------------------

TITLE: Install @webext-core/storage via NPM
DESCRIPTION: Installs the @webext-core/storage package using pnpm. This package provides a type-safe, localStorage-like API for browser extension storage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/storage
```

--------------------------------

TITLE: Install @webext-core/storage Package
DESCRIPTION: Installs the `@webext-core/storage` package using pnpm, allowing direct usage within a bundler-supported project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_1

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/storage
```

--------------------------------

TITLE: Install Job Scheduler via NPM
DESCRIPTION: Installs the @webext-core/job-scheduler package using the pnpm package manager. This is the recommended way to add the library to your project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/job-scheduler
```

--------------------------------

TITLE: Install @webext-core/messaging via NPM
DESCRIPTION: Installs the @webext-core/messaging package using pnpm. This is the recommended method for Node.js environments.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/messaging
```

--------------------------------

TITLE: Install Webext-core Packages via npm
DESCRIPTION: Installs essential packages for web extension development using npm. Includes storage, messaging, job scheduling, proxy services, match patterns, isolated elements, and fake browser implementations.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_0

LANGUAGE: bash
CODE:
```
npm i @webext-core/storage
npm i @webext-core/messaging
npm i @webext-core/proxy-service
npm i @webext-core/fake-browser
npm i @webext-core/job-scheduler
npm i @webext-core/match-patterns
npm i @webext-core/isolated-element
```

--------------------------------

TITLE: Install @webext-core/isolated-element
DESCRIPTION: Installs the `@webext-core/isolated-element` package using pnpm. This is the primary method to add the library to your project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/isolated-element/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
pnpm i @webext-core/isolated-element
```

--------------------------------

TITLE: Usage with localExtStorage via CDN (HTML)
DESCRIPTION: Shows how to use the localExtStorage API after including the global script from a CDN. It demonstrates retrieving and setting items asynchronously.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/0.installation.md#_snippet_3

LANGUAGE: html
CODE:
```
<script src="/storage.js"></script>
<script>
  const { localExtStorage } = webExtCoreStorage;

  const value = await localExtStorage.getItem('key');
  await localExtStorage.setItem('key', 123);
</script>
```

--------------------------------

TITLE: Install @webext-core/proxy-service via CDN
DESCRIPTION: Command to download the proxy-service library using curl for direct inclusion via a CDN.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_4

LANGUAGE: sh
CODE:
```
curl -o proxy-service.js https://cdn.jsdelivr.net/npm/@webext-core/proxy-service/lib/index.global.js
```

--------------------------------

TITLE: Install @webext-core/job-scheduler with pnpm
DESCRIPTION: This snippet shows how to install the @webext-core/job-scheduler package using the pnpm package manager. It's a common first step for integrating the library into your web extension project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/job-scheduler/README.md#_snippet_0

LANGUAGE: bash
CODE:
```
pnpm i @webext-core/job-scheduler
```

--------------------------------

TITLE: Install @webext-core/isolated-element via NPM
DESCRIPTION: Shows how to install the `@webext-core/isolated-element` package using npm or pnpm. This is the primary method for adding the library to your project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm i @webext-core/isolated-element
```

--------------------------------

TITLE: Install @webext-core/storage via CDN
DESCRIPTION: Downloads the global JavaScript file for @webext-core/storage using curl. This file can be included directly in HTML for use in browser extensions.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/0.installation.md#_snippet_2

LANGUAGE: sh
CODE:
```
curl -o storage.js https://cdn.jsdelivr.net/npm/@webext-core/storage/lib/index.global.js
```

--------------------------------

TITLE: Content Script Messaging Example
DESCRIPTION: Demonstrates how a content script injects a script and uses the defined messenger to send an initialization message and listen for subsequent messages from the injected script.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_8

LANGUAGE: ts
CODE:
```
import { websiteMessenger } from './website-messaging';

const script = document.createElement('script');
script.src = browser.runtime.getURL('/path/to/injected.js');
document.head.appendChild(script);

script.onload = () => {
  websiteMessenger.sendMessage('init', { ... });
};

websiteMessenger.onMessage('somethingHappened', (data) => {
  // React to messages from the injected script
});
```

--------------------------------

TITLE: MatchPattern Usage Example
DESCRIPTION: Demonstrates how to instantiate the MatchPattern class and utilize its `includes` method to test URL matching.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/api.md#_snippet_2

LANGUAGE: ts
CODE:
```
const pattern = new MatchPattern("*://google.com/*");

pattern.includes("https://google.com");            // true
pattern.includes("http://youtube.com/watch?v=123") // false
```

--------------------------------

TITLE: Basic Usage with localExtStorage (TypeScript)
DESCRIPTION: Demonstrates the basic usage of the localExtStorage API from @webext-core/storage. It shows how to retrieve and set items, similar to localStorage but with asynchronous operations and type safety.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/0.installation.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { localExtStorage } from '@webext-core/storage';

const value = await localExtStorage.getItem('key');
await localExtStorage.setItem('key', 123);
```

--------------------------------

TITLE: Install @webext-core/messaging via CDN
DESCRIPTION: Downloads the global JavaScript file for @webext-core/messaging using curl. This can be used in HTML files for direct script inclusion.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_1

LANGUAGE: sh
CODE:
```
curl -o messaging.js https://cdn.jsdelivr.net/npm/@webext-core/messaging/lib/index.global.js
```

--------------------------------

TITLE: Download @webext-core/isolated-element via CDN (curl)
DESCRIPTION: Provides instructions to download the global UMD build of the library using `curl` for CDN-based installations.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_2

LANGUAGE: sh
CODE:
```
curl -o isolated-element.js https://cdn.jsdelivr.net/npm/@webext-core/isolated-element/lib/index.global.js
```

--------------------------------

TITLE: Configure Vitest to use @webext-core/fake-browser
DESCRIPTION: Set up Vitest to use `@webext-core/fake-browser` by creating a global mock for `webextension-polyfill`. This involves defining a mock file and updating the Vitest configuration to include the setup file and dependencies.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
// <root>/__mocks__/webextension-polyfill.ts
export { fakeBrowser as default } from '@webext-core/fake-browser';
```

LANGUAGE: TypeScript
CODE:
```
// vitest.setup.ts
import { vi } from 'vitest';

vi.mock('webextension-polyfill');
```

LANGUAGE: TypeScript
CODE:
```
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // List setup file
    setupFiles: ['vitest.setup.ts'],

    // List ALL dependencies that use `webextension-polyfill` under `server.deps.include`.
    // Without this, Vitest can't mock `webextension-polyfill` inside the dependencies, and the
    // actual polyfill will be loaded in tests
    //
    // You can get a list of dependencies using your package manager:
    //   - npm list webextension-polyfill
    //   - yarn list webextension-polyfill
    //   - pnpm why webextension-polyfill
    server: {
      deps: {
        include: ['@webext-core/storage', ...],
      },
    },
  },
});
```

--------------------------------

TITLE: Example Jest Test with @webext-core/fake-browser (TypeScript)
DESCRIPTION: This example demonstrates writing a Jest test using `@webext-core/fake-browser`. It shows how to import `browser` from the mocked polyfill, reset the fake browser state before each test using `fakeBrowser.reset()`, and interact with mocked browser APIs like `browser.storage.local.set` to set up test conditions and assert outcomes.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_6

LANGUAGE: TypeScript
CODE:
```
import browser from 'webextension-polyfill';
import { fakeBrowser } from '@webext-core/fake-browser';
import { localExtStorage } from '@webext-core/storage';

// Normally, the function being tested would be in a different file
function isXyzEnabled(): Promise<boolean> {
  return localExtStorage.getItem('xyz');
}

describe('isXyzEnabled', () => {
  beforeEach(() => {
    // Reset the in-memory state before every test
    fakeBrowser.reset();
  });

  it('should return true when enabled', async () => {
    const expected = true;
    // Use either browser or fakeBrowser to setup your test case
    await browser.storage.local.set({ xyz: expected });

    const actual = await isXyzEnabled();

    expect(actual).toBe(expected);
  });
});
```

--------------------------------

TITLE: Vitest Test Example with @webext-core/fake-browser
DESCRIPTION: Demonstrates how to write a test using `@webext-core/fake-browser` with Vitest. It shows how to reset the fake browser's state before each test and interact with mocked browser APIs like storage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_1

LANGUAGE: TypeScript
CODE:
```
import browser from 'webextension-polyfill';
import { fakeBrowser } from '@webext-core/fake-browser';
import { localExtStorage } from '@webext-core/storage';
import { test, vi } from 'vitest';

// Normally, the function being tested would be in a different file
function isXyzEnabled(): Promise<boolean> {
  return localExtStorage.getItem('xyz');
}

describe('isXyzEnabled', () => {
  beforeEach(() => {
    // Reset the in-memory state before every test
    fakeBrowser.reset();
  });

  it('should return true when enabled', async () => {
    const expected = true;
    // Use either browser or fakeBrowser to setup your test case
    await browser.storage.local.set({ xyz: expected });

    const actual = await isXyzEnabled();

    expect(actual).toBe(expected);
  });
});
```

--------------------------------

TITLE: Jest Test Example with @webext-core/fake-browser
DESCRIPTION: Demonstrates how to write a test using `@webext-core/fake-browser` with Jest. It shows how to reset the fake browser's state before each test and interact with mocked browser APIs like storage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_3

LANGUAGE: JavaScript
CODE:
```
import browser from 'webextension-polyfill';
import { fakeBrowser } from '@webext-core/fake-browser';
import { localExtStorage } from '@webext-core/storage';

// Normally, the function being tested would be in a different file
function isXyzEnabled(): Promise<boolean> {
  return localExtStorage.getItem('xyz');
}

describe('isXyzEnabled', () => {
  beforeEach(() => {
    // Reset the in-memory state before every test
    fakeBrowser.reset();
  });

  it('should return true when enabled', async () => {
    const expected = true;
    // Use either browser or fakeBrowser to setup your test case
    await browser.storage.local.set({ xyz: expected });

    const actual = await isXyzEnabled();

    expect(actual).toBe(expected);
  });
});
```

--------------------------------

TITLE: Demonstrating Message Passing with sendMessage in JavaScript
DESCRIPTION: These JavaScript snippets illustrate different types of messages that can be sent using a `sendMessage` function, likely within a web extension context. They show examples for 'sleep', 'ping', 'ping2', 'throw' (for error handling), and 'unknown' messages, demonstrating various communication patterns.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging-demo/src/entrypoints/popup/index.html#_snippet_1

LANGUAGE: JavaScript
CODE:
```
sendMessage("sleep")
```

LANGUAGE: JavaScript
CODE:
```
sendMessage("ping")
```

LANGUAGE: JavaScript
CODE:
```
sendMessage("ping2")
```

LANGUAGE: JavaScript
CODE:
```
sendMessage("throw")
```

LANGUAGE: JavaScript
CODE:
```
sendMessage("unknown")
```

--------------------------------

TITLE: Conventional Commit Style Example
DESCRIPTION: Illustrates the commit message format used for contributions, including scoped prefixes like 'fix(package-name):' and 'feat(package-name):'. This style influences automated publishing.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/2.contributing.md#_snippet_3

LANGUAGE: shell
CODE:
```
docs: Fixed typos
fix(storage): Some change
feat(proxy-service): Some new feature
chore: Refactored scripts
```

--------------------------------

TITLE: Example: Resetting Storage API State with fakeBrowser.storage.resetState() (JavaScript)
DESCRIPTION: This specific example demonstrates how to synchronously clear the in-memory stored values for `browser.storage.local` by calling `resetState()` on the `storage` API within the `fakeBrowser` instance.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/3.reseting-state.md#_snippet_3

LANGUAGE: JavaScript
CODE:
```
fakeBrowser.storage.resetState()
```

--------------------------------

TITLE: Defining WindowMessagingConfig Interface (TypeScript)
DESCRIPTION: Represents the configuration object passed into the `defineWindowMessaging` function, extending `NamespaceMessagingConfig` for window-specific messaging setups.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_24

LANGUAGE: TypeScript
CODE:
```
interface WindowMessagingConfig extends NamespaceMessagingConfig {}
```

--------------------------------

TITLE: MatchPattern with URL and Location Objects (TypeScript)
DESCRIPTION: This snippet extends the usage of `MatchPattern.includes` to demonstrate its compatibility with `URL` objects and `window.location`. It shows how to pass these standard browser objects directly to the `includes` method for pattern matching.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_5

LANGUAGE: ts
CODE:
```
google.includes(new URL('https://google.com'));
google.includes(window.location);
```

--------------------------------

TITLE: Injected Script Communication in TypeScript
DESCRIPTION: This injected script snippet listens for an 'init' message from the content script, allowing it to perform initial setup. After initialization, it demonstrates sending a 'somethingHappened' message back to the content script, showcasing bidirectional communication using the shared `websiteMessenger`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_13

LANGUAGE: TypeScript
CODE:
```
import { websiteMessenger } from './website-messenging';

websiteMessenger.onMessage('init', data => {
  // initialize injected script

  // eventually, send data back to the content script
  websiteMessenger.sendMessage("somethingHappened", { ... });
});
```

--------------------------------

TITLE: Using localExtStorage in HTML via CDN (HTML)
DESCRIPTION: This HTML snippet demonstrates how to include and use the `@webext-core/storage` library when loaded via a CDN. It shows accessing `localExtStorage` from the global `webExtCoreStorage` object and performing basic get and set operations within a script tag.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/0.installation.md#_snippet_4

LANGUAGE: HTML
CODE:
```
<script src="/storage.js"></script>
<script>
  const { localExtStorage } = webExtCoreStorage;

  const value = await localExtStorage.getItem('key');
  await localExtStorage.setItem('key', 123);
</script>
```

--------------------------------

TITLE: ExtensionStorage Interface Definition
DESCRIPTION: Defines the interface for storage objects, offering asynchronous methods for getting, setting, removing items, and listening to changes. It supports any data type, unlike localStorage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_1

LANGUAGE: ts
CODE:
```
interface ExtensionStorage<TSchema extends AnySchema> {
  clear(): Promise<void>;
  getItem<TKey extends keyof TSchema>(
    key: TKey,
  ): Promise<Required<TSchema>[TKey] | null>;
  setItem<TKey extends keyof TSchema>(
    key: TKey,
    value: TSchema[TKey],
  ): Promise<void>;
  removeItem<TKey extends keyof TSchema>(key: TKey): Promise<void>;
  onChange<TKey extends keyof TSchema>(
    key: TKey,
    cb: OnChangeCallback<TSchema, TKey>,
  ): RemoveListenerCallback;
}
```

LANGUAGE: APIDOC
CODE:
```
ExtensionStorage:
  Interface for storage objects.
  Differences from localStorage:
    - It's async since the web extension storage APIs are async.
    - It can store any data type, not just strings.
  Methods:
    clear(): Promise<void> - Clears all items from the storage.
    getItem(key: TKey): Promise<Required<TSchema>[TKey] | null> - Retrieves an item by its key.
    setItem(key: TKey, value: TSchema[TKey]): Promise<void> - Sets an item with a key and value.
    removeItem(key: TKey): Promise<void> - Removes an item by its key.
    onChange(key: TKey, cb: OnChangeCallback<TSchema, TKey>): RemoveListenerCallback - Registers a callback for changes to a specific key.
```

--------------------------------

TITLE: Get Item from Local Storage
DESCRIPTION: Demonstrates how to retrieve an item from the extension's local storage using `localExtStorage.getItem`. This function is asynchronous and returns the stored value.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/storage/README.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { localExtStorage } from '@webext-core/storage';

const value = await localExtStorage.getItem('some-key');
```

--------------------------------

TITLE: Use MatchPattern in TypeScript
DESCRIPTION: Example demonstrating how to create and use a MatchPattern object in TypeScript to check if URLs are included. It shows creating a pattern for Google domains and testing various URLs against it.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/match-patterns/README.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { MatchPattern } from '@webext-core/match-patterns';

const pattern = MatchPattern('*://*.google.com/*');

pattern.includes('http://google.com/search?q=test'); // true
pattern.includes('https://accounts.google.com'); // true
pattern.includes('https://youtube.com/watch'); // false
```

--------------------------------

TITLE: Synchronized Extension Storage Instance - TypeScript
DESCRIPTION: `syncExtStorage` is a pre-configured instance of `ExtensionStorage` that utilizes the `browser.storage.sync` storage area. This allows data to be synchronized across all instances of the browser where the extension is installed, provided the user is signed in.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_6

LANGUAGE: TypeScript
CODE:
```
const syncExtStorage: ExtensionStorage<AnySchema>;
```

--------------------------------

TITLE: Create and Mount Isolated Element (TypeScript)
DESCRIPTION: A comprehensive example demonstrating the core usage of `createIsolatedElement`. It shows how to create an isolated element with custom CSS and event isolation, then append it to the DOM.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_4

LANGUAGE: ts
CODE:
```
// content-script.ts
import { createIsolatedElement } from '@webext-core/isolated-element';
import browser from 'webextension-polyfill';

const { parentElement, isolatedElement } = await createIsolatedElement({
  name: 'some-name',
  css: {
    url: browser.runtime.getURL('/path/to/styles.css'),
  },
  isolateEvents: true, // or array of event names to isolate, e.g., ['click', 'keydown']
});

// Mount our UI inside the isolated element
const ui = document.createElement('div');
ui.textContent = 'Isolated text';
isolatedElement.appendChild(ui);

// Add the UI to the DOM
document.body.append(parentElement);
```

--------------------------------

TITLE: Getting Job Scheduler Proxy - Content Script - TypeScript
DESCRIPTION: This snippet shows how a content script or UI script can obtain a proxy instance of the job scheduler using `getJobScheduler()`. This proxy allows scheduling and managing jobs from contexts other than the background script, abstracting away the communication details.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_13

LANGUAGE: ts
CODE:
```
import { getJobScheduler } from './job-scheduler';

// Get a proxy instance and use it to schedule more jobs
const jobs = getJobScheduler();
jobs.scheduleJob({
  // ...
});
```

--------------------------------

TITLE: Publishing a New Package Manually
DESCRIPTION: Instructions for publishing a package for the first time, which involves manually publishing the package and creating a release.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/2.contributing.md#_snippet_4

LANGUAGE: shell
CODE:
```
cd packages/package-name
pnpm publish
```

--------------------------------

TITLE: Define Type-Safe Extension Storage Schema
DESCRIPTION: Demonstrates how to define a TypeScript interface for your extension's storage schema and use it with `defineExtensionStorage` for type safety. This setup ensures that storage operations adhere to the defined types, preventing common errors.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/1.typescript.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
import { defineExtensionStorage } from '@webext-core/storage';
import browser from 'webextension-polyfill';

export interface ExtensionStorageSchema {
  installDate: number;
  notificationsEnabled: boolean;
  favoriteUrls: string[];
}

export const extensionStorage = defineExtensionStorage<ExtensionStorageSchema>(
  browser.storage.local
);
```

--------------------------------

TITLE: Initialize WXT Project
DESCRIPTION: Initializes a new browser extension project using WXT, a recommended tool for optimal developer experience and cross-browser support.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_0

LANGUAGE: sh
CODE:
```
pnpm dlx wxt@latest init
```

--------------------------------

TITLE: Define MathService with Proxy
DESCRIPTION: Demonstrates defining a service class (`MathService`) with asynchronous methods and registering it using `defineProxyService`. This allows the service's logic to run in the extension's background context.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_0

LANGUAGE: ts
CODE:
```
import { defineProxyService } from '@webext-core/proxy-service';

// 1. Define your service
class MathService {
  async fibonacci(number: number): Promise<number> {
    // Placeholder for actual implementation
    return number;
  }
}
export const [registerMathService, getMathService] = defineProxyService(
  'MathService',
  () => new MathService(),
);
```

--------------------------------

TITLE: Accessing TodosRepo from Extension Page (HTML/TypeScript)
DESCRIPTION: Demonstrates how to retrieve and use the `TodosRepo` service from an HTML page within the extension. It calls `getAll()` to fetch all todos and logs them to the console.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_10

LANGUAGE: HTML
CODE:
```
<script type="module">
  import { getTodosRepo } from './TodosRepo';

  // On your UIs
  const todosRepo = getTodosRepo();
  todosRepo.getAll().then(console.log);
</script>
```

--------------------------------

TITLE: Configure Browser Path for web-ext
DESCRIPTION: Instructions for creating a `.web-extrc.yml` file to specify the browser binary path. This is useful if the demo extension fails to open a browser automatically.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/README.md#_snippet_1

LANGUAGE: yml
CODE:
```
chromiumBinary: /path/to/your/chrome
```

--------------------------------

TITLE: Accessing TodosRepo from Background Helper (TypeScript)
DESCRIPTION: Illustrates accessing the `TodosRepo` service from another helper file within the background script, demonstrating its availability across the background context.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_12

LANGUAGE: TypeScript
CODE:
```
import { getTodosRepo } from './TodosRepo';

// Anywhere else in your background
const todosRepo = getTodosRepo();
todosRepo.getAll().then(console.log);
```

--------------------------------

TITLE: setupNotificationShownReports.test.ts
DESCRIPTION: Tests the setupNotificationShownReports function, which sets up a listener for notification shown events to report analytics.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/4.implemented-apis.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { describe, it, beforeEach, vi, expect } from 'vitest';
import browser from 'webextension-polyfill';
import { fakeBrowser } from '@webext-core/fake-browser';

async function setupNotificationShownReports(
  reportEvent: (notificationId: string) => void,
): Promise<void> {
  browser.notifications.onShown.addListener(id => reportEvent(id));
}

describe('setupNotificationShownReports', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('should properly report an analytics event when a notification is shown', async () => {
    const reportAnalyticsEvent = vi.fn();
    const id = 'notification-id';

    setupNotificationShownReports(reportAnalyticsEvent);
    await fakeBrowser.notifications.onShown.trigger(id);

    expect(reportAnalyticsEvent).toBeCalledTimes(1);
    expect(reportAnalyticsEvent).toBeCalledWith(id);
  });
});
```

--------------------------------

TITLE: Register MathService in Background
DESCRIPTION: Shows how to register a previously defined proxy service (`MathService`) at the beginning of a web extension's background script. This ensures the service is available when needed.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { registerMathService } from './MathService';

// 2. Register the service at the beginning of the background script
registerMathService();
```

--------------------------------

TITLE: CDN Usage
DESCRIPTION: Include the downloaded script and access the MatchPattern class via the global object.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_3

LANGUAGE: html
CODE:
```
<script src="/match-patterns.js"></script>
<script>
  const { MatchPattern } = webExtCoreMatchPatterns;
</script>
```

--------------------------------

TITLE: Download @webext-core/storage Package
DESCRIPTION: Downloads the global UMD build of the `@webext-core/storage` package from a CDN using curl, intended for projects not using a bundler.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_3

LANGUAGE: sh
CODE:
```
mkdir -p vendor/webext-core
curl -o vendor/webext-core/storage.js https://cdn.jsdelivr.net/npm/@webext-core/storage/lib/index.global.js
```

--------------------------------

TITLE: Configure Browser Path for web-ext
DESCRIPTION: Instructions for creating a `.web-extrc.yml` file to specify the browser binary path. This is useful if the demo extension fails to open a browser automatically.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging-demo/README.md#_snippet_1

LANGUAGE: yml
CODE:
```
chromiumBinary: /path/to/your/chrome
```

--------------------------------

TITLE: Access TodosRepo from Background Helper
DESCRIPTION: Illustrates accessing the `TodosRepo` service from another module within the extension's background scripts, demonstrating its availability across different background modules.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_9

LANGUAGE: ts
CODE:
```
import { getTodosRepo } from './TodosRepo';

// Anywhere else in your background
const todosRepo = getTodosRepo();
todosRepo.getAll().then(console.log);
```

--------------------------------

TITLE: MatchPattern Class and includes Method
DESCRIPTION: Demonstrates creating a MatchPattern instance and using its `includes` method to check URL matches. The `includes` method accepts URLs as strings or URL objects, and can also use the global `window.location`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_4

LANGUAGE: APIDOC
CODE:
```
MatchPattern:
  __constructor(pattern: string)
    pattern: The match pattern string (e.g., '*://*.google.com').

  includes(url: string | URL | Location): boolean
    Checks if the given URL matches the pattern.
    - url: The URL to check, can be a string, a URL object, or the browser's window.location.
    - Returns: true if the URL matches the pattern, false otherwise.

Examples:
  const google = new MatchPattern('*://*.google.com');
  google.includes('https://acounts.google.com'); // true
  google.includes('https://google.com/search?q=test'); // true

  const youtube = new MatchPattern('*://youtube.com/watch');
  youtube.includes('https://youtube.com/watch'); // true
  youtube.includes('https://youtube.com/mrbeast'); // false
  youtube.includes('https://acounts.google.com'); // false

  // Using URL object or window.location:
  google.includes(new URL('https://google.com'));
  google.includes(window.location);
```

--------------------------------

TITLE: Access TodosRepo from Extension UI
DESCRIPTION: Demonstrates accessing the `TodosRepo` service from an extension's UI page (HTML) to perform IndexedDB operations like fetching all todos.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_7

LANGUAGE: html
CODE:
```
<script type="module">
  import { getTodosRepo } from './TodosRepo';

  // On your UIs
  const todosRepo = getTodosRepo();
  todosRepo.getAll().then(console.log);
</script>
```

--------------------------------

TITLE: Basic Message Sending and Receiving
DESCRIPTION: Demonstrates how to set up a message listener in one script (e.g., background.ts) and send a message from another script (e.g., content-script.ts). The `onMessage` function registers a handler, and `sendMessage` dispatches messages.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_4

LANGUAGE: ts
CODE:
```
// background.ts
import { onMessage } from './messaging';

onMessage('getStringLength', message => {
  return message.data.length;
});

// content-script.ts
import { sendMessage } from './messaging';

const length = await sendMessage('getStringLength', 'hello world');

console.log(length); // 11
```

--------------------------------

TITLE: Access MathService from Extension
DESCRIPTION: Illustrates how to retrieve an instance of a registered proxy service (`MathService`) in any part of the web extension (e.g., content scripts, UI pages) and call its methods, which will execute in the background.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_2

LANGUAGE: ts
CODE:
```
import { getMathService } from './MathService';

// 3. Get an instance of your service anywhere in your extension
const mathService = getMathService();

// 4. Call methods like normal, they will execute in the background
await mathService.fibonacci(100);
```

--------------------------------

TITLE: Configure MV2 Background Script for Package
DESCRIPTION: Shows how to include the downloaded package script in the `background.scripts` array for a Manifest V2 background script in `manifest.json`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_6

LANGUAGE: json
CODE:
```
"background": {
  "scripts": ["vendor/webext-core/storage.js", "your-background-script.js"]
}
```

--------------------------------

TITLE: Configure Content Scripts for Package
DESCRIPTION: Illustrates how to list the downloaded package script in the `content_scripts.js` array within a browser extension's `manifest.json`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_5

LANGUAGE: json
CODE:
```
"content_scripts": [{
  "matches": [...],
  "js": ["vendor/webext-core/storage.js", "your-content-script.js"]
}]
```

--------------------------------

TITLE: Define Window Messenger
DESCRIPTION: Sets up a messenger for cross-context communication using `window.postMessage`. Requires a unique namespace to ensure isolation. Defines the message schema for communication.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_6

LANGUAGE: ts
CODE:
```
import { defineWindowMessaging } from '@webext-core/messaging/page';

export interface WebsiteMessengerSchema {
  init(data: unknown): void;
  somethingHappened(data: unknown): void;
}

export const websiteMessenger = defineWindowMessaging<WebsiteMessengerSchema>({
  namespace: '<some-unique-string>',
});
```

--------------------------------

TITLE: Accessing TodosRepo from Content Script (TypeScript)
DESCRIPTION: Shows how to access the `TodosRepo` service from a content script. This allows content scripts to interact with the background's IndexedDB instance.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_11

LANGUAGE: TypeScript
CODE:
```
import { getTodosRepo } from './TodosRepo';

// Inside content scripts
const todosRepo = getTodosRepo();
todosRepo.getAll().then(console.log);
```

--------------------------------

TITLE: Download Job Scheduler via CDN
DESCRIPTION: Downloads the global JavaScript file for the job scheduler from a CDN using curl. This is useful for direct script inclusion in HTML files.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_2

LANGUAGE: sh
CODE:
```
curl -o job-scheduler.js https://cdn.jsdelivr.net/npm/@webext-core/job-scheduler/lib/index.global.js
```

--------------------------------

TITLE: Package Specific Scripts
DESCRIPTION: Scripts that can be run within individual package directories for building, type checking, or running tests.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/2.contributing.md#_snippet_2

LANGUAGE: shell
CODE:
```
bun run build   # Build the package and it's dependencies
bun run check   # Check for type errors
bun run test    # Run unit tests in watch mode
```

--------------------------------

TITLE: Access TodosRepo from Content Script
DESCRIPTION: Shows how to retrieve and use the `TodosRepo` service within a content script to interact with the extension's background-managed IndexedDB.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_8

LANGUAGE: ts
CODE:
```
import { getTodosRepo } from './TodosRepo';

// Inside content scripts
const todosRepo = getTodosRepo();
todosRepo.getAll().then(console.log);
```

--------------------------------

TITLE: Include @webext-core/messaging via CDN Script Tag
DESCRIPTION: Includes the @webext-core/messaging library in an HTML page using a script tag. The library will be available globally under the `webExtCoreMessaging` namespace.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_2

LANGUAGE: html
CODE:
```
<script src="/messaging.js"></script>
<script>
  const { defineExtensionMessaging } = webExtCoreMessaging;
</script>
```

--------------------------------

TITLE: Calling MathService.divide (JavaScript)
DESCRIPTION: This snippet demonstrates calling the 'divide' method of the 'MathService' with two integer arguments (1 and 0). It showcases a division operation, including a potential division by zero scenario.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/src/entrypoints/popup/index.html#_snippet_3

LANGUAGE: JavaScript
CODE:
```
MathService.divide(1, 0)
```

--------------------------------

TITLE: Registering WebExt-Core Storage in MV2 Background (JSON)
DESCRIPTION: Illustrates how to include the `storage.js` file in an MV2 background script definition within `manifest.json`. The `scripts` array ensures `storage.js` is loaded before `your-background-script.js`, making the global `webExtCoreStorage` available.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_7

LANGUAGE: json
CODE:
```
"background": {
  "scripts": ["vendor/webext-core/storage.js", "your-background-script.js"]
}
```

--------------------------------

TITLE: Proxy Math Service Methods
DESCRIPTION: Provides a set of mathematical operations accessible through a proxy service. These methods include basic arithmetic and factorial calculation. Ensure the service is properly initialized before use. Error handling for invalid inputs or operations (like division by zero) should be considered.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/src/entrypoints/popup/index.html#_snippet_0

LANGUAGE: APIDOC
CODE:
```
MathService:
  add(a: number, b: number): number
    Adds two numbers.
    Parameters:
      a: The first number.
      b: The second number.
    Returns: The sum of a and b.

  subtract(a: number, b: number): number
    Subtracts the second number from the first.
    Parameters:
      a: The number to subtract from.
      b: The number to subtract.
    Returns: The result of a minus b.

  multiply(a: number, b: number): number
    Multiplies two numbers.
    Parameters:
      a: The first number.
      b: The second number.
    Returns: The product of a and b.

  divide(a: number, b: number): number
    Divides the first number by the second.
    Parameters:
      a: The dividend.
      b: The divisor.
    Returns: The result of a divided by b.
    Note: Division by zero may result in an error or specific return value (e.g., Infinity).

  factorial(n: number): number
    Calculates the factorial of a non-negative integer.
    Parameters:
      n: The non-negative integer.
    Returns: The factorial of n.
    Note: May handle large numbers or have limits on input size.
```

--------------------------------

TITLE: Job Scheduler API Reference
DESCRIPTION: Provides details on the core functions for managing jobs. This includes `defineJobScheduler` for initialization, `scheduleJob` for adding/updating jobs, and `removeJob` for deletion.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_11

LANGUAGE: APIDOC
CODE:
```
defineJobScheduler(): JobScheduler
  Initializes and returns a new JobScheduler instance. Should be called once in the background script or service worker.

scheduleJob(job: JobConfig): void
  Schedules or updates a job. If a job with the same ID already exists, it will be updated if the configuration has changed.
  Parameters:
    job: An object containing the job configuration.
      id: string - Unique identifier for the job.
      type: 'once' | 'interval' | 'cron' - The type of job.
      date?: number - Timestamp for 'once' jobs.
      interval?: number - Interval in milliseconds for 'interval' jobs.
      expression?: string - Cron expression for 'cron' jobs.
      execute: () => void | Promise<void> - The function to execute when the job runs.

removeJob(jobId: string): void
  Removes a scheduled job by its ID. This ensures that the associated alarm is also deleted.
  Parameters:
    jobId: The unique identifier of the job to remove.
```

--------------------------------

TITLE: Include Storage Package in HTML
DESCRIPTION: Shows how to include the downloaded `@webext-core/storage` package script in an HTML file and access its global variable `webExtCoreStorage`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_4

LANGUAGE: html
CODE:
```
<head>
  <script src="/vendor/webext-core/storage.js"></script>
  <script>
    const { localExtStorage } = webExtCoreStorage;

    const value = await localExtStorage.getItem('some-key');
  </script>
</head>
```

--------------------------------

TITLE: Setting up Jest Global Mock for webextension-polyfill (JavaScript)
DESCRIPTION: This snippet defines a global mock for `webextension-polyfill` in Jest. It exports the default export of `@webext-core/fake-browser`, ensuring that any `require` or `import` statements for `webextension-polyfill` within tests resolve to the fake browser environment. This is the initial step for mocking browser APIs in Jest.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_4

LANGUAGE: JavaScript
CODE:
```
// ./__mocks__/webextension-polyfill.js
module.exports = require('@webext-core/fake-browser').default;
```

--------------------------------

TITLE: Parameterized Jobs with Higher-Order Functions
DESCRIPTION: Demonstrates how to pass dependencies or parameters to job execution logic using higher-order functions. The `execute` function is generated by another function that receives dependencies.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_9

LANGUAGE: ts
CODE:
```
import { someJob } from './someJob.ts';

// Create your dependency
const someDependency = new SomeDependency();

const jobs = defineJobScheduler();
jobs.scheduleJob({
  // ...
  execute: someJob(someDependency),
});
```

LANGUAGE: ts
CODE:
```
function someJob(someDependency: SomeDependency) {
  return async () => {
    // Use someDependency
  };
}
```

--------------------------------

TITLE: Registering Function-Based Proxy Service in TypeScript
DESCRIPTION: This code registers the function-based `getAllTodos` proxy service. It initializes an IndexedDB database and passes the database promise to the `registerGetAllTodos` function, making the service ready for use.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_7

LANGUAGE: TypeScript
CODE:
```
// Register
const db = openDB('todos');
registerGetAllTodos(db);
```

--------------------------------

TITLE: Register TodosRepo Service in Background
DESCRIPTION: Registers the `TodosRepo` service in the background script, passing the promise returned by `openDB`. This makes IndexedDB operations accessible from other extension contexts.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_6

LANGUAGE: ts
CODE:
```
import { openDB } from 'idb';
import { registerTodosRepo } from './TodosRepo';

// Open the database and register your service
const db = openDB("todos", 1, {
  upgrade(db) {
    db.createObjectStore('todos', { keyPath: 'id' });
  },
});

registerTodosRepo(db);
```

--------------------------------

TITLE: Calling MathService.factorial (JavaScript)
DESCRIPTION: This snippet demonstrates calling the 'factorial' method of the 'MathService' with a single integer argument (100). It calculates the factorial of the given number.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/src/entrypoints/popup/index.html#_snippet_4

LANGUAGE: JavaScript
CODE:
```
MathService.factorial(100)
```

--------------------------------

TITLE: Retrieving and Using Object-Based Proxy Service in TypeScript
DESCRIPTION: This snippet shows how to retrieve an instance of the object-based `TodosRepo` proxy service using `getTodosRepo()` and then call its `getAll()` method to fetch data, demonstrating cross-context communication.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_5

LANGUAGE: TypeScript
CODE:
```
// Get an instance
const todosRepo = getTodosRepo();
const todos = await todosRepo.getAll();
```

--------------------------------

TITLE: Define Proxy Service using a Class in TypeScript
DESCRIPTION: Demonstrates defining a proxy service using a TypeScript class. It shows how to create a repository class (`TodosRepo`) and register it using `defineProxyService`. Dependencies include `idb` and `@webext-core/proxy-service`. This pattern is suitable for services with multiple methods and internal state.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_0

LANGUAGE: typescript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

class TodosRepo {
  constructor(private db: Promise<IDBPDatabase>) {}

  async getAll(): Promise<Todo[]> {
    return (await this.db).getAll('todos');
  }
}

export const [registerTodosRepo, getTodosRepo] = defineProxyService(
  'TodosRepo',
  (idb: Promise<IDBPDatabase>) => new TodosRepo(idb),
);
```

LANGUAGE: typescript
CODE:
```
// Register
const db = openDB('todos');
registerTodosRepo(db);
```

LANGUAGE: typescript
CODE:
```
// Get an instance
const todosRepo = getTodosRepo();
const todos = await todosRepo.getAll();
```

--------------------------------

TITLE: Extension Storage Instances
DESCRIPTION: Provides pre-configured ExtensionStorage instances for different browser storage areas, including local, sync, managed, and session storage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_2

LANGUAGE: ts
CODE:
```
const localExtStorage: ExtensionStorage<AnySchema>;
```

LANGUAGE: APIDOC
CODE:
```
localExtStorage:
  An implementation of ExtensionStorage based on the browser.storage.local storage area.
```

LANGUAGE: ts
CODE:
```
const managedExtStorage: ExtensionStorage<AnySchema>;
```

LANGUAGE: APIDOC
CODE:
```
managedExtStorage:
  An implementation of ExtensionStorage based on the browser.storage.managed storage area.
```

LANGUAGE: ts
CODE:
```
const sessionExtStorage: ExtensionStorage<AnySchema>;
```

LANGUAGE: APIDOC
CODE:
```
sessionExtStorage:
  An implementation of ExtensionStorage based on the browser.storage.local storage area.
  Notes:
    - Added to Chrome 102 as of May 24th, 2022.
    - Added to Safari 16.4 as of March 27th, 2023.
    - Added to Firefox 115 as of July 4th, 2023.
```

LANGUAGE: ts
CODE:
```
const syncExtStorage: ExtensionStorage<AnySchema>;
```

LANGUAGE: APIDOC
CODE:
```
syncExtStorage:
  An implementation of ExtensionStorage based on the browser.storage.sync storage area.
```

--------------------------------

TITLE: Calling MathService.multiply (JavaScript)
DESCRIPTION: This snippet demonstrates calling the 'multiply' method of the 'MathService' with two integer arguments (2 and 3). It performs a basic multiplication operation.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/src/entrypoints/popup/index.html#_snippet_2

LANGUAGE: JavaScript
CODE:
```
MathService.multiply(2, 3)
```

--------------------------------

TITLE: Proxy Service for Cross-Context Job Scheduling
DESCRIPTION: Utilizes `@webext-core/proxy-service` to enable scheduling jobs from UI or content scripts. It defines a proxy service for the JobScheduler, allowing registration in the background and retrieval in other contexts.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_10

LANGUAGE: ts
CODE:
```
import { defineProxyService } from '@webext-core/proxy-service';

export const [registerJobScheduler, getJobScheduler] = defineProxyService('JobScheduler', () =>
  defineJobScheduler(),
);
```

LANGUAGE: ts
CODE:
```
import { registerJobScheduler } from './job-scheduler';

const jobs = registerJobScheduler();

// Schedule any jobs in the background
jobs.scheduleJob({
  // ...
});
```

LANGUAGE: ts
CODE:
```
import { getJobScheduler } from './job-scheduler';

// Get a proxy instance and use it to schedule more jobs
const jobs = getJobScheduler();
jobs.scheduleJob({
  // ...
});
```

--------------------------------

TITLE: Retrieving and Using Function-Based Proxy Service in TypeScript
DESCRIPTION: This snippet shows how to retrieve the `getAllTodos` proxy function using `getGetAllTodos()` and then call it directly to fetch data, demonstrating cross-context communication for a single function.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_8

LANGUAGE: TypeScript
CODE:
```
// Get an instance
const getAllTodos = getGetAllTodos();
const todos = await getAllTodos();
```

--------------------------------

TITLE: Use Job Scheduler from CDN in HTML
DESCRIPTION: Includes the job-scheduler.js script from a CDN and makes the scheduler functions available globally. The `defineJobScheduler` function is accessed via the `webExtCoreJobScheduler` object.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_3

LANGUAGE: html
CODE:
```
<script src="/job-scheduler.js"></script>
<script>
  const { defineJobScheduler } = webExtCoreJobScheduler;
</script>
```

--------------------------------

TITLE: Mount React App in Isolated Element
DESCRIPTION: Demonstrates how to render a React application into the `isolatedElement` using `ReactDOM.createRoot`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_6

LANGUAGE: ts
CODE:
```
import ReactDOM from 'react-dom';
import App from './App.tsx';

ReactDOM.createRoot(isolatedElement).render(<App />);
```

--------------------------------

TITLE: Root Directory Scripts
DESCRIPTION: Common scripts available in the root directory of the webext-core monorepo for building all packages or formatting files.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/2.contributing.md#_snippet_1

LANGUAGE: shell
CODE:
```
bun run build  # Run the build script for all packages
bun run format # Run prettier to format all your files
```

--------------------------------

TITLE: Configure Jest to use @webext-core/fake-browser
DESCRIPTION: Set up Jest to use `@webext-core/fake-browser` by creating a global mock and configuring `moduleNameMapper`. This redirects imports of `webextension-polyfill` to the fake browser implementation.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_2

LANGUAGE: JavaScript
CODE:
```
// ./__mocks__/webextension-polyfill.js
module.exports = require('@webext-core/fake-browser').default;
```

LANGUAGE: JavaScript
CODE:
```
// ./jest.config.js
module.exports = {
  moduleNameMapper: {
    '^webextension-polyfill$': '<rootDir>/__mocks__/webextension-polyfill.js',
  },
};
```

--------------------------------

TITLE: Calling MathService.subtract (JavaScript)
DESCRIPTION: This snippet demonstrates calling the 'subtract' method of the 'MathService' with two integer arguments (2 and 1). It performs a basic subtraction operation.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/proxy-service-demo/src/entrypoints/popup/index.html#_snippet_1

LANGUAGE: JavaScript
CODE:
```
MathService.subtract(2, 1)
```

--------------------------------

TITLE: Define TodosRepo Service for IndexedDB
DESCRIPTION: Implements a service (`TodosRepo`) for managing IndexedDB operations (CRUD) within a web extension. It uses `flattenPromise` to handle promises internally, ensuring synchronous registration.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/0.installation.md#_snippet_5

LANGUAGE: ts
CODE:
```
import { defineProxyService, flattenPromise } from '@webext-core/proxy-service';
import { IDBPDatabase } from 'idb';

// Assuming 'Todo' type is defined elsewhere
// type Todo = { id: number; text: string; completed: boolean };

function createTodosRepo(idbPromise: Promise<IDBPDatabase>) {
  const idb = flattenPromise(idbPromise);

  return {
    async create(todo: Todo): Promise<void> {
      await idb.add('todos', todo);
    },
    getOne(id: Pick<Todo, 'id'>): Promise<Todo> {
      return idb.get('todos', id);
    },
    getAll(): Promise<Todo[]> {
      return idb.getAll('todos');
    },
    async update(todo: Todo): Promise<void> {
      await idb.put('todos', todo);
    },
    async delete(todo: Todo): Promise<void> {
      await idb.delete('todos', todo.id);
    },
  };
}

// Register the service for proxy access
export const [registerTodosRepo, getTodosRepo] = defineProxyService('TodosRepo', createTodosRepo);
```

--------------------------------

TITLE: Registering Object-Based Proxy Service in TypeScript
DESCRIPTION: This code registers the object-based `TodosRepo` proxy service. It initializes an IndexedDB database and passes the database promise to the `registerTodosRepo` function, making the service ready for use.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_4

LANGUAGE: TypeScript
CODE:
```
// Register
const db = openDB('todos');
registerTodosRepo(db);
```

--------------------------------

TITLE: Define Messaging Protocol and Initialize
DESCRIPTION: Defines a TypeScript interface for the messaging protocol and initializes the messaging system using `defineExtensionMessaging`. This sets up type safety for message passing.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_3

LANGUAGE: ts
CODE:
```
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getStringLength(data: string): number;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

--------------------------------

TITLE: Use Local Storage in TypeScript
DESCRIPTION: Demonstrates how to import and use the `localExtStorage` API from the `@webext-core/storage` package in a TypeScript environment.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/0.get-started/0.introduction.md#_snippet_2

LANGUAGE: ts
CODE:
```
import { localExtStorage } from '@webext-core/storage';

const value = await localExtStorage.getItem('some-key');
```

--------------------------------

TITLE: `@webext-core/fake-browser` - In-Memory Browser for Testing
DESCRIPTION: An in-memory implementation of the webextension-polyfill for testing purposes. Allows for efficient and isolated testing of web extension logic.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_7

LANGUAGE: typescript
CODE:
```
An in-memory implementation of webextension-polyfill for testing.
```

--------------------------------

TITLE: defineProxyService Utility Function
DESCRIPTION: A utility function for creating a service whose methods are executed in the background script, abstracting away the context switching. It returns functions to register the service with arguments and to retrieve an instance of the proxied service.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_1

LANGUAGE: typescript
CODE:
```
function defineProxyService<TService extends Service, TArgs extends any[]>(
  name: string,
  init: (...args: TArgs) => TService,
  config?: ProxyServiceConfig,
): [
  registerService: (...args: TArgs) => TService,
  getService: () => ProxyService<TService>,
] {
  // ...
}

// Parameters:
// name: string - A unique name for the service, used for identification.
// init: (...args: TArgs) => TService - A function returning the service implementation. Arguments are required for registration.
// config?: ProxyServiceConfig - Optional configuration for the proxy service.

// Returns:
// registerService: Function to register the service in the background.
// getService: Function to get a service instance from any context.
```

--------------------------------

TITLE: Window Messaging
DESCRIPTION: Defines functions for creating messengers using the window.postMessage API, facilitating communication between content scripts and websites or injected scripts.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_3

LANGUAGE: APIDOC
CODE:
```
defineWindowMessaging<TProtocolMap extends Record<string, any> = Record<string, any>>(
  config: WindowMessagingConfig
): WindowMessenger<TProtocolMap> {
  // ...
}
  - Returns a WindowMessenger backed by the `window.postMessage` API.
  - Used to communicate between content scripts and websites, or content scripts and injected scripts.

Example:
  interface WebsiteMessengerSchema {
    initInjectedScript(data: ...): void;
  }

  export const websiteMessenger = defineWindowMessaging<initInjectedScript>();

  // Content script
  websiteMessenger.sendMessage("initInjectedScript", ...);

  // Injected script
  websiteMessenger.onMessage("initInjectedScript", (...) => {
    // ...
  })
```

--------------------------------

TITLE: JavaScript sendMessage Commands
DESCRIPTION: This section demonstrates the usage of the `sendMessage` function to send various commands. It covers successful commands like 'sleep' and 'ping', as well as potentially error-inducing ones like 'throw' and an 'unknown' command.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging-demo/src/entrypoints/popup/index.html#_snippet_0

LANGUAGE: javascript
CODE:
```
sendMessage("sleep")
```

LANGUAGE: javascript
CODE:
```
sendMessage("ping")
```

LANGUAGE: javascript
CODE:
```
sendMessage("ping2")
```

LANGUAGE: javascript
CODE:
```
sendMessage("throw")
```

LANGUAGE: javascript
CODE:
```
sendMessage("unknown")
```

--------------------------------

TITLE: MatchPattern Class and Methods
DESCRIPTION: Provides functionality for parsing and performing operations on match patterns. It includes a constructor to initialize with a pattern string and an `includes` method to check URL compatibility.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/api.md#_snippet_1

LANGUAGE: ts
CODE:
```
class MatchPattern {
  constructor(matchPattern: string) {
    // ...
  }
  includes(url: string | URL | Location): boolean {
    // ...
  }
}
```

--------------------------------

TITLE: Configuring Proxy Services with ProxyServiceConfig (TypeScript)
DESCRIPTION: An interface for configuring the behavior of a proxy service. It extends `ExtensionMessagingConfig` from `@webext-core/messaging`, allowing any messaging-related configurations to be applied to the proxy service.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_5

LANGUAGE: typescript
CODE:
```
interface ProxyServiceConfig extends ExtensionMessagingConfig {}
```

--------------------------------

TITLE: Define Nested Proxy Services with Classes and Objects in TypeScript
DESCRIPTION: Demonstrates registering nested proxy services, combining classes and objects. It shows how to create a main service object that contains other services, allowing for a structured API. Dependencies include `idb` and `@webext-core/proxy-service`. This pattern is useful for organizing complex applications.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_3

LANGUAGE: typescript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

class TodosRepo {
  constructor(private db: Promise<IDBPDatabase>) {}

  async getAll(): Promise<Todo[]> {
    return (await this.db).getAll('todos');
  }
}

const createAuthorsRepo = (db: Promise<IDBPDatabase>) => ({
  async getOne(id: string): Promise<Todo[]> {
    return (await this.db).getAll('authors', id);
  },
});

function createApi(db: Promise<IDBPDatabase>) {
  return {
    todos: new TodosRepo(db),
    authors: createAuthorsRepo(db),
  };
}

export const [registerApi, getApi] = defineProxyService('Api', createApi);
```

LANGUAGE: typescript
CODE:
```
// Register
const db = openDB('todos');
registerApi(db);
```

LANGUAGE: typescript
CODE:
```
// Get an instance
const api = getApi();
const todos = await api.todos.getAll();
const firstAuthor = await api.authors.getOne(todos.authorId);
```

--------------------------------

TITLE: Define Proxy Service using an Object in TypeScript
DESCRIPTION: Illustrates defining a proxy service using a plain JavaScript object. It shows how to create an object with methods and register it using `defineProxyService`. Dependencies include `idb` and `@webext-core/proxy-service`. This approach is useful for simpler services or when a class structure is not necessary.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_1

LANGUAGE: typescript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

export const [registerTodosRepo, getTodosRepo] = defineProxyService(
  'TodosRepo',
  (db: Promise<IDBPDatabase>) => ({
    async getAll(): Promise<Todo[]> {
      return (await this.db).getAll('todos');
    },
  }),
);
```

LANGUAGE: typescript
CODE:
```
// Register
const db = openDB('todos');
registerTodosRepo(db);
```

LANGUAGE: typescript
CODE:
```
// Get an instance
const todosRepo = getTodosRepo();
const todos = await todosRepo.getAll();
```

--------------------------------

TITLE: Registering Job Scheduler Proxy - Background Script - TypeScript
DESCRIPTION: In the background script, `registerJobScheduler()` is called to initialize and expose the job scheduler instance via the proxy service. This makes the scheduler accessible from other parts of the extension, ensuring only one instance is created and managed centrally.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_12

LANGUAGE: ts
CODE:
```
import { registerJobScheduler } from './job-scheduler';

const jobs = registerJobScheduler();

// Schedule any jobs in the background
jobs.scheduleJob({
  // ...
});
```

--------------------------------

TITLE: Use @webext-core/isolated-element from CDN in HTML
DESCRIPTION: Shows how to include the library via a `<script>` tag and access its functions from the global `webExtCoreIsolatedElement` object.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_3

LANGUAGE: html
CODE:
```
<script src="/isolated-element.js"></script>
<script>
  const { createIsolatedElement } = webExtCoreIsolatedElement;
</script>
```

--------------------------------

TITLE: WindowMessagingConfig Interface
DESCRIPTION: Represents the configuration object passed into the `defineWindowMessaging` function. It extends `NamespaceMessagingConfig`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_15

LANGUAGE: typescript
CODE:
```
interface WindowMessagingConfig extends NamespaceMessagingConfig {}
```

--------------------------------

TITLE: Define Custom Event Messenger
DESCRIPTION: Sets up a messenger for cross-context communication using `CustomEvent`. Ideal for scenarios not involving iframes. Requires a unique namespace and defines the message schema.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_7

LANGUAGE: ts
CODE:
```
import { defineCustomEventMessaging } from '@webext-core/messaging/page';

export interface WebsiteMessengerSchema {
  init(data: unknown): void;
  somethingHappened(data: unknown): void;
}

export const websiteMessenger = defineCustomEventMessaging<WebsiteMessengerSchema>({
  namespace: '<some-unique-string>',
});
```

--------------------------------

TITLE: Defining Proxy Service with Function in TypeScript
DESCRIPTION: This snippet demonstrates defining a proxy service as a single function. The `getAllTodos` function is registered using `defineProxyService`, allowing it to be called directly from other contexts.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_6

LANGUAGE: TypeScript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

export const [registerGetAllTodos, getGetAllTodos] = defineProxyService(
  'TodosRepo',
  (db: Promise<IDBPDatabase>) =>
    function getAllTodos() {
      return (await this.db).getAll('todos');
    },
);
```

--------------------------------

TITLE: Defining Window Messenger in TypeScript
DESCRIPTION: This snippet defines a messenger using `defineWindowMessaging` for communication between a content script and a webpage. It sets up an interface `WebsiteMessengerSchema` to define the message types and their parameters, and specifies a unique `namespace` to prevent accidental message conflicts.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_10

LANGUAGE: TypeScript
CODE:
```
import { defineWindowMessaging } from '@webext-core/messaging/page';

export interface WebsiteMessengerSchema {
  init(data: unknown): void;
  somethingHappened(data: unknown): void;
}

export const websiteMessenger = defineWindowMessaging<WebsiteMessengerSchema>({
  namespace: '<some-unique-string>',
});
```

--------------------------------

TITLE: Updating Jest Configuration with moduleNameMapper (JavaScript)
DESCRIPTION: This `jest.config.js` snippet configures Jest's `moduleNameMapper` option. It maps the `webextension-polyfill` module to the custom mock file located at `<rootDir>/__mocks__/webextension-polyfill.js`, ensuring that Jest uses the fake browser implementation whenever `webextension-polyfill` is imported in tests.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/1.testing-frameworks.md#_snippet_5

LANGUAGE: JavaScript
CODE:
```
// ./jest.config.js
module.exports = {
  moduleNameMapper: {
    '^webextension-polyfill$': '<rootDir>/__mocks__/webextension-polyfill.js',
  },
};
```

--------------------------------

TITLE: defineJobScheduler Function
DESCRIPTION: Creates a JobScheduler instance backed by the alarms API. It requires the 'alarms' permission and accepts optional configuration for logging.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_1

LANGUAGE: ts
CODE:
```
function defineJobScheduler(options?: JobSchedulerConfig): JobScheduler {
  // ...
}
```

--------------------------------

TITLE: Local Extension Storage Instance - TypeScript
DESCRIPTION: `localExtStorage` is a pre-configured instance of `ExtensionStorage`, specifically designed to interact with the `browser.storage.local` storage area. It provides a convenient, ready-to-use object for local storage operations within a web extension.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_3

LANGUAGE: TypeScript
CODE:
```
const localExtStorage: ExtensionStorage<AnySchema>;
```

--------------------------------

TITLE: Base Messaging Configuration
DESCRIPTION: Defines shared configuration options applicable to various messaging implementations. Includes optional logger and error breaking behavior.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_0

LANGUAGE: APIDOC
CODE:
```
BaseMessagingConfig:
  __interface__
  logger?: Logger
    - The logger to use when logging messages. Set to `null` to disable logging. (default: `console`)
  breakError?: boolean
    - Whether to break an error when an invalid message is received. (default: `undefined`)
```

--------------------------------

TITLE: Registering Nested Proxy Services in TypeScript
DESCRIPTION: This code registers the nested `Api` proxy service. It initializes an IndexedDB database and passes the database promise to the `registerApi` function, making the structured API available for use.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_10

LANGUAGE: TypeScript
CODE:
```
// Register
const db = openDB('todos');
registerApi(db);
```

--------------------------------

TITLE: Mount Vue App in Isolated Element
DESCRIPTION: Illustrates how to mount a Vue.js application within the `isolatedElement` provided by the `@webext-core/isolated-element` library.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_5

LANGUAGE: ts
CODE:
```
import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount(isolatedElement);
```

--------------------------------

TITLE: Import MatchPattern in TypeScript
DESCRIPTION: Import the MatchPattern class from the library in your TypeScript project.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/0.installation.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { MatchPattern } from '@webext-core/match-patterns';
```

--------------------------------

TITLE: ProxyServiceConfig Interface
DESCRIPTION: An interface for configuring the behavior of a proxy service. It extends `ExtensionMessagingConfig`, allowing any configuration options from the `@webext-core/messaging` package to be passed.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_4

LANGUAGE: typescript
CODE:
```
interface ProxyServiceConfig extends ExtensionMessagingConfig {}
```

--------------------------------

TITLE: Content Script Interacting with Injected Script in TypeScript
DESCRIPTION: This content script snippet demonstrates how to inject a JavaScript file into the page's context and establish communication using the `websiteMessenger`. It sends an 'init' message upon script load and sets up an `onMessage` listener to react to 'somethingHappened' messages from the injected script.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_12

LANGUAGE: TypeScript
CODE:
```
import { websiteMessenger } from './website-messenging';

const script = document.createElement('script');
script.src = browser.runtime.getUrl('/path/to/injected.js');
document.head.appendChild(script);

script.onload = () => {
  websiteMessenger.sendMessage("init", { ... });
}

websiteMessenger.onMessage("somethingHappened", (data) => {
  // React to messages from the injected script
});
```

--------------------------------

TITLE: IntervalJob Interface
DESCRIPTION: Defines a job that executes on a set interval. It requires an ID, type, duration (in milliseconds, must be > 1 minute), and an execute function. An optional 'immediate' flag can trigger the job upon scheduling.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_3

LANGUAGE: ts
CODE:
```
interface IntervalJob {
  id: string;
  type: "interval";
  duration: number;
  immediate?: boolean;
  execute: ExecuteFn;
}
```

--------------------------------

TITLE: Retrieving and Using Nested Proxy Services in TypeScript
DESCRIPTION: This snippet shows how to retrieve the nested `Api` proxy service using `getApi()` and then access its nested services (`todos`, `authors`) to call their respective methods, demonstrating deep cross-context communication.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_11

LANGUAGE: TypeScript
CODE:
```
// Get an instance
const api = getApi();
const todos = await api.todos.getAll();
const firstAuthor = await api.authors.getOne(todos.authorId);
```

--------------------------------

TITLE: `@webext-core/match-patterns` - Work with Match Patterns
DESCRIPTION: Utilities for working with match patterns, commonly used in web extension manifests to specify URLs. Simplifies pattern matching and validation.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_4

LANGUAGE: typescript
CODE:
```
Utilities for working with match patterns.
```

--------------------------------

TITLE: Extension Messaging
DESCRIPTION: Defines types and functions for creating messengers using browser.runtime.sendMessage and browser.tabs.sendMessage APIs for background script communication.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_2

LANGUAGE: APIDOC
CODE:
```
ExtensionMessage:
  __interface__
  sender: Runtime.MessageSender
    - Information about where the message came from. See
      [`Runtime.MessageSender`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/MessageSender).

ExtensionMessagingConfig:
  __interface__
  extends BaseMessagingConfig

ExtensionMessenger<TProtocolMap extends Record<string, any>>:
  __type__
  GenericMessenger<TProtocolMap, ExtensionMessage, ExtensionSendMessageArgs>

ExtensionSendMessageArgs:
  __type__
  [arg?: number | SendMessageOptions]
  - Send message accepts either:
    - No arguments to send to background
    - A tabId number to send to a specific tab
    - A SendMessageOptions object to target a specific tab and frame
  - You cannot message between tabs directly. It must go through the background script.

defineExtensionMessaging<TProtocolMap extends Record<string, any> = Record<string, any>>(
  config?: ExtensionMessagingConfig
): ExtensionMessenger<TProtocolMap> {
  // ...
}
  - Returns an ExtensionMessenger backed by `browser.runtime.sendMessage` and `browser.tabs.sendMessage`.
  - Used to send messages to and from the background page/service worker.
```

--------------------------------

TITLE: Import Job Scheduler in TypeScript
DESCRIPTION: Imports the `defineJobScheduler` function from the @webext-core/job-scheduler package. This function is used to initialize the scheduler.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { defineJobScheduler } from '@webext-core/job-scheduler';
```

--------------------------------

TITLE: Initialize Job Scheduler in Background Script
DESCRIPTION: Initializes the job scheduler by calling `defineJobScheduler` once in the background script or service worker. The returned object is used to manage jobs.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_4

LANGUAGE: ts
CODE:
```
import { defineJobScheduler } from '@webext-core/job-scheduler';

const jobs = defineJobScheduler();
```

--------------------------------

TITLE: Schedule One-Time Job
DESCRIPTION: Schedules a job to run once at a specific future date and time. The `execute` function contains the logic to be performed.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_5

LANGUAGE: ts
CODE:
```
jobs.scheduleJob({
  id: 'job1',
  type: 'once',
  date: Date.now() + 1.44e7, // In 4 hours
  execute: () => {
    console.log('Executed job once');
  },
});
```

--------------------------------

TITLE: Define Proxy Service using a Function in TypeScript
DESCRIPTION: Explains how to define a proxy service using a single function. This is ideal for very simple services that expose only one operation. It shows registering a standalone function using `defineProxyService`. Dependencies include `idb` and `@webext-core/proxy-service`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_2

LANGUAGE: typescript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

export const [registerGetAllTodos, getGetAllTodos] = defineProxyService(
  'TodosRepo',
  (db: Promise<IDBPDatabase>) =>
    function getAllTodos() {
      return (await this.db).getAll('todos');
    },
);
```

LANGUAGE: typescript
CODE:
```
// Register
const db = openDB('todos');
registerGetAllTodos(db);
```

LANGUAGE: typescript
CODE:
```
// Get an instance
const getAllTodos = getGetAllTodos();
const todos = await getAllTodos();
```

--------------------------------

TITLE: `@webext-core/job-scheduler` - Schedule Reoccuring Jobs
DESCRIPTION: Easily schedule and manage reoccurring jobs within a web extension. Provides utilities for background tasks and timed operations.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_3

LANGUAGE: typescript
CODE:
```
Easily schedule and manage reoccuring jobs.
```

--------------------------------

TITLE: Schedule CRON Job
DESCRIPTION: Schedules a job to run based on a cron expression. The `expression` parameter defines the schedule, and a link to crontab.guru is provided for reference.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_7

LANGUAGE: ts
CODE:
```
jobs.scheduleJob({
  id: 'job3',
  type: 'cron',
  expression: '0 */2 * * *', // https://crontab.guru/#0_*/2_*_*_*
  execute: () => {
    console.log('Executed CRON job');
  },
});
```

--------------------------------

TITLE: Define Extension Storage Function
DESCRIPTION: Creates a typed storage instance using a provided storage area. It allows for optional schema definition for enhanced type safety during data operations.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_0

LANGUAGE: ts
CODE:
```
function defineExtensionStorage<TSchema extends AnySchema = AnySchema>(
  storage: Storage.StorageArea
): ExtensionStorage<TSchema> {
  // ...
}
```

LANGUAGE: APIDOC
CODE:
```
defineExtensionStorage:
  Creates a storage instance with an optional schema, TSchema, for type safety.
  Parameters:
    storage: Storage.StorageArea - The storage to use. Either Browser.storage.local, Browser.storage.sync, or Browser.storage.managed.
  Returns:
    ExtensionStorage<TSchema> - An instance of ExtensionStorage.
  Examples:
    import browser from 'webextension-polyfill';

    interface Schema {
      installDate: number;
    }
    const extensionStorage = defineExtensionStorage<Schema>(browser.storage.local);

    const date = await extensionStorage.getItem("installDate");
```

--------------------------------

TITLE: JobSchedulerConfig Interface
DESCRIPTION: Configuration options for the JobScheduler, primarily allowing the injection of a custom logger. If null, logging is disabled.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_6

LANGUAGE: ts
CODE:
```
interface JobSchedulerConfig {
  logger?: Logger | null;
}
```

--------------------------------

TITLE: Correct Usage and Type Inference
DESCRIPTION: Shows the expected behavior and automatic type inference when correctly interacting with type-safe storage. It demonstrates how `getItem` returns values with their inferred types (or `null`) and `setItem` accepts values matching the schema.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/1.typescript.md#_snippet_2

LANGUAGE: TypeScript
CODE:
```
const installDate /*: number | null */ = await extensionStorage.getItem('installDate');
await extensionStorage.setItem('installDate', 123);

const notificationsEnalbed /*: boolean | null */ =
  await extensionStorage.getItem('notificationsEnalbed');

const favorites /*: string[] | null */ = await extensionStorage.getItem('favoriteUrls');
favorites ??= [];
favorites.push('https://github.com');
await extensionStorage.setItem('favoriteUrls', favorites);
```

--------------------------------

TITLE: JobScheduler Interface
DESCRIPTION: Provides methods to schedule and remove jobs, and to subscribe to 'success' and 'error' events. It allows managing job execution lifecycle and receiving results or errors.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_5

LANGUAGE: ts
CODE:
```
interface JobScheduler {
  scheduleJob(job: Job): Promise<void>;
  removeJob(jobId: string): Promise<void>;
  on(
    event: "success",
    callback: (job: Job, result: any) => void,
  ): RemoveListenerFn;
  on(
    event: "error",
    callback: (job: Job, error: unknown) => void,
  ): RemoveListenerFn;
}
```

--------------------------------

TITLE: OnceJob Interface
DESCRIPTION: Defines a job that executes only once at a specified date and time. It requires an ID, type, the execution date (as Date, string, or number), and an execute function.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_8

LANGUAGE: ts
CODE:
```
interface OnceJob {
  id: string;
  type: "once";
  date: Date | string | number;
  execute: ExecuteFn;
}
```

--------------------------------

TITLE: Async Message Return Type Handling
DESCRIPTION: Illustrates how protocol maps handle asynchronous message returns. You define the synchronous return type (e.g., `string`), and the system automatically wraps it in a `Promise`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/1.protocol-maps.md#_snippet_2

LANGUAGE: typescript
CODE:
```
interface ProtocolMap {
  someMessage(): string; // [!code ++]
  someMessage(): Promise<string>; // [!code --]
}
```

--------------------------------

TITLE: Logger Interface
DESCRIPTION: Defines the interface for logging messages within the job scheduler. It includes standard methods like debug, log, warn, and error.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_7

LANGUAGE: ts
CODE:
```
interface Logger {
  debug(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

--------------------------------

TITLE: ensureNotificationExists.test.ts
DESCRIPTION: Tests the ensureNotificationExists function, which creates a browser notification if it doesn't already exist.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/4.implemented-apis.md#_snippet_0

LANGUAGE: ts
CODE:
```
import { describe, it, beforeEach, vi, expect } from 'vitest';
import browser, { Notifications } from 'webextension-polyfill';
import { fakeBrowser } from '@webext-core/fake-browser';

async function ensureNotificationExists(
  id: string,
  notification: Notifications.CreateNotificationOptions,
): Promise<void> {
  const notifications = await browser.notifications.getAll();
  if (!notifications[id]) await browser.notifications.create(id, notification);
}

describe('ensureNotificationExists', () => {
  const id = 'some-id';
  const notification: Notifications.CreateNotificationOptions = {
    type: 'basic',
    title: 'Some Title',
    message: 'Some message...',
  };

  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('should create a notification if it does not exist', async () => {
    const createSpy = vi.spyOn(browser.notifications, 'create');

    await ensureNotificationExists(id, notification);

    expect(createSpy).toBeCalledTimes(1);
    expect(createSpy).toBeCalledWith(id, notification);
  });

  it('should not create the notification if it already exists', async () => {
    await fakeBrowser.notifications.create(id, notification);
    const createSpy = vi.spyOn(browser.notifications, 'create');

    await ensureNotificationExists(id, notification);

    expect(createSpy).not.toBeCalled();
  });
});
```

--------------------------------

TITLE: Create and Mount Isolated Element in TypeScript
DESCRIPTION: Demonstrates how to use `createIsolatedElement` to create an isolated DOM element for UI components in web extensions. It shows how to import the function, define UI content, configure CSS isolation, control event bubbling, and mount the isolated element into the document.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/isolated-element/README.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { createIsolatedElement } from '@webext-core/isolated-element';
import browser from 'webextension-polyfill';

function mountUI(root: HTMLElement) {
  const text = document.createElement('p');
  text.textContent = 'Isolated text';
  root.appendChild(text);
}

async function setupIsolatedUI() {
  const { parentElement, isolatedElement } = await createIsolatedElement({
    name: 'some-name',
    css: {
      url: browser.runtime.getURL('/path/to/styles.css'),
    },
    isolateEvents: true, // or array of event names to isolate, e.g., ['click', 'keydown']
  });

  mountUI(isolatedElement);
  document.body.appendChild(parentElement);
}

setupIsolatedUI();

```

--------------------------------

TITLE: Manually Triggering Browser Events with fakeBrowser.trigger
DESCRIPTION: Demonstrates how to use the `trigger` method on fakeBrowser event objects to manually invoke listeners. Pass the arguments that the listeners expect. Awaiting the trigger call ensures all listeners complete execution.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/2.triggering-events.md#_snippet_0

LANGUAGE: ts
CODE:
```
await fakeBrowser.runtime.onInstalled.trigger({ reason: 'install' });
await fakeBrowser.alarms.onAlarm.trigger({
  name: 'alarm-name',
  periodInMinutes: 5,
  scheduledTime: Date.now(),
});
await fakeBrowser.tab.onCreated.trigger({ ... });
```

--------------------------------

TITLE: Defining Nested Proxy Services in TypeScript
DESCRIPTION: This snippet demonstrates how to define a proxy service with nested objects, combining classes and plain objects. The `createApi` function returns an object containing `TodosRepo` (class) and `authors` (object), allowing for structured service exposure.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/1.defining-services.md#_snippet_9

LANGUAGE: TypeScript
CODE:
```
import { openDB, IDBPDatabase } from 'idb';
import { defineProxyService } from '@webext-core/proxy-service';

class TodosRepo {
  constructor(private db: Promise<IDBPDatabase>) {}

  async getAll(): Promise<Todo[]> {
    return (await this.db).getAll('todos');
  }
}

const createAuthorsRepo = (db: Promise<IDBPDatabase>) => ({
  async getOne(id: string): Promise<Todo[]> {
    return (await this.db).getAll('authors', id);
  },
});

function createApi(db: Promise<IDBPDatabase>) {
  return {
    todos: new TodosRepo(db),
    authors: createAuthorsRepo(db),
  };
}

export const [registerApi, getApi] = defineProxyService('Api', createApi);
```

--------------------------------

TITLE: Import createIsolatedElement from @webext-core/isolated-element
DESCRIPTION: Demonstrates how to import the `createIsolatedElement` function from the library in TypeScript projects.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/0.installation.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { createIsolatedElement } from '@webext-core/isolated-element';
```

--------------------------------

TITLE: `@webext-core/storage` - Type-Safe Extension Storage
DESCRIPTION: Provides a type-safe API for accessing extension storage, similar to local storage. Facilitates easier management of browser storage for web extensions.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_1

LANGUAGE: typescript
CODE:
```
An alternative, type-safe API similar to local storage for accessing extension storage.
```

--------------------------------

TITLE: Handle Incoming Messages
DESCRIPTION: Sets up a listener for a specific message type ('getStringLength') using the `onMessage` function. The provided handler function processes the message data and returns a result.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging/README.md#_snippet_1

LANGUAGE: ts
CODE:
```
import { onMessage } from './messaging';

onMessage('getStringLength', message => {
  return message.data.length;
});
```

--------------------------------

TITLE: Send Multiple Arguments Object
DESCRIPTION: Demonstrates the correct way to call `sendMessage` when the message is defined to accept multiple arguments via an object. The arguments are passed as properties of the data object.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/1.protocol-maps.md#_snippet_4

LANGUAGE: typescript
CODE:
```
await sendMessage('someMessage', { arg1: ..., arg2: ... });
```

--------------------------------

TITLE: Create Isolated HTML Element (TypeScript)
DESCRIPTION: Creates an HTML element with isolated styles and event handling, preventing interference with the rest of the page. It returns the parent element to add to the DOM, the isolated element to mount UI to, and the shadow root.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/api.md#_snippet_0

LANGUAGE: APIDOC
CODE:
```
createIsolatedElement(options: CreateIsolatedElementOptions): Promise<{ parentElement: HTMLElement; isolatedElement: HTMLElement; shadow: ShadowRoot }>

  Description:
    Create an HTML element that has isolated styles from the rest of the page.

  Parameters:
    - options: CreateIsolatedElementOptions - Configuration object for creating the isolated element.

  Returns:
    - parentElement: HTMLElement - The parent element that can be added to the DOM.
    - isolatedElement: HTMLElement - The element to mount your UI to.
    - shadow: ShadowRoot - The shadow root of the isolated element.

  Examples:
    const { isolatedElement, parentElement } = createIsolatedElement({
      name: 'example-ui',
      css: { textContent: "p { color: red }" },
      isolateEvents: true // or ['keydown', 'keyup', 'keypress']
    });

    // Create and mount your app inside the isolation
    const ui = document.createElement("p");
    ui.textContent = "Example UI";
    isolatedElement.appendChild(ui);

    // Add the UI to the DOM
    document.body.appendChild(parentElement);
```

--------------------------------

TITLE: NamespaceMessagingConfig Interface
DESCRIPTION: Configuration interface for messaging that includes a namespace. This ensures that messengers only communicate with others of the same type and namespace.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_11

LANGUAGE: typescript
CODE:
```
interface NamespaceMessagingConfig extends BaseMessagingConfig {
  namespace: string;
}
```

--------------------------------

TITLE: FakeBrowser Type and Instance (TypeScript)
DESCRIPTION: Defines the `FakeBrowser` type as an extension of the `webextension-polyfill` Browser interface, adding testing utilities. It also provides the `fakeBrowser` constant, an in-memory implementation of the browser global for testing purposes.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/api.md#_snippet_0

LANGUAGE: TypeScript
CODE:
```
type FakeBrowser = BrowserOverrides & Browser;

```

LANGUAGE: TypeScript
CODE:
```
const fakeBrowser: FakeBrowser;

```

--------------------------------

TITLE: Infer Types with sendMessage and onMessage
DESCRIPTION: Shows how to use `onMessage` and `sendMessage` with a defined protocol map. Types for message data and return values are automatically inferred by TypeScript, simplifying usage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/1.protocol-maps.md#_snippet_1

LANGUAGE: typescript
CODE:
```
onMessage('message2', ({ data /* string */ }) /* : void */ => {});
onMessage('message3', (message) /* : boolean */ => true);

const res /* : boolean */ = await sendMessage('message3', undefined);
const res /* : boolean */ = await sendMessage('message4', 'text');
```

--------------------------------

TITLE: Managed Extension Storage Instance - TypeScript
DESCRIPTION: `managedExtStorage` is a pre-configured instance of `ExtensionStorage` that interfaces with the `browser.storage.managed` storage area. This storage area is typically used for enterprise policies and read-only data managed by an administrator.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_4

LANGUAGE: TypeScript
CODE:
```
const managedExtStorage: ExtensionStorage<AnySchema>;
```

--------------------------------

TITLE: `@webext-core/proxy-service` - Execute in Different JS Contexts
DESCRIPTION: Call a function, but execute it in a different JavaScript context, such as the browser's background script. Useful for cross-context communication and execution.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_5

LANGUAGE: typescript
CODE:
```
Call a function, but execute in a different JS context, like the background.
```

--------------------------------

TITLE: MessageSender Interface
DESCRIPTION: Contains information about the context from which a message or request originated. This includes details about the tab, frame, and extension or app ID.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_10

LANGUAGE: typescript
CODE:
```
interface MessageSender {
  tab?: Tabs.Tab;
  frameId?: number;
  id?: string;
  url?: string;
}
```

--------------------------------

TITLE: flattenPromise Utility Function
DESCRIPTION: A utility function that takes a promise resolving to a value and returns a proxy. This proxy internally awaits the promise, allowing direct access to the resolved value's properties and methods without needing to `await` twice. It simplifies handling promises passed as dependencies.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_2

LANGUAGE: typescript
CODE:
```
function flattenPromise<T>(promise: Promise<T>): DeepAsync<T> {
  // ...
}

// Example Usage:
// function createService(dependencyPromise: Promise<SomeDependency>) {
//   const dependency = flattenPromise(dependencyPromise);
//   return {
//     doSomething() {
//       await dependency.someAsyncWork();
//       // Instead of `await (await dependencyPromise).someAsyncWork();`
//     }
//   }
// }
```

--------------------------------

TITLE: Schedule Interval Job
DESCRIPTION: Schedules a job to run repeatedly at a defined interval. The `interval` parameter specifies the duration between executions.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_6

LANGUAGE: ts
CODE:
```
jobs.scheduleJob({
  id: 'job2',
  type: 'interval',
  interval: DAY, // Runs every 24 hours
  execute: () => {
    console.log('Executed job on interval');
  },
});
```

--------------------------------

TITLE: WindowMessenger Type
DESCRIPTION: Defines a generic messenger type for window-based communication, parameterized by a protocol map. It specifies the arguments required for sending messages, including a target origin.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_16

LANGUAGE: typescript
CODE:
```
type WindowMessenger<TProtocolMap extends Record<string, any>> =
  GenericMessenger<TProtocolMap, {}, WindowSendMessageArgs>;
```

--------------------------------

TITLE: Send Messages to Specific Tabs or Frames
DESCRIPTION: Shows how to send messages to a specific tab using its `tabId`. It also illustrates sending messages to a particular frame within a tab by providing both `tabId` and `frameId` in an options object.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_5

LANGUAGE: ts
CODE:
```
// content-script.ts (example listener)
import { onMessage } from './messaging';

onMessage('getStringLength', message => {
  return message.data.length;
});

// background.ts (example sender)
import { sendMessage } from './messaging';

// Send to all frames in a specific tab
const length = await sendMessage('getStringLength', 'hello world', tabId);

// Send to a specific frame in a specific tab
const length = await sendMessage('getStringLength', 'hello world', { tabId, frameId });
```

--------------------------------

TITLE: GenericMessenger Interface
DESCRIPTION: Defines the core interface for messaging systems, handling message sending and receiving with type safety. It supports protocol maps for defining message data and return types, and allows for message extensions.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_4

LANGUAGE: typescript
CODE:
```
interface GenericMessenger<
  TProtocolMap extends Record<string, any>,
  TMessageExtension,
  TSendMessageArgs extends any[],
> {
  sendMessage<TType extends keyof TProtocolMap>(
    type: TType,
    data: GetDataType<TProtocolMap[TType]>,
    ...args: TSendMessageArgs
  ): Promise<GetReturnType<TProtocolMap[TType]>>;
  onMessage<TType extends keyof TProtocolMap>(
    type: TType,
    onReceived: (
      message: Message<TProtocolMap, TType> & TMessageExtension,
    ) => void | MaybePromise<GetReturnType<TProtocolMap[TType]>>,
  ): RemoveListenerCallback;
  removeAllListeners(): void;
}
```

--------------------------------

TITLE: Logger Interface
DESCRIPTION: An interface defining methods for logging messages to the console. It includes standard logging levels such as debug, log, warn, and error.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_7

LANGUAGE: typescript
CODE:
```
interface Logger {
  debug(...args: any[]): void;
  log(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}
```

--------------------------------

TITLE: ExecuteFn Type
DESCRIPTION: Represents the function executed when a job runs. It can be synchronous or asynchronous, returning a Promise. Errors are caught and trigger an 'error' event, while successful return values trigger a 'success' event.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_2

LANGUAGE: ts
CODE:
```
type ExecuteFn = () => Promise<any> | any;
```

--------------------------------

TITLE: Define TypeScript Protocol Map Interface
DESCRIPTION: Demonstrates defining a TypeScript interface for protocol maps, specifying message names, data types, and return types. This interface is used with `defineExtensionMessaging` to automatically infer types for message sending and receiving.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/1.protocol-maps.md#_snippet_0

LANGUAGE: typescript
CODE:
```
interface ProtocolMap {
  message1(): void;                // No data and no return type
  message2(data: string): void;    // Only data
  message3(): boolean;             // Only a return type
  message4(data: string): boolean; // Data and return type
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

--------------------------------

TITLE: Pass Multiple Arguments via Object
DESCRIPTION: Explains how to pass multiple arguments to messages defined in a protocol map. Instead of multiple parameters, define the `data` parameter as an object with named properties.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/1.protocol-maps.md#_snippet_3

LANGUAGE: typescript
CODE:
```
interface ProtocolMap {
  someMessage(data: { arg1: string; arg2: boolean }): void; // [!code ++]
  someMessage(arg1: string, arg2: boolean): void; // [!code --]
}
```

--------------------------------

TITLE: Defining Custom Event Messenger in TypeScript
DESCRIPTION: This snippet defines a messenger using `defineCustomEventMessaging` for communication, typically preferred when iframe communication is not required. It uses `WebsiteMessengerSchema` to type messages and a `namespace` for isolation, similar to window messaging but leveraging `CustomEvent` APIs.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/0.installation.md#_snippet_11

LANGUAGE: TypeScript
CODE:
```
import { defineCustomEventMessaging } from '@webext-core/messaging/page';

export interface WebsiteMessengerSchema {
  init(data: unknown): void;
  somethingHappened(data: unknown): void;
}

export const websiteMessenger = defineCustomEventMessaging<WebsiteMessengerSchema>({
  namespace: '<some-unique-string>',
});
```

--------------------------------

TITLE: WindowSendMessageArgs Type
DESCRIPTION: Defines the arguments for the `sendMessage` method of a `WindowMessenger`. It requires an optional `targetOrigin` string, which specifies which frames should receive the message.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_17

LANGUAGE: typescript
CODE:
```
type WindowSendMessageArgs = [targetOrigin?: string];
```

--------------------------------

TITLE: CronJob Interface
DESCRIPTION: Defines a job executed based on a CRON expression. It extends cron.ParserOptions for timezone configurations and requires an ID, type, expression, and an execute function.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_0

LANGUAGE: ts
CODE:
```
interface CronJob extends cron.ParserOptions<false> {
  id: string;
  type: "cron";
  expression: string;
  execute: ExecuteFn;
}
```

--------------------------------

TITLE: Custom Event Messaging
DESCRIPTION: Defines types and functions for creating messengers using CustomEvent APIs, suitable for content script and injected script communication.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_1

LANGUAGE: APIDOC
CODE:
```
CustomEventMessage:
  __interface__
  event: CustomEvent
    - The event that was fired, resulting in the message being passed.

CustomEventMessagingConfig:
  __interface__
  extends NamespaceMessagingConfig

CustomEventMessenger<TProtocolMap extends Record<string, any>>:
  __type__
  GenericMessenger<TProtocolMap, CustomEventMessage, []>

defineCustomEventMessaging<TProtocolMap extends Record<string, any> = Record<string, any>>(
  config: CustomEventMessagingConfig
): CustomEventMessenger<TProtocolMap> {
  // ...
}
  - Creates a CustomEventMessenger backed by CustomEvent APIs.
  - Used for communication between content scripts and websites, or content scripts and injected scripts.
  - sendMessage does not accept additional arguments.

Example:
  interface WebsiteMessengerSchema {
    initInjectedScript(data: ...): void;
  }

  export const websiteMessenger = defineCustomEventMessenger<initInjectedScript>();

  // Content script
  websiteMessenger.sendMessage("initInjectedScript", ...);

  // Injected script
  websiteMessenger.onMessage("initInjectedScript", (...) => {
    // ...
  })
```

--------------------------------

TITLE: Defining MessageSender Interface (TypeScript)
DESCRIPTION: This interface provides details about the context from which a message or request originated. It includes optional properties such as the `tab` (if from a tab), `frameId` (if from a specific frame), `id` of the sending extension/app, and the `url` of the page or frame.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_19

LANGUAGE: typescript
CODE:
```
interface MessageSender {
  tab?: Tabs.Tab;
  frameId?: number;
  id?: string;
  url?: string;
}
```

--------------------------------

TITLE: Job Type
DESCRIPTION: A union type representing any of the supported job types: IntervalJob, CronJob, or OnceJob.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/api.md#_snippet_4

LANGUAGE: ts
CODE:
```
type Job = IntervalJob | CronJob | OnceJob;
```

--------------------------------

TITLE: CreateIsolatedElementOptions Interface (TypeScript)
DESCRIPTION: Defines the configuration options for the `createIsolatedElement` function, specifying element naming, shadow DOM mode, CSS injection, and event isolation behavior.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/api.md#_snippet_1

LANGUAGE: APIDOC
CODE:
```
CreateIsolatedElementOptions

  Description:
    Options that can be passed into `createIsolatedElement`.

  Properties:
    - name: string
      A unique HTML tag name (two words, kebab case - [see spec](https://html.spec.whatwg.org/multipage/custom-elements.html#valid-custom-element-name)) used when defining the web component used internally. Don't use the same name twice for different UIs.
    - mode?: "open" | "closed" (default: "closed")
      See [`ShadowRoot.mode`](https://developer.mozilla.org/en-US/docs/Web/API/ShadowRoot/mode).
    - css?: { url: string } | { textContent: string }
      Either the URL to a CSS file or the text contents of a CSS file. The styles will be mounted inside the shadow DOM so they don't effect the rest of the page.
    - isolateEvents?: boolean | string[]
      When enabled, `event.stopPropagation` will be called on events trying to bubble out of the shadow root.
      - Set to `true` to stop the propagation of a default set of events, `["keyup", "keydown", "keypress"]`.
      - Set to an array of event names to stop the propagation of a custom list of events.
```

--------------------------------

TITLE: Defining SendMessageOptions Interface (TypeScript)
DESCRIPTION: Specifies the options available when sending a message to a particular browser tab or frame. It requires a `tabId` and optionally accepts a `frameId`, where `0` denotes the main frame.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_23

LANGUAGE: TypeScript
CODE:
```
interface SendMessageOptions {
  tabId: number;
  frameId?: number;
}
```

--------------------------------

TITLE: Defining ProtocolWithReturn Interface (TypeScript)
DESCRIPTION: This deprecated interface was previously used to explicitly define both the data (`TData`) and return (`TReturn`) types for messages within a protocol map. It internally uses randomly named properties (`BtVgCTPYZu` for data, `RrhVseLgZW` for return) to prevent accidental implementation. Users are advised to use the function syntax for protocol maps instead.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_21

LANGUAGE: typescript
CODE:
```
interface ProtocolWithReturn<TData, TReturn> {
  BtVgCTPYZu: TData;
  RrhVseLgZW: TReturn;
}
```

LANGUAGE: typescript
CODE:
```
interface ProtocolMap {
  // data is a string, returns undefined
  type1: string;
  // data is a string, returns a number
  type2: ProtocolWithReturn<string, number>;
}
```

--------------------------------

TITLE: Declaring the fakeBrowser Instance in TypeScript
DESCRIPTION: This constant declares an in-memory instance of the `FakeBrowser` type. It serves as a mock implementation of the `browser` global, useful for simulating browser API interactions in a controlled environment.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/api.md#_snippet_1

LANGUAGE: ts
CODE:
```
const fakeBrowser: FakeBrowser;
```

--------------------------------

TITLE: Fake Browser State Reset APIs
DESCRIPTION: Provides methods for resetting the in-memory state of fake browser APIs during unit testing. These methods allow for a full state reset, resetting specific API states, or removing event listeners.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/3.reseting-state.md#_snippet_0

LANGUAGE: APIDOC
CODE:
```
FakeBrowser State Resetting:

reset()
  - Description: Resets all in-memory state for all fake APIs.
  - Usage: `fakeBrowser.reset()`
  - Notes: Synchronous operation. Recommended to call in a `beforeEach` block.

{api}.resetState()
  - Description: Resets the in-memory state for a specific fake API.
  - Parameters:
    - api: The name of the API to reset (e.g., 'storage', 'runtime').
  - Usage: `fakeBrowser.storage.resetState()`
  - Notes: Synchronous operation.

{api}.on{Event}.removeAllListeners()
  - Description: Removes all listeners registered for a specific event on a specific API.
  - Parameters:
    - api: The name of the API.
    - Event: The name of the event (e.g., 'Changed', 'Installed').
  - Usage: `fakeBrowser.runtime.onInstalled.removeAllListeners()`
  - Notes: Synchronous operation.
```

--------------------------------

TITLE: Resetting Specific API State with fakeBrowser.{api}.resetState() (JavaScript)
DESCRIPTION: This method allows for synchronously resetting the in-memory state of a specific API within the `fakeBrowser` instance. Replace `{api}` with the desired API name, such as `storage` or `tabs`.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/3.reseting-state.md#_snippet_1

LANGUAGE: JavaScript
CODE:
```
fakeBrowser.{api}.resetState()
```

--------------------------------

TITLE: ProtocolWithReturn Interface (Deprecated)
DESCRIPTION: An interface used to explicitly define a return type for a message in a protocol map. It is deprecated in favor of a function syntax for defining protocols.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_12

LANGUAGE: typescript
CODE:
```
interface ProtocolWithReturn<TData, TReturn> {
  BtVgCTPYZu: TData;
  RrhVseLgZW: TReturn;
}
```

--------------------------------

TITLE: Handling Optional Storage Fields with `null`
DESCRIPTION: Explains how to make storage keys optional by including `null` in their type definition (e.g., `boolean | null`). This allows `setItem` to accept `null` for these keys, reflecting their optional nature in storage.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/1.typescript.md#_snippet_3

LANGUAGE: TypeScript
CODE:
```
export interface LocalExtStorageSchema {
  installDate: number;
  notificationsEnabled: boolean; // [!code --]
  notificationsEnabled: boolean | null; // [!code ++]
  favoriteUrls: string[];
}
```

--------------------------------

TITLE: Type Checking with Type-Safe Storage
DESCRIPTION: Illustrates the type errors encountered when attempting to use incorrect keys or assign incompatible types to storage items when using a type-safe schema. This highlights the benefits of compile-time checks for storage operations.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/1.typescript.md#_snippet_1

LANGUAGE: TypeScript
CODE:
```
extensionStorage.getItem('unknownKey');
//                       ~~~~~~~~~~~~ Error: 'unknownKey' does not match `keyof LocalExtStorageSchema`

const installDate: Date = await extensionStorage.getItem('installDate');
//    ~~~~~~~~~~~~~~~~~ Error: value of type 'number' cannot be assigned to type 'Date'

await extensionStorage.setItem('favoriteUrls', 'not-an-array');
//                                             ~~~~~~~~~~~~~~ Error: type 'string' is not assignable to 'string[]'
```

--------------------------------

TITLE: Defining Namespace Messaging Configuration (TypeScript)
DESCRIPTION: This interface extends `BaseMessagingConfig` to include a `namespace` property. The `namespace` string is crucial for ensuring that a messenger only communicates with and listens for messages from other messengers that share the same type and namespace, providing isolation for message channels.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_20

LANGUAGE: typescript
CODE:
```
interface NamespaceMessagingConfig extends BaseMessagingConfig {
  namespace: string;
}
```

--------------------------------

TITLE: Defining WindowSendMessageArgs Type (TypeScript)
DESCRIPTION: Specifies the additional arguments required by the `sendMessage` method when using a `WindowMessenger`. This includes an optional `targetOrigin` string, which determines which frames within the page will receive the message, as detailed in the `Window.postMessage` API.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_26

LANGUAGE: TypeScript
CODE:
```
type WindowSendMessageArgs = [targetOrigin?: string];
```

--------------------------------

TITLE: `@webext-core/isolated-element` - Isolate Styles
DESCRIPTION: Create a container element whose styles are isolated from the rest of the page's styles. Prevents CSS conflicts and ensures predictable styling.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_6

LANGUAGE: typescript
CODE:
```
Create a container who's styles are isolated from the page's styles.
```

--------------------------------

TITLE: Session Extension Storage Instance - TypeScript
DESCRIPTION: `sessionExtStorage` is an `ExtensionStorage` implementation based on the `browser.storage.session` area, designed for temporary, session-specific data. It was introduced in Chrome 102, Safari 16.4, and Firefox 115, making it suitable for data that should not persist across browser sessions.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/api.md#_snippet_5

LANGUAGE: TypeScript
CODE:
```
const sessionExtStorage: ExtensionStorage<AnySchema>;
```

--------------------------------

TITLE: SendMessageOptions Interface
DESCRIPTION: Specifies options for sending a message to a specific tab or frame within a web extension. It includes the target tab ID and an optional frame ID.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_14

LANGUAGE: typescript
CODE:
```
interface SendMessageOptions {
  tabId: number;
  frameId?: number;
}
```

--------------------------------

TITLE: Defining CreateIsolatedElementOptions Interface - TypeScript
DESCRIPTION: This interface defines the configuration options for `createIsolatedElement`. It includes properties like `name` for a unique tag, `mode` for shadow DOM behavior, `css` for applying styles, and `isolateEvents` for controlling event propagation from the shadow root.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/isolated-element/api.md#_snippet_2

LANGUAGE: ts
CODE:
```
interface CreateIsolatedElementOptions {
  name: string;
  mode?: "open" | "closed";
  css?: { url: string } | { textContent: string };
  isolateEvents?: boolean | string[];
}
```

--------------------------------

TITLE: `@webext-core/messaging` - Type-Safe Messaging
DESCRIPTION: A simpler, type-safe API for sending and receiving messages between different parts of a web extension. Enhances communication reliability and developer experience.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/index.md#_snippet_2

LANGUAGE: typescript
CODE:
```
A simpler, type-safe API for sending and receiving messages.
```

--------------------------------

TITLE: Send Message and Receive Response
DESCRIPTION: Sends a message ('getStringLength') to another part of the extension (e.g., background script) and asynchronously waits for a response. The response is the result returned by the message handler.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging/README.md#_snippet_2

LANGUAGE: js
CODE:
```
import { sendMessage } from './messaging';

const length = await sendMessage('getStringLength', 'hello world');

console.log(length); // 11
```

--------------------------------

TITLE: Message Interface
DESCRIPTION: Represents the structure of a message received by the messaging system. It includes a unique ID, the message data, its type, and a timestamp.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_9

LANGUAGE: typescript
CODE:
```
interface Message<
  TProtocolMap extends Record<string, any>,
  TType extends keyof TProtocolMap,
> {
  id: number;
  data: GetDataType<TProtocolMap[TType]>;
  type: TType;
  timestamp: number;
}
```

--------------------------------

TITLE: Defining WindowMessenger Type (TypeScript)
DESCRIPTION: Defines the `WindowMessenger` type, which is a specialized `GenericMessenger` tailored for window-level messaging. It incorporates a protocol map and specific arguments for sending messages within a window context.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_25

LANGUAGE: TypeScript
CODE:
```
type WindowMessenger<TProtocolMap extends Record<string, any>> =
  GenericMessenger<TProtocolMap, {}, WindowSendMessageArgs>;
```

--------------------------------

TITLE: Avoid `undefined` for Storage Values
DESCRIPTION: Advises against using `undefined` in storage schemas, as storage values are always returned as `null` when missing. Using `| null` correctly represents the actual type returned by `getItem` for optional or unset values.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/storage/1.typescript.md#_snippet_4

LANGUAGE: TypeScript
CODE:
```
export interface LocalExtStorageSchema {
  key1?: number; // [!code --]
  key2: string | undefined; // [!code --]
  key1: number | null; // [!code ++]
  key2: string | null; // [!code ++]
}
```

--------------------------------

TITLE: InvalidMatchPattern Class
DESCRIPTION: Represents an error thrown when a match pattern is invalid. The constructor takes the invalid match pattern string and a reason for the error.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/match-patterns/api.md#_snippet_0

LANGUAGE: ts
CODE:
```
class InvalidMatchPattern extends Error {
  constructor(matchPattern: string, reason: string) {
    // ...
  }
}
```

--------------------------------

TITLE: GetReturnType Type Utility
DESCRIPTION: A TypeScript utility type that infers the return type from various message definitions, including function declarations or ProtocolWithReturn objects.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_6

LANGUAGE: typescript
CODE:
```
type GetReturnType<T> = T extends (...args: any[]) => infer R
  ? R
  : T extends ProtocolWithReturn<any, any>
    ? T["RrhVseLgZW"]
    : void;
```

--------------------------------

TITLE: Defining Message Interface (TypeScript)
DESCRIPTION: This interface describes the structure of a message received, including a semi-unique auto-incrementing `id` for tracing, the `data` payload passed, the message `type`, and a `timestamp` indicating when the message was sent. It provides comprehensive information about the message content and context.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_18

LANGUAGE: typescript
CODE:
```
interface Message<
  TProtocolMap extends Record<string, any>,
  TType extends keyof TProtocolMap,
> {
  id: number;
  data: GetDataType<TProtocolMap[TType]>;
  type: TType;
  timestamp: number;
}
```

--------------------------------

TITLE: Removing All Event Listeners with fakeBrowser.{api}.on{Event}.removeAllListeners() (JavaScript)
DESCRIPTION: This method synchronously removes all event listeners registered for a specific event on a particular API. Replace `{api}` with the API name and `{Event}` with the event name (e.g., `onChanged` for `storage.onChanged`).

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/fake-browser/3.reseting-state.md#_snippet_2

LANGUAGE: JavaScript
CODE:
```
fakeBrowser.{api}.on{Event}.removeAllListeners()
```

--------------------------------

TITLE: MaybePromise Type Utility
DESCRIPTION: A utility type that represents a value that can either be a direct value or a Promise resolving to that value. This is used to indicate that a method can be synchronous or asynchronous.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_8

LANGUAGE: typescript
CODE:
```
type MaybePromise<T> = Promise<T> | T;
```

--------------------------------

TITLE: ProxyService Type
DESCRIPTION: A TypeScript type that ensures a service interface only exposes asynchronous methods. If the original service type contains non-async methods, it applies `DeepAsync` to convert them; otherwise, it returns the original type.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_3

LANGUAGE: typescript
CODE:
```
type ProxyService<TService> =
  TService extends DeepAsync<TService> ? TService : DeepAsync<TService>;
```

--------------------------------

TITLE: Define Extension Messaging Protocol
DESCRIPTION: Defines the messaging protocol for the extension by creating a type-safe interface for message passing. This involves defining the expected message types and their corresponding data structures.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/packages/messaging/README.md#_snippet_0

LANGUAGE: ts
CODE:
```
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getStringLength(s: string): number;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

--------------------------------

TITLE: DeepAsync Recursive Type
DESCRIPTION: A recursive TypeScript type that transforms all methods within a given service type (`TService`) into asynchronous functions. This ensures that nested service methods are consistently handled as promises.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/proxy-service/api.md#_snippet_0

LANGUAGE: typescript
CODE:
```
type DeepAsync<TService> = TService extends (...args: any) => any
  ? ToAsyncFunction<TService>
  : TService extends { [key: string]: any }
    ? {
        [fn in keyof TService]: DeepAsync<TService[fn]>;
      }
    : never;
```

--------------------------------

TITLE: GetDataType Type Utility
DESCRIPTION: A TypeScript utility type that infers the data type from various message definitions, including function declarations, ProtocolWithReturn objects, or direct values.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_5

LANGUAGE: typescript
CODE:
```
type GetDataType<T> = T extends (...args: infer Args) => any
  ? Args["length"] extends 0 | 1
    ? Args[0]
    : never
  : T extends ProtocolWithReturn<any, any>
    ? T["BtVgCTPYZu"]
    : T;
```

--------------------------------

TITLE: RemoveListenerCallback Type
DESCRIPTION: Defines a callback function type for removing listeners. Calling this ensures an active listener has been removed; it's a no-op if the listener was already removed.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_13

LANGUAGE: typescript
CODE:
```
type RemoveListenerCallback = () => void;
```

--------------------------------

TITLE: Remove a Scheduled Job
DESCRIPTION: Stops a previously scheduled job by its ID. It's crucial to call `removeJob` for jobs that are no longer needed to prevent orphaned alarms.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/job-scheduler/0.installation.md#_snippet_8

LANGUAGE: ts
CODE:
```
job.removeJob('some-old-job');
```

--------------------------------

TITLE: Defining RemoveListenerCallback Type (TypeScript)
DESCRIPTION: Defines a callback type used to ensure an active listener has been successfully removed. If the listener has already been removed via `Messenger.removeAllListeners`, calling this callback will have no effect.

SOURCE: https://github.com/aklinker1/webext-core/blob/main/docs/content/messaging/api.md#_snippet_22

LANGUAGE: TypeScript
CODE:
```
type RemoveListenerCallback = () => void;
```
