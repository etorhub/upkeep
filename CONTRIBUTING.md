# Contributing

Contributions are welcome. Please:

1. **Fork** the repository.
2. **Create a branch** (`git checkout -b feature/your-feature`).
3. **Make changes** and ensure:
   - `npm run lint` passes
   - `npm run typecheck` passes
   - `npm run test` passes (Vitest and Python path guardrails)
   - `npm run format:check` passes
4. **Commit** with conventional format (`npm run commit` or `git commit -m "feat: add feature X"`).
5. **Push** to your fork (`git push origin feature/your-feature`).
6. Open a **Pull Request** against `main`.

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `npm run format` before committing)
- Prefer Lit decorators and reactive patterns

## Local Home Assistant

`npm run dev:up` builds the card and sidebar panel, then starts a Home Assistant container on [http://localhost:8124](http://localhost:8124). The container bind-mounts `custom_components/upkeep`, and its config lives in `dev/config` (gitignored). Host port 8124 is used because 8123 is often already taken by another local Home Assistant. Keep local usernames and passwords out of the repository.

1. Open `http://localhost:8124`, create the local admin user, then add the integration under **Settings → Devices & Services → Add Integration → Upkeep**.
2. While editing the card or panel, run `npm run dev:watch` and refresh the browser. Those bundles are written straight into the mounted component.
3. After Python edits, run `npm run dev:restart`. Reloading the config entry does not reimport the component.
4. `npm run dev:logs` follows container logs. `npm run dev:down` stops the container.

To log the integration, add this to `dev/config/configuration.yaml` after onboarding and restart:

```yaml
logger:
  default: warning
  logs:
    custom_components.upkeep: debug
```

## Adding Translations

User-facing copy lives in three catalogs, and every supported language must stay complete:

- Frontend (card, card editor, and sidebar panel): `src/localize/languages/`
- Home Assistant config flow and services: `custom_components/upkeep/translations/`
- Persistent notifications and other integration-only copy: `custom_components/upkeep/strings/`

Hassfest validates `translations/`. A file there may only contain official roots (`config`, `options`, `services`, and the other keys hassfest accepts). A custom object such as `notices` fails CI. Put that copy in `strings/` instead. `notice_catalog` loads the flat string map in `strings/{language}.json`.

The required languages are English (`en`), Spanish (`es`), Catalan (`ca`), French (`fr`), German (`de`), Italian (`it`), Dutch (`nl`), and European Portuguese (`pt`). `en.json` is the reference in each directory. Other files must have the same keys, no empty strings, and the same `{placeholder}` tokens.

Day and use counts use a singular and a plural string, chosen with `Intl.PluralRules`: `card.day_left_one` / `card.day_left_other`, and the matching overdue and use keys. Pass values through `localize(key, { count }, language)`.

`npm run check:i18n` checks all three catalogs, rejects unknown roots in `translations/`, and checks that every `localize()` and `_t()` call names a key in the frontend English file. CI and the pre-commit hook run that check. Words that are the same in English and another language, such as `Version` or `Filter`, are allowed.
