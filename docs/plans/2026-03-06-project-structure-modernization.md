# Project Structure Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reorganize the repository into a modern `src/` and `build/` layout without changing application behavior.

**Architecture:** Move renderer, main-process, shared, and asset files into a unified source tree; update all build tooling to emit into a single `build/` tree; keep runtime data and generated outputs excluded from source control.

**Tech Stack:** Electron, React, TypeScript, Vite, electron-builder, Node.js scripts

---

### Task 1: Create target directory structure

**Files:**
- Create: `docs/plans/2026-03-06-project-structure-modernization-design.md`
- Create: `docs/plans/2026-03-06-project-structure-modernization.md`
- Create: `src/main/`
- Create: `src/renderer/`
- Create: `src/shared/`
- Create: `src/assets/`

**Step 1:** Create the new source-tree directories.
**Step 2:** Keep root config files in place.
**Step 3:** Confirm no runtime-data directory is moved into source control.

### Task 2: Move renderer source files into `src/renderer`

**Files:**
- Modify: `App.tsx`
- Modify: `index.tsx`
- Modify: `index.css`
- Modify: `components/**`
- Modify: `constants/**`
- Modify: `services/**`
- Modify: `index.html`

**Step 1:** Move renderer entry files and feature folders into `src/renderer/`.
**Step 2:** Rewrite relative imports only where required by moved depth.
**Step 3:** Keep behavior identical.

### Task 3: Move Electron source into `src/main`

**Files:**
- Modify: `electron-main/main.js`
- Modify: `electron-main/preload.js`
- Modify: `electron-main/tsconfig.json`
- Modify: `scripts/copy-electron-files.js`

**Step 1:** Move Electron source files into `src/main/`.
**Step 2:** Update TypeScript and copy/build scripts.
**Step 3:** Preserve runtime entry semantics.

### Task 4: Move shared files and assets

**Files:**
- Modify: `types.ts`
- Modify: `constants.tsx`
- Modify: `assets/**`
- Modify: `package.json`
- Modify: `vite.config.ts`

**Step 1:** Move shared types/constants into `src/shared/` where practical.
**Step 2:** Move source-controlled icons into `src/assets/`.
**Step 3:** Update references from config and code.

### Task 5: Centralize build outputs under `build`

**Files:**
- Modify: `package.json`
- Modify: `electron-builder.yml`
- Modify: `vite.config.ts`
- Modify: `.gitignore`

**Step 1:** Set Vite output to `build/renderer`.
**Step 2:** Set Electron compile output to `build/main`.
**Step 3:** Set packaged release output to `build/release`.
**Step 4:** Ignore all generated artifacts.

### Task 6: Update docs to match reality

**Files:**
- Modify: `README.md`
- Modify: `PROJECT_DOCUMENTATION.md`
- Modify: `USER_GUIDE.md`

**Step 1:** Update structure examples and path references.
**Step 2:** Remove outdated `dist/` and `dist-electron/` wording where incorrect.

### Task 7: Verify the reorganization

**Files:**
- Verify only

**Step 1:** Run TypeScript compile check.
**Step 2:** Run renderer build.
**Step 3:** Run Electron build.
**Step 4:** Inspect git diff for accidental behavior changes.
