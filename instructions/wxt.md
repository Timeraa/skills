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

## Skill Structure

The generated `skills/wxt/SKILL.md` should:

1. Have YAML frontmatter with `name` and `description`
2. Cover all entrypoint types with file naming and definition APIs
3. Include content script UI examples for all frameworks (Vue, React, Svelte, Solid)
4. Document storage.defineItem with versioning and migrations
5. Cover auto-imports, testing, modules, multi-browser targeting
6. List common patterns and anti-patterns
7. Be **generic and public** - no references to specific closed-source projects

## Key Principles

- All code examples must use generic names (e.g., "my-extension", "example-ui")
- Include framework-specific examples where WXT APIs differ across frameworks
- Prioritize practical patterns over exhaustive API reference
- Include the "why" behind anti-patterns, not just "don't do this"
