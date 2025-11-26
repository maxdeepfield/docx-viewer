# Specification: Absolute DOCX Freakout

## Goals
- Provide a dead-simple `.docx` viewer for desktop users.
- Support drag-and-drop and menu-based file opening.
- Render documents as readable HTML via Mammoth.js with basic styling.
- Keep the UI minimal; prioritize speed and reliability.

## Functional Requirements
- **Open dialog**: File > Open triggers a native dialog filtered to `.docx`.
- **Drag & drop**: Dropping a `.docx` into the window loads and renders it.
- **Conversion**: Use Mammoth.js to convert `.docx` to HTML in the main process.
- **Error handling**: Render user-friendly error messages on failure.
- **Zoom**:
  - Menu items: Zoom In, Zoom Out, Reset (Cmd/Ctrl `+`, `-`, `0`).
  - Ctrl/Cmd + mouse wheel adjusts zoom.
  - Clamp zoom between 0.25x and 3x.
- **About**: Help > About dialog shows app name, version, and external links that open in the system browser.

## Non-Functional Requirements
- **Security**: Context isolation on; preload exposes only needed IPC.
- **Performance**: Load/render typical `.docx` under 2 seconds on modest hardware.
- **Portability**: Works on macOS, Windows, Linux; packaged via electron-builder.
- **UX**: Minimal chrome, readable defaults, responsive drag/drop feedback.

## User Flows
1. **Open via menu**
   - User selects File > Open → chooses `.docx` → main converts via Mammoth → renderer injects HTML.
2. **Drag & drop**
   - User drops `.docx` anywhere on the window → renderer validates extension → IPC to main → conversion → render HTML.
3. **Zoom**
   - User selects View > Zoom In/Out/Reset or uses Cmd/Ctrl + mouse wheel → renderer invokes IPC to adjust zoom factor.
4. **About**
   - User selects Help > About → dialog shows version and buttons to open Website/GitHub in default browser.

## Open Questions / Future Enhancements
- Dark theme toggle.
- Recently opened files.
- Custom CSS for Mammoth output (user-selectable themes).
- Print / export to PDF.
- Multi-file tabs.
