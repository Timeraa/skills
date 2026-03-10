# Skills

AI coding agent skills, following the [antfu/skills](https://github.com/antfu/skills) pattern.

## Usage

Install with Claude Code:

```sh
npx skills add Timeraa/skills
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `wxt` | Build browser extensions with WXT framework |
| `webext-core` | Utilities for browser extensions - proxy services, messaging, match patterns, fake browser testing, job scheduling, and shadow DOM isolation |

## Development

### Setup

```sh
pnpm install
pnpm run init    # Add git submodules
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run init` | Initialize git submodules |
| `pnpm run sync` | Update submodules to latest |
| `pnpm run check` | Check for upstream updates |
| `pnpm run cleanup` | Remove unused submodules/skills |

### Adding a New Skill

1. Add the source repo to `meta.ts` under `submodules`
2. Create `instructions/<name>.md` with generation instructions
3. Run `pnpm run init` to add the submodule
4. Generate the skill into `skills/<name>/SKILL.md`
