# AI Novel

A local-first Electron + React + TypeScript desktop app for AI-assisted novel writing.

## Stack

- Electron 39
- React 19
- TypeScript
- Vite 6
- Tailwind CSS 4
- electron-builder

## Structure

```text
src/
  main/                 # Electron main/preload source
    main.js
    preload.js
    tsconfig.json
  renderer/             # Renderer source
    App.tsx
    index.tsx
    index.html
    index.css
    components/
    constants/
    services/
    types.ts            # Compatibility re-export to shared types
    constants.tsx       # Compatibility re-export to shared constants
  shared/               # Shared types/constants
    types.ts
    constants.tsx
  assets/               # Source-controlled icons/assets
build/
  renderer/             # Vite output
  main/                 # Electron main/preload build output
  release/              # electron-builder packaging output
scripts/                # Build/helper scripts
docs/                   # Plans and project docs
```

## Commands

- `npm run dev` — start the Vite renderer dev server
- `npm run build` — build the renderer into `build/renderer`
- `npm run build:electron` — compile Electron main/preload into `build/main`
- `npm run electron:dev` — compile main first, then start Vite + Electron
- `npm run electron:build` — build renderer and Electron main outputs
- `npm run electron:build-win` — package Windows release into `build/release`
- `npm run electron:build-mac` — package macOS release into `build/release`
- `npm run electron:build-linux` — package Linux release into `build/release`

## Key Paths

- Electron main entry: `src/main/main.js`
- Electron preload: `src/main/preload.js`
- Renderer entry: `src/renderer/index.tsx`
- Renderer HTML: `src/renderer/index.html`
- Shared types: `src/shared/types.ts`
- Shared prompt constants: `src/shared/constants.tsx`

## Build Outputs

- Renderer output: `build/renderer`
- Electron output: `build/main`
- Packaged app output: `build/release`

## Notes

- Runtime data such as `chroma_data/` and `*.sqlite3` is not source code and is ignored.
- Root-level files are intentionally limited to config, docs, scripts, and package metadata.
