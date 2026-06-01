# Upkeep — Project Context

## Overview

Full [Home Assistant](https://www.home-assistant.io/) integration for recurring maintenance tasks. Includes a sidebar panel for management and a Lovelace card for dashboards. Replaces the unmaintained [TJPoorman/home_maintenance](https://github.com/TJPoorman/home_maintenance) integration.

## Tech Stack

- **UI:** Lit 3.x (Web Components)
- **Build:** Rollup 4.x
- **Language:** TypeScript 5.9 (strict mode)
- **Testing:** Vitest + Testing Library
- **Linting:** ESLint 9 + Prettier 3
- **Git Hooks:** Lefthook (commit-msg, pre-commit, pre-push)

**Dependencies:** `custom-card-helpers`, `home-assistant-js-websocket`, `lit`

## Project Structure

```
src/
├── upkeep-card.ts             # Main card (LitElement)
├── editor.ts                  # Visual config editor (LovelaceCardEditor)
├── types.ts                   # HomeMaintenanceCardConfig, TaskData
├── const.ts                   # CARD_NAME, DEFAULTS, PROGRESS_THRESHOLDS
├── utils.ts                   # discoverEntities, buildTaskData, sortTasks, filterTasks
├── styles.ts                  # Shared CSS
├── components/
│   ├── task-tile.ts           # Single task display
│   ├── summary-header.ts      # Overdue/due soon/on-track counts
│   └── progress-ring.ts       # Circular or horizontal progress
└── localize/
    └── languages/             # en.json, es.json, ca.json
```

## Key Patterns

1. **Entity discovery:** `discoverEntities(hass, entities?, exclude_entities?)` — auto-finds `binary_sensor.*` with Upkeep attributes, or uses manual list
2. **Task data:** `buildTaskData(stateObj, dueSoonDays)` — computes progress, days_remaining, urgency
3. **Urgency:** `on_track` | `due_soon` | `overdue` — based on progress and `due_soon_days`
4. **Localization:** All UI strings via `localize('editor.title')`, etc.

## Configuration Options

| Option           | Type     | Default   |
| ---------------- | -------- | --------- |
| title            | string   | —         |
| entities         | string[] | auto      |
| exclude_entities | string[] | []        |
| view_mode        | string   | grid      |
| progress_type    | string   | ring      |
| sort_by          | string   | urgency   |
| filter           | string   | all       |
| due_soon_days    | number   | 7         |
| show_header      | boolean  | true      |
| show_filter_bar  | boolean  | false     |
| columns          | number   | 3         |

## Development

```bash
npm install
npx lefthook install   # Optional: git hooks
npm start              # Dev server on :5000
```

**Pre-commit:** lint, typecheck, test, format check (no committed bundles)

**Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) — `npm run commit` for wizard.

## HACS

- **Category:** Integration (includes Lovelace card in `www/`)
- **Release:** CI builds and publishes `upkeep.zip` (`zip_release` in `hacs.json`)
- **Local build outputs:** `custom_components/upkeep/www/upkeep-card.js`, `panel/dist/main.js`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ensure lint, typecheck, test, format check pass before committing.
