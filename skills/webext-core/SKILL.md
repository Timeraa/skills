---
name: webext-core
description: Utilities for browser extensions - proxy services for cross-context RPC, type-safe messaging, URL match patterns, fake browser for testing, job scheduling, and shadow DOM isolation.
---

# webext-core - Browser Extension Utilities

## When to Use

Apply this skill when:
- `package.json` has any `@webext-core/*` dependency
- Code imports `defineProxyService`, `flattenPromise` from `@webext-core/proxy-service`
- Code imports `defineExtensionMessaging`, `defineWindowMessaging` from `@webext-core/messaging`
- Code uses `MatchPattern` from `@webext-core/match-patterns`
- Tests use `fakeBrowser` from `@webext-core/fake-browser`
- Code uses `defineJobScheduler` from `@webext-core/job-scheduler`
- Code uses `createIsolatedElement` from `@webext-core/isolated-element`

## Proxy Service (`@webext-core/proxy-service`)

Cross-context RPC for browser extensions. Define a service once, register it in the background script, and call it from any context (popup, content script, options page) — calls are automatically proxied via messaging.

### Basic Usage

```ts
// services/counter.ts
import { defineProxyService } from '@webext-core/proxy-service';

const [registerCounter, getCounter] = defineProxyService('CounterService', () => {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    getCount: () => count,
  };
});

export { registerCounter, getCounter };
```

```ts
// background.ts — register the real implementation
import { registerCounter } from '~/services/counter';
registerCounter();
```

```ts
// popup or content script — call via proxy
import { getCounter } from '~/services/counter';

const counter = getCounter();
const newCount = await counter.increment(); // Proxied to background
```

### Auto-Promisification

All proxy methods return `Promise`, even if the original is synchronous. This is because every call crosses context boundaries via messaging.

```ts
// Original: getCount() returns number
// Via proxy: getCount() returns Promise<number>
const count = await counter.getCount();
```

### Deep Nested Methods

Services can have nested objects — all methods at any depth are proxied:

```ts
const [registerApi, getApi] = defineProxyService('ApiService', () => ({
  users: {
    list: () => fetch('/api/users').then(r => r.json()),
    get: (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
  },
  settings: {
    get: (key: string) => localStorage.getItem(key),
    set: (key: string, value: string) => localStorage.setItem(key, value),
  },
}));

// Usage from any context
const api = getApi();
const users = await api.users.list();
```

### Constructor Arguments

Pass arguments when registering to configure the service:

```ts
const [registerDb, getDb] = defineProxyService(
  'DbService',
  (dbName: string, version: number) => {
    const db = openDatabase(dbName, version);
    return {
      query: (sql: string) => db.execute(sql),
    };
  },
);

// background.ts
registerDb('my-extension', 3);
```

### `flattenPromise()` Helper

When `getService()` itself returns a Promise (because the proxy is lazy), wrapping with `flattenPromise()` lets you call methods directly without first awaiting the service:

```ts
import { defineProxyService, flattenPromise } from '@webext-core/proxy-service';

const [registerAuth, _getAuth] = defineProxyService('AuthService', () => ({
  login: (token: string) => { /* ... */ },
  logout: () => { /* ... */ },
  isLoggedIn: () => { /* ... */ },
}));

// Without flattenPromise: must await getAuth() first
const auth = await _getAuth();
await auth.login('token');

// With flattenPromise: call methods directly
const getAuth = () => flattenPromise(_getAuth());
const auth2 = getAuth();
await auth2.login('token'); // Works without awaiting getAuth()

export { registerAuth, getAuth };
```

### Error Propagation

Errors thrown in the background service propagate to the caller:

```ts
const [registerSvc, getSvc] = defineProxyService('ErrorService', () => ({
  riskyOperation: () => {
    throw new Error('Something went wrong');
  },
}));

// In popup/content script
try {
  await getSvc().riskyOperation();
} catch (err) {
  console.error(err.message); // "Something went wrong"
}
```

## Messaging (`@webext-core/messaging`)

Type-safe messaging between extension contexts (background, popup, content scripts, injected scripts).

