---
name: wxt
description: Build browser extensions with WXT - a next-gen framework with file-based entrypoints, Vite builds, auto-imports, typed storage with migrations, content script UIs, and multi-browser MV2/MV3 support.
---

# WXT - Browser Extension Framework

## When to Use

Apply this skill when:
- Project has `wxt.config.ts` in root
- Code uses `defineBackground`, `defineContentScript`, `defineUnlistedScript`
- `package.json` has `wxt` as a dependency
- Entrypoints directory contains extension entry files
- Code imports from `#imports` or `wxt/*`

## Project Structure

### Default Layout
```
project/
  .output/              # Build artifacts (gitignored)
  .wxt/                 # Generated types and TS config (gitignored)
  assets/               # CSS, images (processed by Vite)
  components/           # Auto-imported UI components
  composables/          # Auto-imported Vue composables
  entrypoints/          # All entrypoint files (CRITICAL)
  hooks/                # Auto-imported React/Solid hooks
  modules/              # Local WXT modules
  public/               # Static files copied as-is
  utils/                # Auto-imported utilities
  .env                  # Environment variables
  app.config.ts         # Runtime config
  web-ext.config.ts     # Browser startup config (gitignored)
  wxt.config.ts         # Main WXT config
```

### With `srcDir`
```ts
// wxt.config.ts
export default defineConfig({
  srcDir: 'src',
});
```
Moves `assets/`, `components/`, `composables/`, `entrypoints/`, `hooks/`, `utils/`, and `app.config.ts` under `src/`.

### Custom Directories
```ts
export default defineConfig({
  srcDir: 'src',
  modulesDir: 'wxt-modules',
  outDir: 'dist',
  publicDir: 'static',
  entrypointsDir: 'entries',
});
```

### Entrypoints Directory Rules
- Files in `entrypoints/` are limited to **zero or one level deep**
- **DO NOT** place helper files directly in `entrypoints/` - WXT treats every file there as an entrypoint
- Use directories with `index` files for entrypoints that need multiple files:
  ```
  entrypoints/
    popup/
      index.html       # The entrypoint
      App.vue           # Supporting file (not treated as entrypoint)
      style.css
    background.ts       # Single-file entrypoint
  ```

## Configuration (`wxt.config.ts`)

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  // Framework modules
  modules: ['@wxt-dev/module-vue'],

  // Source directory
  srcDir: 'src',

  // Manifest configuration (object or function)
  manifest: {
    name: 'My Extension',
    permissions: ['storage', 'tabs'],
    action: {},
  },

  // Or use function for dynamic manifest
  manifest: ({ browser, manifestVersion, mode, command }) => ({
    name: mode === 'development' ? 'My Extension (DEV)' : 'My Extension',
    permissions: ['storage'],
  }),

  // Vite config (must be a function)
  vite: () => ({
    plugins: [],
  }),

  // Auto-imports config (or false to disable)
  imports: {
    // unimport options
  },

  // Hooks
  hooks: {
    'build:manifestGenerated': (wxt, manifest) => {
      // Modify manifest before writing
    },
  },

  // Filter entrypoints
  filterEntrypoints: (entrypoint) => {
    // Return false to exclude
    return true;
  },
});
```

### Manifest

#### MV2/MV3 Auto-Conversion
Define in MV3 format - WXT auto-converts to MV2 when targeting MV2:
```ts
export default defineConfig({
  manifest: {
    action: {
      default_title: 'Click Me',
    },
    web_accessible_resources: [
      {
        matches: ['*://*.google.com/*'],
        resources: ['icon/*.png'],
      },
    ],
  },
});
```
MV2 output automatically converts `action` → `browser_action` and flattens `web_accessible_resources`.

#### Version
Version comes from `package.json`. Invalid suffixes are stripped for `version`, kept in `version_name`:
```json
{ "version": "1.3.0-alpha2" }
```
Generates: `"version": "1.3.0"`, `"version_name": "1.3.0-alpha2"`

#### Icons
Auto-discovered from `public/`:
```
public/
  icon-16.png
  icon-24.png
  icon-48.png
  icon-96.png
  icon-128.png
