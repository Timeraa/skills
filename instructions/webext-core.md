# webext-core Skill Generation Instructions

## Source Documentation

Read the following files from `sources/webext-core/packages/` to generate a comprehensive webext-core skill:

### Package READMEs and Source
- `packages/proxy-service/README.md` - Cross-context RPC via messaging
- `packages/proxy-service/src/` - defineProxyService, flattenPromise
- `packages/messaging/README.md` - Type-safe extension messaging
- `packages/messaging/src/` - defineExtensionMessaging, defineWindowMessaging, defineCustomEventMessaging
- `packages/match-patterns/README.md` - URL match pattern utilities
- `packages/match-patterns/src/` - MatchPattern class, InvalidMatchPattern error
- `packages/fake-browser/README.md` - In-memory browser API for testing
- `packages/fake-browser/src/` - fakeBrowser, implemented APIs, EventForTesting
- `packages/job-scheduler/README.md` - Background job scheduling via alarms
- `packages/job-scheduler/src/` - defineJobScheduler, job types (interval, cron, once)
- `packages/isolated-element/README.md` - Shadow DOM isolation for content scripts
- `packages/isolated-element/src/` - createIsolatedElement
- `packages/storage/README.md` - localStorage-like extension storage wrapper
- `packages/storage/src/` - defineExtensionStorage, localExtStorage, sessionExtStorage, etc.

## Important Notes

### `@webext-core/storage` Guidance
`@webext-core/storage` IS included in the skill, but with a prominent note:
> If using WXT, prefer WXT's built-in `storage.defineItem()` which provides versioning, migrations, and deeper integration. Use `@webext-core/storage` only in non-WXT extensions or when you need its localStorage-like API.

## Output Structure

The generated skill uses a **modular structure** — a concise overview plus topic-specific reference files.

### `skills/webext-core/SKILL.md` (overview, ≤500 words)

Must contain:
1. YAML frontmatter with `name` and `description`
2. "When to Use" triggers (import patterns per package)
3. Quick-reference table: package → purpose → `references/<file>.md`
4. The single most critical pattern (proxy service setup)

### `skills/webext-core/GENERATION.md`

```md
# Generation

- Source: https://github.com/aklinker1/webext-core
- Submodule path: sources/webext-core
```

### `skills/webext-core/references/` (one file per package/topic)

| Reference file | Source → content |
|---|---|
| `proxy-service.md` | `packages/proxy-service/` → defineProxyService, flattenPromise, constructor args, error propagation |
| `messaging.md` | `packages/messaging/` → extension messaging, window messaging, custom event messaging, protocol maps, one-listener rule |
| `match-patterns.md` | `packages/match-patterns/` → MatchPattern class, pattern syntax, wildcard rules, error handling |
| `fake-browser.md` | `packages/fake-browser/` → setup (standalone + WXT), implemented APIs, EventForTesting, reset between tests |
| `job-scheduler.md` | `packages/job-scheduler/` → job types (interval, cron, once), minimum interval, event handlers |
| `isolated-element.md` | `packages/isolated-element/` → shadow DOM setup, framework integration (Vue), event isolation, naming rules |
| `storage.md` | `packages/storage/` → localStorage-like API, custom storage instances, change listeners; WXT preference note |
| `patterns.md` | (synthesized) → cross-package patterns (service+scheduler, messaging+match-patterns, service+isolated-element); anti-patterns |

## Key Principles

- All code examples must use generic names (e.g., "CounterService", "my-extension")
- Prioritize practical patterns over exhaustive API reference
- Include the "why" behind anti-patterns, not just "don't do this"
- Show TypeScript usage throughout (the primary use case)
- `SKILL.md` must stay ≤500 words — detail belongs in `references/`
