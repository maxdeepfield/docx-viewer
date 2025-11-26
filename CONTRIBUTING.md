# Contributing to Absolute DOCX Freakout

Thanks for helping improve the app! This guide keeps contributions smooth and consistent.

## Workflow
1. Fork and create a feature branch.
2. Install deps: `npm install`.
3. Develop with `npm start` (Electron in dev mode).
4. Add/adjust tests if applicable.
5. Format/clean as needed; keep changes focused.
6. Open a PR describing the change, testing done, and any caveats.

## Code Style & Practices
- JavaScript (Node/Electron) with context isolation enabled.
- Prefer async/await; handle errors with user-friendly messages.
- Keep IPC surfaces minimal and typed by convention (clear channel names).
- UI changes should degrade gracefully across macOS/Windows/Linux.
- Avoid introducing non-ASCII unless required.

## Commits & PRs
- Write clear commit messages; smaller commits are easier to review.
- Reference related issues when possible.
- Include screenshots/GIFs for UI changes.

## Testing
- Run the app locally (`npm start`) and validate:
  - File > Open works.
  - Drag-and-drop renders `.docx`.
  - Zoom controls (menu + Ctrl/Cmd + wheel) behave.
  - About dialog links open in the system browser.

## Security
- Do not enable `nodeIntegration` in renderer.
- Keep preload exports narrow.
- Never load remote content.

## Release Checklist (maintainers)
- Update version in `package.json` if needed.
- `npm run build` for packaging.
- Smoke test on target platforms.
- Tag and publish artifacts.