```
Or use `@wxt-dev/auto-icons` module.

### Environment Variables

WXT supports Vite-style dotenv files:
```
.env
.env.local
.env.[mode]
.env.[browser]
.env.[mode].[browser]
```

Prefix with `WXT_` or `VITE_`:
```sh
WXT_API_KEY=secret
```

Access at runtime:
```ts
import.meta.env.WXT_API_KEY
```

**In manifest, use function syntax** (env isn't loaded when object is evaluated):
```ts
// WRONG
export default defineConfig({
  manifest: {
    oauth2: { client_id: import.meta.env.WXT_CLIENT_ID },
  },
});

// CORRECT
export default defineConfig({
  manifest: () => ({
    oauth2: { client_id: import.meta.env.WXT_CLIENT_ID },
  }),
});
```

### Built-in Environment Variables

| Variable | Type | Description |
|----------|------|-------------|
| `import.meta.env.BROWSER` | `string` | Target browser |
| `import.meta.env.CHROME` | `boolean` | Is Chrome? |
| `import.meta.env.FIREFOX` | `boolean` | Is Firefox? |
| `import.meta.env.SAFARI` | `boolean` | Is Safari? |
| `import.meta.env.EDGE` | `boolean` | Is Edge? |
| `import.meta.env.OPERA` | `boolean` | Is Opera? |
| `import.meta.env.MANIFEST_VERSION` | `2 \| 3` | Target manifest version |
| `import.meta.env.MODE` | `string` | Build mode |
| `import.meta.env.DEV` | `boolean` | Development mode? |
| `import.meta.env.PROD` | `boolean` | Production mode? |

## Entrypoints

### Background

```ts
// entrypoints/background.ts
export default defineBackground({
  // Optional: MV2 only
  persistent: false,
  // Optional: Use ES module format
  type: 'module',
  // Optional: Browser targeting
  include: ['chrome'],
  exclude: ['firefox'],

  main() {
    // CANNOT be async
    // ALL runtime code must be inside main()
    browser.runtime.onInstalled.addListener(() => {
      console.log('Extension installed');
    });
  },
});
```

**Critical**: `main()` cannot be `async`. WXT imports entrypoints in Node.js at build time to extract options - code outside `main()` runs during build, not at runtime.

### Content Scripts

```ts
// entrypoints/overlay.content.ts
export default defineContentScript({
  matches: ['*://*.example.com/*'],
  excludeMatches: [],
  allFrames: false,
  runAt: 'document_idle',
  world: 'ISOLATED',            // or 'MAIN'
  cssInjectionMode: 'manifest', // or 'manual' or 'ui'
  registration: 'manifest',     // or 'runtime'
  include: ['chrome'],
  exclude: [],

  main(ctx) {
    // ctx provides lifecycle-safe helpers
    console.log('Content script loaded');
  },
});
```

#### Content Script Context

The `ctx` parameter provides helpers that auto-cleanup when the script is invalidated (e.g., on extension update):

```ts
main(ctx) {
  // These automatically clean up on context invalidation
  ctx.addEventListener(window, 'scroll', handler);
  ctx.setTimeout(() => { /* ... */ }, 1000);
  ctx.setInterval(() => { /* ... */ }, 5000);
  ctx.requestAnimationFrame(callback);

  // Check validity
  if (ctx.isValid) { /* still active */ }
  if (ctx.isInvalid) { /* invalidated */ }
}
```

#### CSS in Content Scripts

Import CSS directly - WXT bundles it automatically:
```ts
import './style.css';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  main(ctx) { /* ... */ },
});
```

### HTML Entrypoints

Popup, options, sidepanel, newtab, devtools, bookmarks, history, sandbox:

```html
<!-- entrypoints/popup/index.html -->
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Popup</title>
    <!-- Browser targeting via meta tags -->
    <meta name="manifest.include" content="['chrome', 'firefox']" />
    <meta name="manifest.exclude" content="['safari']" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

