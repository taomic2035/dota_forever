# Repo Cleanup and Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Organize the project documentation, remove local garbage files, verify the repo, then commit and push the current UX branch.

**Architecture:** Keep source paths stable and avoid broad renames that would break existing documentation links. Add documentation indexes that classify UX design docs, summaries, screenshots, plans, and source ownership. Clean only generated local artifacts that are ignored or reproducible.

**Tech Stack:** TypeScript, Vite, Vitest, Markdown, Git.

---

## File Structure

- Create `docs/README.md`: top-level documentation entry point.
- Create `docs/ux/README.md`: categorized UX design and summary index.
- Create `docs/screenshots/README.md`: categorized screenshot gallery index.
- Create `docs/source-map.md`: source ownership and module map.
- Modify `README.md`: link to the documentation index and current UX workstream.
- Clean root Vite logs, `.codex-vite.log`, `dist/`, and `tmp/` if they are untracked or ignored local artifacts.

## Task 1: Repository Audit

- [x] Run `git status -sb`.
- [x] Run `git remote -v`.
- [x] List tracked files and root local artifacts.
- [x] Identify low-risk cleanup targets.

## Task 2: Documentation Indexes

- [x] Create `docs/README.md` with links to UX docs, screenshots, plans, and source map.
- [x] Create `docs/ux/README.md` grouping current UX work by world readability, command feedback, targeting, cast controls, camera controls, and source references.
- [x] Create `docs/screenshots/README.md` grouping screenshots by gameplay HUD, targeting/cursor, cast controls, camera controls, and art/reference captures.
- [x] Create `docs/source-map.md` explaining source folder ownership and where to work for UI/control changes.
- [x] Update `README.md` with concise documentation links.

## Task 3: Local Garbage Cleanup

- [x] Remove generated Vite log files from the repository root.
- [x] Remove generated `dist/`.
- [x] Remove generated `tmp/`.
- [x] Confirm cleanup does not remove tracked files.

## Task 4: Verification, Commit, Push

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `git status -sb` and inspect staged scope.
- [ ] Commit as `chore: organize docs and clean workspace`.
- [ ] Push `codex/ux-core-readability` to `origin`.

## Self-Review

- [x] Source code paths remain stable.
- [x] Documentation indexes point to existing files.
- [x] Cleanup targets are local/generated artifacts only.
- [ ] Final worktree is clean after commit and push.
