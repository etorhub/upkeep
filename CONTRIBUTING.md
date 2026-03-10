# Contributing

Contributions are welcome. Please:

1. **Fork** the repository.
2. **Create a branch** (`git checkout -b feature/your-feature`).
3. **Make changes** and ensure:
   - `npm run lint` passes
   - `npm run typecheck` passes
   - `npm run test` passes
   - `npm run format:check` passes
4. **Commit** with conventional format (`npm run commit` or `git commit -m "feat: add feature X"`).
5. **Push** to your fork (`git push origin feature/your-feature`).
6. Open a **Pull Request** against `main`.

## Code Style

- TypeScript strict mode
- ESLint + Prettier (run `npm run format` before committing)
- Prefer Lit decorators and reactive patterns

## Adding Translations

Add or update JSON files in `src/localize/languages/` (e.g. `en.json`, `es.json`, `ca.json`).
