# Project Structure Modernization Design

**Date:** 2026-03-06
**Project:** AI Novel
**Status:** Approved

## Goal

Modernize the repository layout without changing application behavior. Source code should live under a single `src/` tree, build outputs should live under a single `build/` tree, and root-level clutter should be reduced to configuration, scripts, and documentation.

## Current Problems

- Renderer source files are spread across the repository root.
- Electron main-process source lives outside the main source tree.
- Build outputs are split across `dist/` and `dist-electron/`.
- Runtime data and logs are mixed with source files.
- The README already describes a `src/`-based layout that the repository does not actually follow.

## Chosen Approach

Adopt a modern Electron + Vite structure:

- `src/renderer/` for React renderer code
- `src/main/` for Electron main and preload code
- `src/shared/` for shared types and cross-process constants
- `src/assets/` for source-controlled app assets used by the app
- `build/renderer/` for Vite output
- `build/main/` for compiled Electron output
- `build/release/` for packaged application artifacts

## Scope

### In Scope

- Move existing source files into `src/`
- Update imports and config paths
- Update Vite, TypeScript, Electron, and packaging configuration
- Centralize build outputs under `build/`
- Clean `.gitignore` for generated artifacts and runtime data
- Update docs that describe the project layout

### Out of Scope

- Business-logic refactors
- UI behavior changes
- Data model redesign
- New features or architectural rewrites beyond path/layout normalization

## Target Layout

```text
src/
  main/
    main.js
    preload.js
    tsconfig.json
  renderer/
    App.tsx
    index.tsx
    index.css
    components/
    constants/
    services/
  shared/
    types.ts
    constants.tsx
  assets/
    icon.icns
    icon.ico
    icon.png
build/
  renderer/
  main/
  release/
scripts/
docs/
```

## Migration Rules

- Preserve filenames when possible to minimize risk.
- Keep import semantics stable; only rewrite paths required by moves.
- Keep configuration files at the repository root.
- Prefer minimal compatibility shims over logic changes.
- Treat runtime data (`chroma_data/`, logs, sqlite files) as non-source artifacts.

## Validation Strategy

- Run TypeScript compile checks after path updates.
- Run Vite build to verify renderer output paths.
- Run Electron main build to verify main/preload output paths.
- Only claim completion after command output confirms success.

## Risks and Mitigations

- **Path breakage:** update config and imports systematically, then build-check.
- **Electron packaging mismatch:** align `package.json` and `electron-builder.yml` output paths.
- **Hidden runtime assumptions:** preserve filenames and runtime entry semantics where possible.
