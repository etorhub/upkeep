# Home Maintenance Card

A custom [Home Assistant](https://www.home-assistant.io/) Lovelace card for the [Home Maintenance](https://github.com/TJPoorman/home_maintenance) integration. Displays all your recurring maintenance tasks in a beautiful grid with circular progress rings, color-coded urgency, and one-tap task completion.

## Features

- **Auto-discovery** -- Automatically finds all Home Maintenance entities. No manual configuration required.
- **Progress visualization** -- Circular progress ring or horizontal bar showing how close each task is to its due date.
- **Color-coded urgency** -- Green (on track), yellow (due soon), red (overdue) with a pulsing glow for overdue tasks.
- **One-tap completion** -- Mark tasks as done directly from the card with a confirmation step.
- **Multiple layouts** -- Grid (default), list, or compact views.
- **Sorting & filtering** -- Sort by urgency, name, or due date. Filter by status.
- **Summary header** -- At-a-glance count of overdue, due soon, and on-track tasks.
- **Visual config editor** -- Configure everything through the HA UI, no YAML required.
- **Localization** -- English, Spanish, and Catalan.

## Prerequisites

This card requires the [Home Maintenance](https://github.com/TJPoorman/home_maintenance) integration to be installed and configured.

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance.
2. Go to **Frontend** and click the **+** button.
3. Search for **Home Maintenance Card**.
4. Click **Download**.
5. Refresh your browser.

### Manual

1. Download `home-maintenance-card.js` from the [latest release](https://github.com/yourusername/home-maintenance-card/releases/latest).
2. Copy it to your `config/www/` folder.
3. Add the resource in **Settings > Dashboards > Resources**:
   - URL: `/local/home-maintenance-card.js`
   - Type: JavaScript Module

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

| Option             | Type     | Default           | Description                                  |
| ------------------ | -------- | ----------------- | -------------------------------------------- |
| `title`            | string   | *(none)*          | Card title displayed at the top              |
| `entities`         | string[] | *(auto-discover)* | Manual list of entity IDs                    |
| `exclude_entities` | string[] | `[]`              | Entity IDs to exclude from auto-discovery    |
| `view_mode`        | string   | `grid`            | `grid`, `list`, or `compact`                 |
| `progress_type`    | string   | `ring`            | `ring` (circular) or `bar` (horizontal)      |
| `sort_by`          | string   | `urgency`         | `urgency`, `name`, or `due_date`             |
| `filter`           | string   | `all`             | `all`, `overdue`, `due_soon`, or `on_track`  |
| `due_soon_days`    | number   | `7`               | Days threshold for "due soon" status         |
| `show_header`      | boolean  | `true`            | Show the summary header with status counts   |
| `show_filter_bar`  | boolean  | `false`           | Show interactive filter chips                |
| `columns`          | number   | `3`               | Number of grid columns (grid mode only)      |

## Development

```bash
# Install dependencies
npm install

# Dev build with watch + local server on :5000
npm start

# Production build
npm run build
```

### Linting, Testing, Type Checking

```bash
npm run lint        # ESLint
npm run lint:fix    # ESLint with auto-fix
npm run format      # Prettier format
npm run format:check # Prettier check
npm run typecheck   # TypeScript check
npm run test        # Vitest tests
```

### Git Hooks (Lefthook)

Pre-commit runs lint, typecheck, test, and format check. Pre-push runs the full build.

```bash
npx lefthook install   # Install hooks
npx lefthook run pre-commit  # Manual run
```

To use the dev build in Home Assistant, add a resource pointing to `http://<your-dev-machine>:5000/home-maintenance-card.js`.

## License

MIT
