# Home Maintenance Card

A custom [Home Assistant](https://www.home-assistant.io/) Lovelace card for the [Home Maintenance](https://github.com/TJPoorman/home_maintenance) integration. Displays all your recurring maintenance tasks in a beautiful grid with circular progress rings, color-coded urgency, and one-tap task completion.

[![Open your Home Assistant instance and show the add repository dialog for this repository.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=etorhub&repository=home-maintenance-card&category=frontend)

---

## Tech Stack

![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?logo=typescript&logoColor=white)
![Lit](https://img.shields.io/badge/Lit-3.3-324FFF?logo=lit&logoColor=white)
![Rollup](https://img.shields.io/badge/Rollup-4.x-EC4A3F?logo=rollup.js&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-2.x-6E9F18?logo=vitest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-9.x-4B32C3?logo=eslint&logoColor=white)
![Prettier](https://img.shields.io/badge/Prettier-3.x-1A2B34?logo=prettier&logoColor=white)
![Home Assistant](https://img.shields.io/badge/Home_Assistant-Lovelace-41BDF5?logo=home-assistant&logoColor=white)
![HACS](https://img.shields.io/badge/HACS-Plugin-41BDF5)

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

- **Auto-discovery** — Automatically finds all Home Maintenance entities. No manual configuration required.
- **Progress visualization** — Circular progress ring or horizontal bar showing how close each task is to its due date.
- **Color-coded urgency** — Green (on track), yellow (due soon), red (overdue) with a pulsing glow for overdue tasks.
- **One-tap completion** — Mark tasks as done directly from the card with a confirmation step.
- **Multiple layouts** — Grid (default), list, or compact views.
- **Sorting & filtering** — Sort by urgency, name, or due date. Filter by status.
- **Summary header** — At-a-glance count of overdue, due soon, and on-track tasks.
- **Visual config editor** — Configure everything through the HA UI, no YAML required.
- **Localization** — English, Spanish, and Catalan.

---

## Prerequisites

This card requires the [Home Maintenance](https://github.com/TJPoorman/home_maintenance) integration to be installed and configured.

---

## Installation

### HACS (Recommended)

1. Open **HACS** in your Home Assistant instance.
2. Go to **Frontend** and click the **+** button.
3. Search for **Home Maintenance Card**.
4. Click **Download**.
5. Refresh your browser (or clear cache).

### Manual

1. Download `home-maintenance-card.js` from the [latest release](https://github.com/YOUR_GITHUB_USERNAME/home-maintenance-card/releases/latest).
2. Copy it to your `config/www/` folder.
3. Add the resource in **Settings → Dashboards → Resources**:
   - **URL:** `/local/home-maintenance-card.js`
   - **Type:** JavaScript Module

### Add Resource to Lovelace

If the resource is not auto-loaded, add it manually:

1. Go to **Settings → Dashboards → Resources**.
2. Click **+ Add resource**.
3. Set **URL** to `/local/home-maintenance-card.js` (manual) or `/hacsfiles/home-maintenance-card/home-maintenance-card.js` (HACS).
4. Set **Resource type** to **JavaScript Module**.
5. Click **Create**.

---

## Integration with Home Assistant & HACS

### HACS Category: Plugin (Frontend)

This is a **Plugin** (Frontend/Dashboard), not an Integration or Template:

- **Plugin** — Lovelace custom cards (JavaScript UI). Add via HACS → Frontend.
- **Integration** — Python custom components (backend entities, services).
- **Template** — Jinja2 templates for `custom_templates/`.

### HACS Plugin Structure

This project follows the standard HACS Lovelace plugin layout:

```
home-maintenance-card/
├── dist/
│   └── home-maintenance-card.js    # Built bundle (in releases)
├── hacs.json                        # HACS metadata
├── src/
│   ├── home-maintenance-card.ts    # Main card element
│   ├── editor.ts                   # Visual config editor
│   ├── types.ts
│   ├── const.ts
│   ├── utils.ts
│   ├── styles.ts
│   ├── components/
│   └── localize/
├── package.json
└── rollup.config.js
```

### `hacs.json`

```json
{
  "name": "Home Maintenance Card",
  "render_readme": true,
  "filename": "home-maintenance-card.js"
}
```

- **name** — Display name in HACS.
- **render_readme** — Show README in HACS UI.
- **filename** — JS file to load (from `dist/` in releases).

### Release workflow

Releases are created automatically on every push to `main` using [semantic-release](https://github.com/semantic-release/semantic-release). Use [Conventional Commits](https://www.conventionalcommits.org/) for release notes:

- `feat:` → minor version bump (e.g. 1.1.0)
- `fix:`, `docs:`, `chore:`, etc. → patch bump (e.g. 1.0.1)
- `BREAKING CHANGE:` in footer → major bump (e.g. 2.0.0)

### Adding to HACS Default Store

To submit this card to the HACS default store:

1. Fork [hacs/default](https://github.com/hacs/default).
2. Add your repo to `plugins` in the appropriate file.
3. Open a pull request.

For custom repositories, users can add it via **HACS → Frontend → + → Custom repositories** with your GitHub URL.

---

## Usage

### Minimal (auto-discovers everything)

```yaml
type: custom:home-maintenance-card
```

### Full configuration

```yaml
type: custom:home-maintenance-card
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
| `filter`           | string   | `all`             | `all`, `overdue`, `due_soon`, or `on_track` |
| `due_soon_days`    | number   | `7`               | Days threshold for "due soon" status        |
| `show_header`      | boolean  | `true`            | Show the summary header with status counts  |
| `show_filter_bar`  | boolean  | `false`           | Show interactive filter chips               |
| `columns`          | number   | `3`               | Number of grid columns (grid mode only)     |

---

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/YOUR_GITHUB_USERNAME/home-maintenance-card.git
cd home-maintenance-card

# Install dependencies
npm install

# Install git hooks (optional but recommended)
npx lefthook install
```

### Commands

| Command                | Description                                    |
| ---------------------- | ---------------------------------------------- |
| `npm start`            | Dev build with watch + local server on `:5000` |
| `npm run build`        | Production build to `dist/`                    |
| `npm run lint`         | Run ESLint                                     |
| `npm run lint:fix`     | ESLint with auto-fix                           |
| `npm run format`       | Prettier format                                |
| `npm run format:check` | Prettier check                                 |
| `npm run typecheck`    | TypeScript check                               |
| `npm run test`         | Run Vitest tests                               |
| `npm run test:watch`   | Vitest watch mode                              |
| `npm run storybook`    | Start Storybook dev server on `:6006`           |
| `npm run build-storybook` | Build static Storybook                      |
| `npm run test-storybook`  | Run Storybook test-runner (requires build)  |
| `npm run commit`       | Interactive commit wizard (Commitizen)         |

### Storybook (Development & Regression Testing)

Storybook provides a sandbox for developing and styling the card without Home Assistant:

```bash
npm run storybook
```

Stories cover all view modes (grid, list, compact), progress types (ring, bar), config options, and light/dark themes. For regression testing, run `npm run build-storybook` then `npm run test-storybook` (requires [Playwright](https://playwright.dev/) browsers: `npx playwright install`).

### Local Testing in Home Assistant

1. Run `npm start` to serve the dev build at `http://localhost:5000`.
2. Add a Lovelace resource:
   - **URL:** `http://<your-dev-machine-ip>:5000/home-maintenance-card.js`
   - **Type:** JavaScript Module
3. Ensure your dev machine is reachable from the Home Assistant host (same network or port forwarding).

### Git Hooks (Lefthook)

- **commit-msg:** Validates commit message format (Conventional Commits)
- **pre-commit:** lint, typecheck, test, format check, build and stage dist
- **pre-push:** full build

**Commit format:** All commits must use [Conventional Commits](https://www.conventionalcommits.org/) (e.g. `feat:`, `fix:`, `docs:`). Use `npm run commit` for an interactive wizard.

**Note:** The pre-commit hook runs `npm run build` and stages `dist/home-maintenance-card.js`, so the built file is included in every commit automatically.

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
