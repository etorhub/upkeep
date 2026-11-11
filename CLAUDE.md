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
    └── languages/             # en, es, ca, fr, de, it, nl, pt
```

## Key Patterns

1. **Entity discovery:** `discoverEntities(hass, entities?, exclude_entities?)` — auto-finds `binary_sensor.*` with Upkeep attributes, or uses manual list
2. **Task data:** `buildTaskData(stateObj, dueSoonDays)` — computes progress, days_remaining, urgency
3. **Urgency:** `on_track` | `due_soon` | `overdue` — based on progress and `due_soon_days`
4. **Localization:** Card, editor, and panel strings use `localize('editor.title', vars?, language)` from `src/localize/languages/`. Home Assistant config-flow and service strings live in `custom_components/upkeep/translations/` and may use only official hassfest roots (`config`, `options`, `services`, and the other keys hassfest accepts). Persistent notifications and other integration-only copy live in `custom_components/upkeep/strings/`, loaded by `notice_catalog`. All three catalogs cover en, es, ca, fr, de, it, nl, and pt. `npm run check:i18n` requires matching keys and rejects any other root in `translations/`.

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
npm run dev:up         # Home Assistant at http://localhost:8124, integration bind-mounted
npm run dev:watch      # Rebuild card and panel into the mounted component
npm run dev:restart    # Required after Python edits
npm start              # Card-only server on :5000; does not load the integration
```

Local config, auth, and task data live in `dev/config/` (gitignored). See [CONTRIBUTING.md](CONTRIBUTING.md). Do not commit local credentials.

**Pre-commit:** lint, typecheck, test, format check (no committed bundles)

**Commits:** Use [Conventional Commits](https://www.conventionalcommits.org/) — `npm run commit` for wizard.

## HACS

- **Category:** Integration (includes Lovelace card in `www/`)
- **Release:** CI builds and publishes `upkeep.zip` (`zip_release` in `hacs.json`)
- **Local build outputs:** `custom_components/upkeep/www/upkeep-card.js`, `panel/dist/main.js`

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Ensure lint, typecheck, test, format check pass before committing.