#### Popup Meta Tags
```html
<meta name="manifest.default_icon" content="{ 16: '/icon-16.png' }" />
<meta name="manifest.type" content="page_action" /> <!-- MV2 only -->
<meta name="manifest.browser_style" content="true" />
```

#### Options Meta Tags
```html
<meta name="manifest.open_in_tab" content="true" />
```

#### SidePanel Meta Tags
```html
<meta name="manifest.open_at_install" content="true" />
```

### Unlisted Scripts

For scripts injected dynamically (not declared in manifest):

```ts
// entrypoints/injected.ts
export default defineUnlistedScript({
  main() {
    console.log('Injected dynamically');
  },
});
```

Accessible at `/{name}.js` at runtime. Add to `web_accessible_resources` if injecting into web pages.

### Browser Targeting (`include`/`exclude`)

```ts
export default defineContentScript({
  include: ['chrome', 'firefox'],  // Only these browsers
  exclude: ['safari'],              // Not these browsers
  // ...
});
```

For HTML entrypoints, use `<meta>` tags instead.

## Content Script UI

Three approaches for injecting UI into web pages:

| Method | Isolated Styles | Isolated Events | HMR | Use Page Context |
|--------|:-:|:-:|:-:|:-:|
| Shadow Root | Yes | Yes (opt-in) | No | Yes |
| Integrated | No | No | No | Yes |
| IFrame | Yes | Yes | Yes | No |

### Shadow Root UI (Recommended)

Styles are isolated inside a shadow DOM. **Requires `cssInjectionMode: 'ui'`**.

#### Vue
```ts
import './style.css';
import { createApp } from 'vue';
import App from './App.vue';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'example-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = createApp(App);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app?.unmount();
      },
    });
    ui.mount();
  },
});
```

#### React
```tsx
import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'example-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = document.createElement('div');
        container.append(app);
        const root = ReactDOM.createRoot(app);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();
  },
});
```

#### Svelte
```ts
import './style.css';
import App from './App.svelte';
import { mount, unmount } from 'svelte';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'example-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        return mount(App, { target: container });
      },
      onRemove: (app) => {
        unmount(app);
      },
    });
    ui.mount();
  },
});
```

#### Solid
```tsx
import './style.css';
import { render } from 'solid-js/web';

export default defineContentScript({
  matches: ['*://*.example.com/*'],
  cssInjectionMode: 'ui',

  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'example-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const unmount = render(() => <div>Hello from Solid</div>, container);
        return unmount;
      },
      onRemove: (unmount) => {
        unmount?.();
      },
    });
    ui.mount();
  },
});
```

### Integrated UI

Renders directly into the page DOM. No style isolation.

```ts
import { createApp } from 'vue';
import App from './App.vue';

export default defineContentScript({
  matches: ['*://*.example.com/*'],

  main(ctx) {
    const ui = createIntegratedUi(ctx, {
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const app = createApp(App);
        app.mount(container);
        return app;
      },
      onRemove: (app) => {
        app.unmount();
      },
    });
    ui.mount();
  },
});
```

### IFrame UI

Full isolation. Requires a separate HTML entrypoint.

```ts
// 1. Create entrypoints/example-iframe.html
// 2. Add to web_accessible_resources in wxt.config.ts
// 3. Mount in content script:

export default defineContentScript({
  matches: ['*://*.example.com/*'],

  main(ctx) {
    const ui = createIframeUi(ctx, {
      page: '/example-iframe.html',
      position: 'inline',
      anchor: 'body',
      onMount: (wrapper, iframe) => {
        iframe.width = '400';
        iframe.height = '300';
      },
    });
    ui.mount();
  },
});
```

### UI Position Options

- `position: 'inline'` - Renders in normal page flow
- `position: 'overlay'` - Absolutely positioned over page content
- `position: 'modal'` - Centered overlay covering viewport

### Auto-Mounting to Dynamic Elements

For elements that appear/disappear (e.g., in SPAs):

```ts
const ui = createIntegratedUi(ctx, {
  position: 'inline',
  anchor: '#dynamic-element',
  onMount: (container) => { /* ... */ },
});

ui.autoMount(); // Watches DOM, mounts when anchor appears, unmounts when removed
```