### Extension Messaging (Background ↔ Popup/Content Scripts)

#### Define Protocol Map (Function Syntax — Recommended)

```ts
// messaging.ts
import { defineExtensionMessaging } from '@webext-core/messaging';

interface ProtocolMap {
  getUser(userId: string): { name: string; email: string };
  saveSettings(settings: { theme: string }): void;
  ping(): 'pong';
}

export const { sendMessage, onMessage } = defineExtensionMessaging<ProtocolMap>();
```

#### Send Messages

```ts
import { sendMessage } from '~/messaging';

// From popup or content script → background
const user = await sendMessage('getUser', 'user-123');

// Send to a specific tab (from background → content script)
const result = await sendMessage('ping', undefined, { tabId: 42 });
```

#### Listen for Messages

```ts
import { onMessage } from '~/messaging';

// In background.ts
onMessage('getUser', ({ data: userId }) => {
  return db.getUser(userId);
});

onMessage('saveSettings', ({ data: settings }) => {
  storage.set(settings);
});

onMessage('ping', () => 'pong');
```

### Message Object Shape

Listeners receive a message object with these properties:

```ts
onMessage('getUser', (message) => {
  message.id;        // Unique message ID (number)
  message.type;      // 'getUser'
  message.data;      // The sent data (userId string)
  message.timestamp; // When sent (number)
  message.sender;    // MessageSender (tab info, frameId, etc.)
});
```

### Window Messaging (Content Script ↔ Injected Script)

For communication between a content script (isolated world) and an injected script (main world) on the same page:

```ts
// shared/window-messaging.ts
import { defineWindowMessaging } from '@webext-core/messaging';

interface WindowProtocol {
  getPageData(): { title: string; url: string };
  notifyExtension(data: { event: string }): void;
}

export const { sendMessage, onMessage } = defineWindowMessaging<WindowProtocol>({
  namespace: 'my-extension', // Prevents collisions with other extensions
});
```

```ts
// injected-script.ts (main world) — has access to page globals
import { onMessage } from '~/shared/window-messaging';

onMessage('getPageData', () => ({
  title: document.title,
  url: location.href,
}));
```

```ts
// content-script.ts (isolated world)
import { sendMessage } from '~/shared/window-messaging';

const pageData = await sendMessage('getPageData', undefined);
```

### One Listener Per Type Rule

Each message type can only have **one listener per context**. Adding a second listener for the same type replaces the first:

```ts
// WRONG — first listener silently replaced
onMessage('getData', () => 'first');
onMessage('getData', () => 'second'); // Only this one runs

// CORRECT — one listener that handles both cases
onMessage('getData', ({ data }) => {
  if (data.variant === 'a') return handleA();
  return handleB();
});
```

## Match Patterns (`@webext-core/match-patterns`)

Parse and test URLs against WebExtension match patterns.

### Basic Usage

```ts
import { MatchPattern, InvalidMatchPattern } from '@webext-core/match-patterns';

const pattern = new MatchPattern('*://*.example.com/*');
pattern.includes('https://www.example.com/page');  // true
pattern.includes('https://example.com/');           // true
pattern.includes('https://other.com/');             // false
```

### Pattern Syntax

| Pattern | Matches |
|---------|---------|
| `<all_urls>` | All URLs with http/https/ftp schemes |
| `*://*.example.com/*` | All subdomains of example.com, any scheme |
| `https://example.com/path/*` | Specific path prefix |
| `*://*/api/*` | Any host, path containing /api/ |
| `file:///path/*` | Local file URLs |

### Wildcard Rules

- **Scheme**: `*` matches `http` or `https` (not `file`, `ftp`)
- **Host**: `*.` prefix matches any subdomain (including no subdomain)
- **Path**: `*` matches any characters

### Error Handling

```ts
import { MatchPattern, InvalidMatchPattern } from '@webext-core/match-patterns';

try {
  const pattern = new MatchPattern('not-a-valid-pattern');
} catch (err) {
  if (err instanceof InvalidMatchPattern) {
    console.error('Bad pattern:', err.message);
  }
}
```

