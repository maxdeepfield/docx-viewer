# Absolute DOCX Freakout

![Electron](https://img.shields.io/badge/Electron-32.x-47848F.svg)
![Platform](https://img.shields.io/badge/Platforms-macOS%20%7C%20Windows%20%7C%20Linux-2ea44f.svg)
![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Status](https://img.shields.io/badge/Drag%20%26%20Drop-Enabled-brightgreen.svg)

No-nonsense `.docx` viewer built with Electron and Mammoth.js. Open or drag files in, zoom with shortcuts, and get out of your way.

## Features

- Drag & drop `.docx` straight into the window.
- File > Open dialog with Mammoth.js conversion to HTML.
- Zoom controls (View menu, Cmd/Ctrl + mouse wheel, Cmd/Ctrl + `+`/`-`/`0`).
- Cross-platform packaging via `electron-builder`.
- About dialog with quick links to the site and GitHub.

## Quick start

```bash
npm install
npm start
```

### Development tips

- Use the File menu to open documents, or drop them anywhere in the window.
- Help > About links open in your default browser.
- View > Zoom controls the renderer zoom factor.

## Build

```bash
npm run build
```

Artifacts land in `dist/` per the electron-builder targets.

## Troubleshooting

- Drag & drop must use `.docx` files; other extensions are ignored.
- If nothing renders, check the DevTools console (View > Toggle Fullscreen is still available; DevTools are intentionally hidden in the menu).
- Zoom limits: min 0.25x, max 3x.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow, coding standards, and release steps.

## Architecture

High-level design and process flow live in [ARCHITECTURE.md](ARCHITECTURE.md).

## Specification

Functional and UX requirements are captured in [SPEC.md](SPEC.md).

## License

MIT — see [LICENSE](LICENSE) for details.