### SPA Navigation Handling

Listen for client-side navigation (no page reload):

```ts
export default defineContentScript({
  matches: ['*://*.example.com/*'],

  main(ctx) {
    ctx.addEventListener(window, 'wxt:locationchange', ({ newUrl }) => {
      const pattern = new MatchPattern('*://*.example.com/dashboard*');
      if (pattern.includes(newUrl)) {
        mountDashboardUI(ctx);
      }
    });
  },
});
```

## Isolated World vs Main World

Content scripts run in an **isolated world** by default - they share the DOM but not JavaScript globals.

### Main World Access

**Preferred: Use `injectScript()`** instead of `world: 'MAIN'`:

```ts
// entrypoints/page-script.ts (unlisted script)
export default defineUnlistedScript(() => {
  // This runs in the page's JavaScript context
  console.log('Access to page globals:', window.somePageVar);
});

// entrypoints/example.content.ts
export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    await injectScript('/page-script.js', {
      keepInDom: true,
    });
  },
});

// wxt.config.ts - must add to web_accessible_resources
export default defineConfig({
  manifest: {
    web_accessible_resources: [
      {
        resources: ['page-script.js'],
        matches: ['*://*/*'],
      },
    ],
  },
});
```

### Cross-World Communication via CustomEvent

```ts
// entrypoints/page-script.ts (main world)
export default defineUnlistedScript(() => {
  const script = document.currentScript;

  script?.addEventListener('from-content-script', (event) => {
    if (event instanceof CustomEvent) {
      console.log('Received:', event.detail);
    }
  });

  script?.dispatchEvent(
    new CustomEvent('from-page-script', { detail: { data: 'hello' } }),
  );
});

// entrypoints/example.content.ts (isolated world)
export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    const { script } = await injectScript('/page-script.js', {
      modifyScript(script) {
        script.addEventListener('from-page-script', (event) => {
          if (event instanceof CustomEvent) {
            console.log('From page:', event.detail);
          }
        });
      },
    });

    script.dispatchEvent(
      new CustomEvent('from-content-script', { detail: 'hello from extension' }),
    );
  },
});
```

## Storage API

WXT provides `storage` via auto-import or `import { storage } from '#imports'`.

All keys require a storage area prefix: `local:`, `session:`, `sync:`, or `managed:`.

### Basic Usage

```ts
// WRONG - missing area prefix
await storage.getItem('counter');

// CORRECT
await storage.getItem<number>('local:counter');
await storage.setItem('local:counter', 42);
await storage.removeItem('local:counter');
```

### Defining Storage Items

Centralized, typed, reusable storage helpers:

```ts
const theme = storage.defineItem<'light' | 'dark'>('local:theme', {
  fallback: 'dark',
});

await theme.getValue();        // 'dark' if not set
await theme.setValue('light');
await theme.removeValue();

const unwatch = theme.watch((newValue) => {
  console.log('Theme changed:', newValue);
});
```

### Default Values

**`fallback`** - Returns default when key is missing (does not persist):
```ts
const showBadge = storage.defineItem('local:showBadge', {
  fallback: true,
});
```

**`init`** - Initializes and persists value if key is missing (runs once):
```ts
const userId = storage.defineItem('local:userId', {
  init: () => globalThis.crypto.randomUUID(),
});
```

### Versioning and Migrations

```ts
// Version 1: simple strings
type IgnoredSiteV1 = string;

// Version 2: objects with IDs
interface IgnoredSiteV2 {
  id: string;
  url: string;
}

// Version 3: add enabled flag
interface IgnoredSiteV3 {
  id: string;
  url: string;
  enabled: boolean;
}

export const ignoredSites = storage.defineItem<IgnoredSiteV3[]>(
  'local:ignoredSites',
  {
    fallback: [],
    version: 3,
    migrations: {
      2: (sites: IgnoredSiteV1[]): IgnoredSiteV2[] =>
        sites.map(url => ({ id: crypto.randomUUID(), url })),
      3: (sites: IgnoredSiteV2[]): IgnoredSiteV3[] =>
        sites.map(site => ({ ...site, enabled: true })),
    },
  },
);
```