## Fake Browser (`@webext-core/fake-browser`)

In-memory implementation of the `browser` API for unit testing. Used automatically by WXT's `WxtVitest()` plugin, or standalone for non-WXT projects.

### Setup (Non-WXT)

```ts
// vitest.setup.ts
import { fakeBrowser } from '@webext-core/fake-browser';

// Use as global browser mock
globalThis.browser = fakeBrowser;
```

### Setup (WXT)

WXT's `WxtVitest()` plugin configures `fakeBrowser` automatically:

```ts
import { fakeBrowser } from 'wxt/testing/fake-browser';
```

### Usage in Tests

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';

describe('my service', () => {
  beforeEach(() => {
    fakeBrowser.reset(); // CRITICAL: reset state between tests
  });

  it('should store data', async () => {
    await browser.storage.local.set({ key: 'value' });
    const result = await browser.storage.local.get('key');
    expect(result).toEqual({ key: 'value' });
  });

  it('should create alarms', async () => {
    await browser.alarms.create('test', { delayInMinutes: 1 });
    const alarm = await browser.alarms.get('test');
    expect(alarm?.name).toBe('test');
  });
});
```

### Implemented APIs

| API | Status |
|-----|--------|
| `browser.alarms` | Full |
| `browser.notifications` | Full |
| `browser.runtime` | Partial (messaging, onInstalled, getURL, id) |
| `browser.storage` | Full (local, session, sync, managed) |
| `browser.tabs` | Partial (CRUD, query, onCreated/onRemoved/onUpdated) |
| `browser.windows` | Partial (CRUD, onCreated/onRemoved) |
| `browser.webNavigation` | Partial (onCommitted) |

### `EventForTesting` — Simulating Events

Trigger browser events manually in tests:

```ts
import { fakeBrowser } from '@webext-core/fake-browser';

it('should handle tab creation', async () => {
  const handler = vi.fn();
  browser.tabs.onCreated.addListener(handler);

  // Trigger the event manually
  await (fakeBrowser.tabs.onCreated as any).trigger({
    id: 1,
    url: 'https://example.com',
    active: true,
    index: 0,
    pinned: false,
    highlighted: false,
    windowId: 1,
    incognito: false,
  });

  expect(handler).toHaveBeenCalledOnce();
});
```

### Reset Between Tests

Always reset `fakeBrowser` in `beforeEach` to prevent test pollution:

```ts
beforeEach(() => {
  fakeBrowser.reset();
});
```

This clears all stored data, alarms, tabs, listeners, and other state.

## Job Scheduler (`@webext-core/job-scheduler`)

Schedule background jobs using the browser Alarms API. Handles persistence across extension restarts.

### Setup

```ts
// services/scheduler.ts
import { defineJobScheduler } from '@webext-core/job-scheduler';

export const scheduler = defineJobScheduler();
```

```ts
// background.ts
import { scheduler } from '~/services/scheduler';

scheduler.scheduleJob({
  id: 'sync-data',
  type: 'interval',
  intervalInMs: 15 * 60 * 1000, // 15 minutes
  execute: async () => {
    await syncDataFromServer();
  },
});
```

### Job Types

#### Interval — Repeating at fixed intervals

```ts
scheduler.scheduleJob({
  id: 'heartbeat',
  type: 'interval',
  intervalInMs: 5 * 60 * 1000, // Minimum: 1 minute (Alarms API constraint)
  execute: async () => {
    await sendHeartbeat();
  },
});
```

#### Cron — Repeating on a cron schedule

```ts
scheduler.scheduleJob({
  id: 'daily-cleanup',
  type: 'cron',
  expression: '0 2 * * *', // 2:00 AM daily
  execute: async () => {
    await cleanupOldData();
  },
});
```

#### Once — Runs a single time

```ts
scheduler.scheduleJob({
  id: 'onboarding-reminder',
  type: 'once',
  date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  execute: async () => {
    await showOnboardingReminder();
  },
});
```

### Minimum Interval

The browser Alarms API enforces a **minimum interval of 1 minute**. Intervals shorter than 60,000ms are rounded up.

### Event Handlers

```ts
const scheduler = defineJobScheduler({
  onSuccess: (jobId) => {
    console.log(`Job ${jobId} completed`);
  },
  onError: (jobId, error) => {
    console.error(`Job ${jobId} failed:`, error);
  },
});
```

## Isolated Element (`@webext-core/isolated-element`)

Create shadow DOM containers for content script UIs. Isolates styles from the host page.

### Basic Usage

```ts
import { createIsolatedElement } from '@webext-core/isolated-element';

