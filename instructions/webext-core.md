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

## Skill Structure

The generated `skills/webext-core/SKILL.md` should:

1. Have YAML frontmatter with `name` and `description`
2. Cover all seven packages with practical code examples
3. Include cross-package integration patterns (service + storage, service + scheduler, etc.)
4. Document anti-patterns with explanations
5. Be **generic and public** - no references to specific closed-source projects

## Key Principles

- All code examples must use generic names (e.g., "CounterService", "my-extension")
- Prioritize practical patterns over exhaustive API reference
- Include the "why" behind anti-patterns, not just "don't do this"
- Show TypeScript usage throughout (the primary use case)