Migrations run automatically when `defineItem()` is called. Operations like `getValue()` wait for migrations to complete.

### Watchers

```ts
const unwatch = storage.watch<number>('local:counter', (newValue, oldValue) => {
  console.log('Changed:', { newValue, oldValue });
});

// Later: unwatch();
```

### Metadata

Store additional metadata alongside values:
```ts
await storage.setMeta('local:preference', { lastModified: Date.now() });
await storage.getMeta('local:preference'); // { v: 1, lastModified: ... }
```

### Bulk Operations

```ts
await storage.setItems([
  { key: 'local:installDate', value: Date.now() },
  { item: userId, value: generateUserId() },
]);
```

## Messaging

WXT recommends using NPM packages for messaging rather than raw browser APIs:

- **`@webext-core/proxy-service`** - Call functions from any context, execute in background
- **`@webext-core/messaging`** - Lightweight, type-safe messaging wrapper
- **`trpc-chrome`** - tRPC adapter for extensions
- **`webext-bridge`** - Simple cross-context messaging

### Proxy Service Pattern

```ts
// services/counter.ts
import { defineProxyService } from '@webext-core/proxy-service';

const [registerCounter, getCounter] = defineProxyService('CounterService', () => {
  let count = 0;
  return {
    increment: () => ++count,
    getCount: () => count,
  };
});

export { registerCounter, getCounter };

// entrypoints/background.ts
import { registerCounter } from '~/services/counter';

export default defineBackground({
  main() {
    registerCounter(); // Creates the real service in background
  },
});

// entrypoints/popup/main.ts (or any other context)
import { getCounter } from '~/services/counter';

const counter = getCounter();
await counter.increment(); // Calls background via messaging
```

## Auto-Imports

### Default Auto-Imported Directories
- `<srcDir>/components/*` - UI components
- `<srcDir>/composables/*` - Vue composables
- `<srcDir>/hooks/*` - React/Solid hooks
- `<srcDir>/utils/*` - Utility functions

All named and default exports are available without import statements.

### Explicit Imports

Use `#imports` for explicit imports when needed:
```ts
import { createShadowRootUi, ContentScriptContext, MatchPattern } from '#imports';
```

### Disabling Auto-Imports

```ts
export default defineConfig({
  imports: false,
});
```

### ESLint Integration (v9)

```ts
// wxt.config.ts
export default defineConfig({
  imports: {
    eslintrc: { enabled: 9 },
  },
});
```

```js
// eslint.config.mjs
import autoImports from './.wxt/eslint-auto-imports.mjs';
export default [autoImports, { /* ... */ }];
```

## Testing

### Vitest Setup

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  plugins: [WxtVitest()],
});
```

The `WxtVitest()` plugin:
- Polyfills `browser` API with `@webext-core/fake-browser`
- Adds Vite config/plugins from `wxt.config.ts`
- Configures auto-imports
- Sets up `import.meta.env.BROWSER` etc.

### Testing with `fakeBrowser`

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';

const counter = storage.defineItem<number>('local:counter', { fallback: 0 });

describe('counter', () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  it('should increment', async () => {
    await counter.setValue(5);
    expect(await counter.getValue()).toBe(5);
  });

  it('should use fallback', async () => {
    expect(await counter.getValue()).toBe(0);
  });
});
```

### Mocking Auto-Imported APIs

Auto-imports resolve through `#imports` → real module paths. Find real paths in `.wxt/types/imports-module.d.ts` after running `wxt prepare`:

```ts
vi.mock('wxt/utils/inject-script', () => ({
  injectScript: vi.fn(),
}));
```

## Modules

### Using Published Modules

```ts
// wxt.config.ts
export default defineConfig({
  modules: [
    '@wxt-dev/module-vue',
    '@wxt-dev/module-react',
    '@wxt-dev/module-svelte',
    '@wxt-dev/module-solid',
    '@wxt-dev/auto-icons',
    '@wxt-dev/i18n/module',
  ],
});
```

### Creating Local Modules

