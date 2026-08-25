# Upkeep

A full [Home Assistant](https://www.home-assistant.io/) integration for recurring maintenance tasks, with a sidebar panel for management and a Lovelace card for dashboards. Replaces the unmaintained [TJPoorman/home_maintenance](https://github.com/TJPoorman/home_maintenance) integration.

[![Open your Home Assistant instance and show the add repository dialog for this repository.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=etorhub&repository=upkeep&category=integration)
[![Vibe Coded](https://img.shields.io/badge/Vibe_Coded-ff69b4?style=for-the-badge)](https://github.com/danielrosehill/Is-Vibe-Coded)

---

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)
![Lit](https://img.shields.io/badge/Lit-3.3-324FFF?logo=lit&logoColor=white)
![Rollup](https://img.shields.io/badge/Rollup-4.x-EC4A3F?logo=rollup.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18?logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-3.x-1A2B34?logo=prettier&logoColor=white)
![Home Assistant](https://img.shields.io/badge/Home_Assistant-Lovelace-41BDF5?logo=home-assistant&logoColor=white)
![HACS](https://img.shields.io/badge/HACS-Integration-41BDF5)

| Layer            | Technology                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **UI**           | [Lit](https://lit.dev/) (Web Components)                                                                                                                                 |
| **Build**        | [Rollup](https://rollupjs.org/)                                                                                                                                          |
| **Language**     | [TypeScript](https://www.typescriptlang.org/)                                                                                                                            |
| **Testing**      | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)                                                                                          |
| **Linting**      | [ESLint](https://eslint.org/) + [Prettier](https://prettier.io/)                                                                                                         |
| **Git Hooks**    | [Lefthook](https://github.com/evilmartians/lefthook)                                                                                                                     |
| **Dependencies** | [custom-card-helpers](https://github.com/custom-cards/custom-card-helpers), [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) |

---

## Features

### Integration (Backend)
- **Task management** — Create recurring tasks (every N days/weeks/months) or frequency-based tasks (after N usages).
- **Sidebar panel** — Manage tasks from the sidebar: add, edit, complete, snooze.
- **Binary sensors** — Each task creates a `binary_sensor` entity for automations and dashboards.
- **NFC support** — Scan a tag to mark a task complete.
- **Entity watching** — Auto-increment frequency tasks when a watched entity changes state.
- **Events** — Fires `upkeep_task_due` when tasks become due; optional persistent notifications.
- **Snooze** — Disable tasks temporarily or until a specific date.

### Lovelace Card
- **Auto-discovery** — Automatically finds all Upkeep entities.
- **Progress visualization** — Circular progress ring or horizontal bar.
- **Color-coded urgency** — Green (on track), yellow (due soon), red (overdue), gray (snoozed).
- **One-tap completion** — Mark tasks as done from the card.
- **Multiple layouts** — Grid, list, or compact views.
- **Sorting & filtering** — Sort by urgency, name, or due date. Filter by status including snoozed.
- **Localization** — English, Spanish, Catalan, French, German, Italian, Dutch, and Portuguese.

---

## Installation

### HACS (Recommended)

Upkeep is installed as a HACS **custom repository** (Integration). Use the badge at the top of this README, or add it manually:

1. Open **HACS** in your Home Assistant instance.
2. Open the three-dot menu and choose **Custom repositories**.
3. Add `https://github.com/etorhub/upkeep` with category **Integration**.
4. Find **Upkeep** and click **Download**.
5. Restart Home Assistant.
6. Go to **Settings → Devices & Services → Add Integration** and add **Upkeep**.

If Upkeep later appears as a default HACS listing, you can search for it in HACS instead of adding the custom repository.

### Manual

1. Run `npm ci && npm run build` so `www/upkeep-card.js` and `panel/dist/main.js` exist.
2. Copy the `custom_components/upkeep` folder to your `config/custom_components/` directory.
3. Restart Home Assistant.
4. Go to **Settings → Devices & Services → Add Integration** and add **Upkeep**.

The Lovelace card is auto-registered when the integration is configured (served at `/upkeep_lovelace/upkeep-card.js`). Add the card to your dashboard via **Add Card → Upkeep Card**.

If you use **YAML mode** for Lovelace and added the card resource manually, use `/upkeep_lovelace/upkeep-card.js` instead of `/upkeep/upkeep-card.js`. Storage-mode dashboards are updated automatically when you reload the integration.

### Sidebar panel

After you add the Upkeep integration, a **sidebar panel** is registered automatically. You do not add it from **Settings → Dashboards** like a Lovelace view.

1. Complete **Settings → Devices & Services → Add Integration → Upkeep** (or use the HACS install flow above).
2. Look for **Upkeep** in the left sidebar (default icon: hammer-wrench).
3. Or open `https://<your-home-assistant>/upkeep` directly in the browser (bookmarking and refreshing this URL is supported).

To change visibility or labeling, go to **Settings → Devices & Services → Upkeep → Configure**:

- **Admins only** — when enabled, only administrator accounts see the sidebar item (off by default for new setups).
- **Sidebar title** / **Sidebar icon** — customize the name and MDI icon in the sidebar.

Install from a [GitHub release](https://github.com/etorhub/upkeep/releases) (HACS `zip_release`) so `panel/dist/main.js` is included. If the panel is missing from the sidebar and logs mention a missing panel file, upgrade to the latest release.

### Upkeep does not appear under Add integration

HACS installs the integration into `config/custom_components/upkeep/`. After install, **`manifest.json` must be directly in that folder**, not in a nested `custom_components/upkeep/` path inside it.

1. In **File editor** or SSH, confirm this file exists: `config/custom_components/upkeep/manifest.json`.
2. If you only see `config/custom_components/upkeep/custom_components/upkeep/manifest.json`, remove the whole `config/custom_components/upkeep` folder, update to the latest release in HACS, reinstall, and restart Home Assistant.
3. Then use **Settings → Devices & Services → Add integration** and search for **Upkeep**.

---

## Integration Structure

```
upkeep/
├── custom_components/upkeep/             # Python integration
│   ├── __init__.py
│   ├── binary_sensor.py
│   ├── config_flow.py
│   ├── coordinator.py
│   ├── entity_watch.py
│   ├── frontend.py
│   ├── panel/
│   │   └── dist/main.js                 # Sidebar panel
│   ├── store.py
│   ├── websocket.py
│   └── www/
│       └── upkeep-card.js               # Lovelace card
├── src/                                 # Card source
├── panel-src/                           # Panel source
├── hacs.json
├── package.json
└── rollup.config.js
```

### Release workflow

Releases are created automatically on every push to `main` using [semantic-release](https://github.com/semantic-release/semantic-release). Use [Conventional Commits](https://www.conventionalcommits.org/) for release notes.

CI builds the Lovelace card and sidebar panel, packages them into `upkeep.zip`, and attaches that zip to each GitHub release. HACS installs the integration from that release zip (`zip_release` in `hacs.json`); bundled JavaScript is not committed on `main`. For local development, run `npm run build` before copying `custom_components/upkeep` manually.

---

## Usage

### Minimal (auto-discovers everything)

```yaml
type: custom:upkeep-card
```

### Full configuration

```yaml
type: custom:upkeep-card
title: Manteniments
view_mode: grid
progress_type: ring
sort_by: urgency
filter: all
due_soon_days: 7
show_header: true
show_filter_bar: true
columns: 3
```

### Configuration options

| Option             | Type     | Default           | Description                                 |
| ------------------ | -------- | ----------------- | ------------------------------------------- |
| `title`            | string   | _(none)_          | Card title displayed at the top             |
| `entities`         | string[] | _(auto-discover)_ | Manual list of entity IDs                   |
| `exclude_entities` | string[] | `[]`              | Entity IDs to exclude from auto-discovery   |
| `view_mode`        | string   | `grid`            | `grid`, `list`, or `compact`                |
| `progress_type`    | string   | `ring`            | `ring` (circular) or `bar` (horizontal)     |
| `sort_by`          | string   | `urgency`         | `urgency`, `name`, or `due_date`            |
| `filter`           | string   | `all`             | `all`, `overdue`, `due_soon`, `on_track`, or `snoozed` |
| `due_soon_days`    | number   | `7`               | Days threshold for "due soon" status        |
| `show_header`      | boolean  | `true`            | Show the summary header with status counts  |
| `show_filter_bar`  | boolean  | `false`           | Show interactive filter chips               |
| `columns`          | number   | `3`               | Number of grid columns (grid mode only)     |

---

## Development

### Setup

```bash
# Clone the repository (Node.js >= 24)
git clone https://github.com/etorhub/upkeep.git
cd upkeep

# Install dependencies
npm install

# Install git hooks (optional but recommended)
npx lefthook install
```

### Commands

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm start`               | Dev build with watch + local server on `:5000` |
| `npm run build`           | Build card + panel into `dist/` and `custom_components/upkeep/` |
| `npm run package:integration` | Create `upkeep.zip` for release packaging (CI) |
| `npm run lint`            | Run ESLint                                     |
| `npm run lint:fix`        | ESLint with auto-fix                           |
| `npm run format`          | Prettier format                                |
| `npm run format:check`    | Prettier check                                 |
| `npm run typecheck`       | TypeScript check                               |
| `npm run test`            | Run Vitest tests                               |
| `npm run test:watch`      | Vitest watch mode                              |
| `npm run commit`          | Interactive commit wizard (Commitizen)         |

### Local Testing in Home Assistant

1. Run `npm start` to serve the dev build at `http://localhost:5000`.
2. Add a Lovelace resource:
   - **URL:** `http://<your-dev-machine-ip>:5000/upkeep-card.js`
   - **Type:** JavaScript Module
3. Ensure your dev machine is reachable from the Home Assistant host (same network or port forwarding).

### Git Hooks (Lefthook)

- **commit-msg:** Validates commit message format (Conventional Commits)
- **pre-commit:** lint, typecheck, test, format check

**Commit format:** All commits must use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`). Use `npm run commit` for an interactive wizard.

```bash
npx lefthook install   # Install hooks
npx lefthook run pre-commit  # Manual run
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to contribute.

---

## License

MIT
