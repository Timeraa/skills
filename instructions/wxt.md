# WXT Skill Generation Instructions

## Source Documentation

Read the following files from `sources/wxt/` to generate a comprehensive WXT skill:

### Core Documentation
- `docs/guide/essentials/entrypoints.md` - All entrypoint types, naming patterns, definition APIs
- `docs/guide/essentials/content-scripts.md` - Content script UIs, main world, SPA handling
- `docs/guide/essentials/project-structure.md` - Directory conventions, srcDir, custom paths
- `docs/guide/essentials/messaging.md` - Cross-context communication patterns
- `docs/guide/essentials/storage.md` - Storage recommendations
- `docs/guide/essentials/unit-testing.md` - Vitest setup, fakeBrowser, mocking
- `docs/guide/essentials/target-different-browsers.md` - Multi-browser builds, env vars
- `docs/guide/essentials/wxt-modules.md` - Using and creating modules
- `docs/guide/essentials/frontend-frameworks.md` - Vue, React, Svelte, Solid setup
- `docs/guide/essentials/scripting.md` - Dynamic script execution

### Configuration
- `docs/guide/essentials/config/` - All config files (manifest, vite, typescript, env vars, hooks, etc.)

### Storage API (separate package docs)
- `docs/storage.md` or https://wxt.dev/storage.html - Full storage.defineItem API

## Output Structure

The generated skill uses a **modular structure** — a concise overview plus topic-specific reference files.

### `skills/wxt/SKILL.md` (overview, ≤500 words)

Must contain:
1. YAML frontmatter with `name` and `description`
2. "When to Use" triggers (project signals, import patterns)
3. Quick-reference table: topic → `references/<file>.md`
4. The single most critical pattern/gotcha (e.g., `main()` cannot be async)

### `skills/wxt/GENERATION.md`

```md
# Generation

- Source: https://github.com/wxt-dev/wxt
- Submodule path: sources/wxt
```

### `skills/wxt/references/` (one file per topic)

| Reference file | Source docs → content |
|---|---|
| `config.md` | `config/` dir → wxt.config.ts, manifest, env vars, built-in env vars, TypeScript paths, runtime config, auto-imports, CLI |
| `entrypoints.md` | `project-structure.md`, `entrypoints.md` → project layout, background, HTML pages, unlisted scripts, browser targeting |
| `content-scripts.md` | `content-scripts.md`, `scripting.md` → content script definition, ctx, CSS, all 3 UI approaches (shadow root/integrated/iframe), main world, CustomEvent bridge, SPA navigation |
| `storage.md` | `storage.md` → defineItem, fallback/init, versioning, migrations, watchers, metadata, bulk ops |
| `messaging.md` | `messaging.md` → NPM package recommendations, proxy service pattern |
| `testing.md` | `unit-testing.md` → WxtVitest setup, fakeBrowser, mocking auto-imports |
| `modules.md` | `wxt-modules.md` → using published modules, creating local modules, build-time config, execution order |
| `multi-browser.md` | `target-different-browsers.md` → build commands, runtime detection, entrypoint filtering |
| `frontend-frameworks.md` | `frontend-frameworks.md` → Vue/React/Svelte/Solid setup, hash routing |
| `patterns.md` | (synthesized) → service registration, storage event broadcasting, context invalidation, all anti-patterns |

## Key Principles

- All code examples must use generic names (e.g., "my-extension", "example-ui")
- Include framework-specific examples where WXT APIs differ across frameworks
- Prioritize practical patterns over exhaustive API reference
- Include the "why" behind anti-patterns, not just "don't do this"
- `SKILL.md` must stay ≤500 words — detail belongs in `references/`