const { parentElement, isolatedElement, shadow } = await createIsolatedElement({
  name: 'my-extension-ui',
  css: {
    textContent: `
      .container { padding: 16px; font-family: sans-serif; }
      button { background: #007bff; color: white; border: none; padding: 8px 16px; }
    `,
  },
});

// Build your UI inside isolatedElement
const app = document.createElement('div');
app.className = 'container';

const btn = document.createElement('button');
btn.textContent = 'Click me';
app.appendChild(btn);

isolatedElement.appendChild(app);

// Attach to the page
document.body.appendChild(parentElement);
```

### With a Framework (Vue)

```ts
import { createIsolatedElement } from '@webext-core/isolated-element';
import { createApp } from 'vue';
import App from './App.vue';

const { parentElement, isolatedElement } = await createIsolatedElement({
  name: 'my-extension-overlay',
  css: {
    textContent: await fetch(browser.runtime.getURL('/styles.css')).then(r => r.text()),
  },
  isolateEvents: ['click', 'keydown'],
});

const app = createApp(App);
app.mount(isolatedElement);
document.body.appendChild(parentElement);
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Custom element tag name (must contain a hyphen, e.g., `my-ext-ui`) |
| `css` | `{ textContent: string }` | Styles injected inside the shadow DOM |
| `mode` | `'open' \| 'closed'` | Shadow DOM mode (default: `'closed'`) |
| `isolateEvents` | `string[]` | Event types to stop from propagating to the host page |

### Custom Element Naming Rules

The `name` must be a valid custom element name:
- Must contain a hyphen (`-`)
- Cannot start with a digit
- Must be lowercase
- Cannot be a reserved name (`annotation-xml`, `color-profile`, `font-face`, etc.)

### Event Isolation

Prevent page scripts from intercepting your UI's events:

```ts
const { parentElement, isolatedElement } = await createIsolatedElement({
  name: 'my-extension-panel',
  css: { textContent: styles },
  isolateEvents: ['click', 'keydown', 'keyup', 'input'],
});
```

## Storage (`@webext-core/storage`)

> **If using WXT**, prefer WXT's built-in `storage.defineItem()` which provides versioning, migrations, and deeper framework integration. Use `@webext-core/storage` only in non-WXT extensions or when you need its localStorage-like API.

A `localStorage`-like wrapper around the `browser.storage` API with type safety and change listeners.

### Pre-configured Instances

```ts
import {
  localExtStorage,    // browser.storage.local
  sessionExtStorage,  // browser.storage.session
  syncExtStorage,     // browser.storage.sync
  managedExtStorage,  // browser.storage.managed (read-only)
} from '@webext-core/storage';
```

### Basic Operations

```ts
import { localExtStorage } from '@webext-core/storage';

await localExtStorage.setItem('username', 'alice');
const name = await localExtStorage.getItem<string>('username'); // 'alice'
await localExtStorage.removeItem('username');
await localExtStorage.clear();
```

### Custom Storage Instance

```ts
import { defineExtensionStorage } from '@webext-core/storage';

const myStorage = defineExtensionStorage<{
  username: string;
  theme: 'light' | 'dark';
  counter: number;
}>(browser.storage.local);

await myStorage.setItem('theme', 'dark');
const theme = await myStorage.getItem('theme'); // Typed as 'light' | 'dark'
```

### Change Listeners

```ts
import { localExtStorage } from '@webext-core/storage';

const unsubscribe = localExtStorage.onChange('theme', (newValue, oldValue) => {
  console.log(`Theme changed from ${oldValue} to ${newValue}`);
});

// Later: unsubscribe();
```