```ts
// modules/my-module.ts
import { defineWxtModule } from 'wxt/modules';

export default defineWxtModule({
  setup(wxt) {
    // Modify config
    wxt.hook('config:resolved', () => {
      wxt.config.outDir = 'dist';
    });

    // Modify manifest
    wxt.hook('build:manifestGenerated', (_, manifest) => {
      manifest.name += ' (Custom)';
    });

    // Add custom entrypoints
    wxt.hook('entrypoints:found', (_, entrypointInfos) => {
      entrypointInfos.push({
        name: 'custom-script',
        inputPath: 'path/to/script.js',
        type: 'content-script',
      });
    });
  },
});
```

### Module with Build-time Config

```ts
import { defineWxtModule } from 'wxt/modules';
import 'wxt';

export interface MyModuleOptions {
  apiEndpoint: string;
}

declare module 'wxt' {
  export interface InlineConfig {
    myModule: MyModuleOptions;
  }
}

export default defineWxtModule<MyModuleOptions>({
  configKey: 'myModule',
  setup(wxt, options) {
    console.log('API endpoint:', options.apiEndpoint);
  },
});
```

### Execution Order
1. NPM modules (in order listed in `modules`)
2. User modules in `/modules` (alphabetically)
3. Hooks in `wxt.config.ts`

Control order with numeric prefixes: `modules/0.first.ts`, `modules/1.second.ts`

## Multi-Browser Targeting

### Build Commands
```sh
wxt              # defaults to chrome
wxt -b firefox
wxt -b safari
wxt -b edge
wxt --mv2        # Force MV2
wxt --mv3        # Force MV3
```

Default manifest versions: MV2 for Safari/Firefox, MV3 for Chrome/Edge/Opera.

### Runtime Detection
```ts
if (import.meta.env.BROWSER === 'firefox') {
  // Firefox-specific code
}

if (import.meta.env.CHROME) {
  // Chrome shorthand
}

if (import.meta.env.MANIFEST_VERSION === 2) {
  // MV2-specific code
}
```

### Entrypoint Filtering
```ts
export default defineContentScript({
  include: ['chrome', 'firefox'],
  exclude: ['safari'],
  // ...
});
```

## Runtime Config

```ts
// app.config.ts
import { defineAppConfig } from '#imports';

declare module 'wxt/utils/define-app-config' {
  export interface WxtAppConfig {
    theme?: 'light' | 'dark';
    apiKey?: string;
  }
}

export default defineAppConfig({
  theme: 'dark',
  apiKey: import.meta.env.WXT_API_KEY,
});
```

Access anywhere:
```ts
import { getAppConfig } from '#imports';
console.log(getAppConfig().theme);
```

## TypeScript

### Setup
```jsonc
// tsconfig.json
{
  "extends": ".wxt/tsconfig.json"
}
```

Run `wxt prepare` after install to generate types:
```json
{
  "scripts": {
    "postinstall": "wxt prepare"
  }
}
```

### Path Aliases

| Alias | Maps To |
|-------|---------|
| `~` / `@` | `<srcDir>/*` |
| `~~` / `@@` | `<rootDir>/*` |

Custom aliases go in `wxt.config.ts` (not tsconfig.json):
```ts
import { resolve } from 'node:path';

export default defineConfig({
  alias: {
    testing: resolve('utils/testing'),
  },
});
```

## Frontend Frameworks

### Setup

```ts
// Vue
export default defineConfig({ modules: ['@wxt-dev/module-vue'] });

// React
export default defineConfig({ modules: ['@wxt-dev/module-react'] });

// Svelte
export default defineConfig({ modules: ['@wxt-dev/module-svelte'] });

// Solid
export default defineConfig({ modules: ['@wxt-dev/module-solid'] });
```

### Routing in Extension Pages

Extensions must use **hash mode** routing (not path-based):
- Vue Router: `createWebHashHistory()`
- React Router: `createHashRouter()`
- Solid Router: `createHashHistory()`

## Common Patterns

