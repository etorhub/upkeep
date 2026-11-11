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

Add or update JSON files in `src/localize/languages/` (e.g. `en.json`, `es.json`, `ca.json`).