## Cross-Package Patterns

### Service + Job Scheduler

Register both in background, schedule recurring work through a service:

```ts
// services/sync.ts
const [registerSync, getSync] = defineProxyService('SyncService', () => ({
  syncNow: async () => { /* ... */ },
  getLastSync: () => { /* ... */ },
}));

export { registerSync, getSync };

// background.ts
import { registerSync, getSync } from '~/services/sync';
import { scheduler } from '~/services/scheduler';

registerSync();

scheduler.scheduleJob({
  id: 'auto-sync',
  type: 'interval',
  intervalInMs: 30 * 60 * 1000,
  execute: () => getSync().syncNow(),
});
```

### Messaging + Match Patterns

Filter messages based on URL patterns:

```ts
import { MatchPattern } from '@webext-core/match-patterns';

const allowedPattern = new MatchPattern('*://*.mysite.com/*');

onMessage('pageAction', ({ sender }) => {
  if (!sender.tab?.url || !allowedPattern.includes(sender.tab.url)) {
    throw new Error('Not allowed from this page');
  }
  return performAction();
});
```

### Service + Isolated Element

Build content script UIs that call background services:

```ts
import { createIsolatedElement } from '@webext-core/isolated-element';
import { getCounter } from '~/services/counter';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  async main() {
    const counter = getCounter();
    const { parentElement, isolatedElement } = await createIsolatedElement({
      name: 'my-ext-widget',
      css: { textContent: styles },
    });

    const btn = document.createElement('button');
    btn.textContent = 'Count: 0';
    btn.addEventListener('click', async () => {
      const count = await counter.increment();
      btn.textContent = `Count: ${count}`;
    });

    isolatedElement.appendChild(btn);
    document.body.appendChild(parentElement);
  },
});
```

## Anti-Patterns

### Multiple Listeners for Same Message Type

Each message type supports only one listener per context. A second `onMessage` call silently replaces the first:

```ts
// WRONG — first listener is lost
onMessage('getData', () => fetchFromCache());
onMessage('getData', () => fetchFromNetwork());

// CORRECT — single listener with branching logic
onMessage('getData', ({ data }) => {
  return data.useCache ? fetchFromCache() : fetchFromNetwork();
});
```

### Job Intervals Under 1 Minute

The Alarms API rounds intervals up to 1 minute. Sub-minute intervals appear to work but fire at 1-minute granularity:

```ts
// WRONG — appears to be 10 seconds, actually 1 minute
scheduler.scheduleJob({
  id: 'fast-poll',
  type: 'interval',
  intervalInMs: 10_000, // Rounded to 60_000
  execute: () => poll(),
});

// CORRECT — use minimum 1 minute, or use setInterval for sub-minute (loses persistence)
scheduler.scheduleJob({
  id: 'poll',
  type: 'interval',
  intervalInMs: 60_000,
  execute: () => poll(),
});
```

### Forgetting `fakeBrowser.reset()`

Without reset, state leaks between tests causing flaky failures:

```ts
// WRONG — tests depend on each other's state
describe('storage tests', () => {
  it('sets a value', async () => {
    await browser.storage.local.set({ key: 'value' });
  });
  it('reads a value', async () => {
    const result = await browser.storage.local.get('key');
    // Passes only if previous test runs first!
  });
});

// CORRECT
describe('storage tests', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });
  // Tests are now independent
});
```

### Expecting Synchronous Returns from Proxy Services

All proxy service methods return Promises, even if the original is synchronous:

```ts
const [register, get] = defineProxyService('Svc', () => ({
  getName: () => 'Alice', // Synchronous
}));

// WRONG
const name = get().getName(); // This is a Promise, not a string!

// CORRECT
const name = await get().getName(); // 'Alice'
```

### Calling `registerService()` Outside Background

The register function must be called in the background script. Calling it elsewhere creates a disconnected local instance:

```ts
// WRONG — registering in popup creates a separate instance
// popup.ts
registerCounter(); // This won't be accessible from other contexts

// CORRECT — always register in background
// background.ts
registerCounter();
```
