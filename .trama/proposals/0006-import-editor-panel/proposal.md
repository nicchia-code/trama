---
status: approved
kind: import
requires:
  - "0001"
base:
  editor-panel/feature.md: new
  editor-panel/panel.md: new
  editor-panel/diagram.md: new
delete: []
---
# Import: Editor panel

Describes the editor panel's navigation as it is in the code (extension/src/host/controller.ts, extension/src/webview/main.ts, board/, requirements/, diagram/levels.ts, elements.ts, index.ts): tabs and the zoom levels of the Diagram. Reacts to the developer and workspace Actors only, so it builds on the first Proposal alone.

## Doubts

- Documentation versus code: `docs/uat.md:75` expects four Trama commands in the palette (Open, Initialize Project, Design with Agent…, Scan System) but `extension/package.json:22-52` declares six (adds Import from Code and Update Agent Skills). `docs/uat.md:77` expects two tabs, Diagram and Board, but the panel has three, with Requirements (`extension/src/webview/main.ts:21-23`). The Model follows the code.
- Behaviour determined by absence: no panel serializer is registered (nothing in `extension/src` calls `registerWebviewPanelSerializer`), so after a window reload the panel is not restored (`docs/uat.md` A5 leaves this open); Closed is the state after a reload.
- The panel, the tabs and the Diagram levels were read from the code and the UAT script only; the extension was not run in an editor, so the details of what each level draws were not confirmed visually.
- Not modelled on purpose: zoom, pan and fit, expanding a State in place, selecting an element, the Proposal selector and the keyboard shortcuts of the Diagram change nothing that the Diagram's level or the panel's tab depend on. The Board's dimming of a card while a move is pending (cleared after 5 seconds, `extension/src/webview/board/index.ts`) is also left out.
- `extension/src/host/controller.ts:93-97` creates the panel with `retainContextWhenHidden: true`, so a hidden panel keeps the drawing in memory; the cost on a large Model was not measured.