### Service Registration Pattern
```ts
// Register services in background, access from anywhere
import { registerMyService } from '~/services/my-service';

export default defineBackground({
  main() {
    registerMyService();
  },
});
```

### Storage Event Broadcasting
Use storage watchers for cross-context event communication when you need to broadcast events between background, popup, content scripts:
```ts
const eventChannel = storage.defineItem<{ type: string; payload: unknown } | null>(
  'session:eventChannel',
  { fallback: null },
);

// Sender
await eventChannel.setValue({ type: 'USER_LOGGED_IN', payload: { userId: '123' } });

// Receiver (any context)
eventChannel.watch((event) => {
  if (event?.type === 'USER_LOGGED_IN') {
    handleLogin(event.payload);
  }
});
```

### Content Script Context Invalidation

Handle extension updates gracefully:
```ts
export default defineContentScript({
  matches: ['*://*/*'],
  main(ctx) {
    const interval = ctx.setInterval(() => {
      if (ctx.isInvalid) return;
      // Safe to use extension APIs
    }, 1000);

    // Cleanup on invalidation
    ctx.onInvalidated(() => {
      console.log('Extension updated, cleaning up...');
    });
  },
});
```

### Browser Startup Config
```ts
// web-ext.config.ts
import { defineWebExtConfig } from 'wxt';

export default defineWebExtConfig({
  binaries: {
    chrome: '/path/to/chrome-beta',
  },
  chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
});
```

## Anti-Patterns

### Runtime Code Outside `main()`
WXT imports entrypoints in Node.js at build time. Code outside `main()` runs during build:
```ts
// WRONG - runs at build time, not runtime
browser.action.onClicked.addListener(() => {});
export default defineBackground(() => {});

// CORRECT - all runtime code inside main()
export default defineBackground(() => {
  browser.action.onClicked.addListener(() => {});
});
```

### Async `defineBackground` main
```ts
// WRONG - main cannot be async
export default defineBackground({
  async main() { /* ... */ }
});

// CORRECT
export default defineBackground({
  main() {
    // Use .then() or call async functions without awaiting at top level
    someAsyncInit();
  },
});
```

### Deep Nesting in Entrypoints
```
// WRONG - entrypoints only support 0-1 levels deep
entrypoints/
  features/
    auth/
      login.content.ts

// CORRECT
entrypoints/
  login.content.ts
  // or
  login.content/
    index.ts
```

### Missing `cssInjectionMode` for Shadow Root UI
```ts
// WRONG - CSS won't appear in shadow DOM
export default defineContentScript({
  matches: ['*://*/*'],
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, { /* ... */ });
  },
});

// CORRECT
export default defineContentScript({
  matches: ['*://*/*'],
  cssInjectionMode: 'ui', // Required for shadow root CSS
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, { /* ... */ });
  },
});
```

### Using `world: 'MAIN'` Directly
```ts
// AVOID - limited browser support, security concerns
export default defineContentScript({
  world: 'MAIN',
  // ...
});

// PREFER - injectScript() for main world access
export default defineContentScript({
  matches: ['*://*/*'],
  async main() {
    await injectScript('/page-script.js');
  },
});
```

### Helper Files in Entrypoints Directory
```
// WRONG - WXT treats helpers.ts as an entrypoint
entrypoints/
  helpers.ts
  popup.html

// CORRECT - put helpers outside entrypoints/
utils/
  helpers.ts
entrypoints/
  popup.html
```

## CLI Reference

| Command | Description |
|---------|-------------|
| `wxt` | Start dev mode (Chrome, MV3) |
| `wxt -b firefox` | Dev mode for Firefox |
| `wxt build` | Production build |
| `wxt build -b firefox` | Production build for Firefox |
| `wxt zip` | Build and create zip for store submission |
| `wxt zip -b firefox` | Zip for Firefox (creates sources zip too) |
| `wxt prepare` | Generate types and `.wxt/` directory |
| `wxt clean` | Clean `.output/` and `.wxt/` |
| `wxt --mv2` | Force Manifest V2 |
| `wxt --mv3` | Force Manifest V3 |
| `wxt prepare --debug` | Debug entrypoint loading and hook order |
