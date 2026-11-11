# Upkeep — Cursor Context

A full [Home Assistant](https://www.home-assistant.io/) integration for recurring maintenance tasks. Includes a sidebar panel and Lovelace card. Replaces the unmaintained [TJPoorman/home_maintenance](https://github.com/TJPoorman/home_maintenance) integration.

## Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| UI       | Lit 3.x (Web Components) |
| Build    | Rollup 4.x |
| Language | TypeScript 5.9 |
| Testing  | Vitest + Testing Library |
| Linting  | ESLint 9 + Prettier 3 |
| Git Hooks| Lefthook |

**Key dependencies:** `custom-card-helpers`, `home-assistant-js-websocket`, `lit`

## Project Structure

```
src/
├── upkeep-card.ts             # Main card element
├── editor.ts                  # Visual config editor (LovelaceCardEditor)
├── types.ts                   # HomeMaintenanceCardConfig, TaskData
├── const.ts                   # CARD_NAME, DEFAULTS, thresholds
├── utils.ts                   # discoverEntities, buildTaskData, sortTasks, filterTasks
├── styles.ts                  # Shared CSS
├── components/
│   ├── task-tile.ts           # Single task display
│   ├── summary-header.ts      # Status counts header
│   └── progress-ring.ts       # Circular/horizontal progress
└── localize/
    └── languages/             # en.json, es.json, ca.json
```

## Conventions

- **Lit decorators:** Use `@customElement`, `@property`, `@state`; prefer reactive patterns
- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.) — use `npm run commit`
- **Pre-commit:** Runs lint, typecheck, test, format check, build; stages `dist/`
- **Localization:** All user-facing strings via `localize('key.path')` from `src/localize/`

## Key Types

- `HomeMaintenanceCardConfig` — card config (entities, view_mode, progress_type, sort_by, filter, etc.)
- `TaskData` — normalized task (entity_id, name, icon, progress, urgency, days_remaining)
- `urgency`: `'on_track' | 'due_soon' | 'overdue'`

## Commands

| Command              | Description |
| -------------------- | ----------- |
| `npm run dev:up`     | Build, then start Home Assistant on `:8124` with this integration mounted |
| `npm run dev:watch`  | Rebuild card and panel into the mounted component |
| `npm run dev:restart`| Restart Home Assistant after Python edits |
| `npm run dev:logs`   | Follow the Home Assistant container logs |
| `npm run dev:down`   | Stop the Home Assistant container |
| `npm start`          | Card-only dev server on `:5000`; does not load the integration |
| `npm run build`      | Production build to `dist/` and `custom_components/upkeep/` |
| `npm run test`       | Vitest |
| `npm run lint`       | ESLint |
| `npm run typecheck`  | TypeScript check |

## HACS Plugin

- Category: **Integration** (HACS)
- Output: `dist/upkeep-card.js`, `custom_components/upkeep/www/upkeep-card.js`
- `hacs.json` defines name, filename, render_readme

## Local Testing in HA

`npm run dev:up` starts Home Assistant at `http://localhost:8124` and bind-mounts `custom_components/upkeep`. Config stays in `dev/config/` and is gitignored. Do not commit local credentials.

1. Create the local user during onboarding, then add **Upkeep** under **Settings → Devices & Services**.
2. `npm run dev:watch` while editing the card or panel, then refresh the browser.
3. `npm run dev:restart` after Python edits. Reloading the config entry does not reimport the component.
