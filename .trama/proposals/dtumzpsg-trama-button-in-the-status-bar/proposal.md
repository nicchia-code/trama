---
status: approved
base:
  requirements/ui/panel.md: b155c2fc0afad2527d64253dc4a15f5ec02838c085bfe957a7bc94a1331864c4
  requirements/tech/project-panel.md: 301298ae3b0d94adcb0d510c42b46f9ebc144fcf12139337e2939d1d10c8e883
  actors/developer.md: e4dc2224e308440b60e1cae85696d67138ce1d6160fd7554c53b5f585e2cd6f6
delete: []
created: 2026-10-14T06:18:00.491Z
scanScope:
  - ref: developer.OPEN_PANEL
    reason: changed
  - ref: question-round/Out of sight/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Open/developer.OPEN_PANEL
    reason: leads into a change
  - ref: requirements/tech#panel
    reason: changed
  - ref: requirements/ui#panel
    reason: changed
---
# Trama button in the status bar

Open Trama is hard to find: Cursor can fold the editor title icon into the … menu. The developer wants a more visible place and chose the status bar at the bottom with the text "Trama".

Decisions from the conversation:
- Place: status bar, left side. Text "Trama" only, no icon (a status bar item takes only codicons, not the logo SVG).
- Click: the existing Open Trama command, same as the editor title icon and the palette.
- The editor title icon stays as is.

Assumptions for the developer to check (no interview, the developer settled place and text):
- Tooltip: "Open Trama", the same as the icon.
- Visibility: where the extension is active, i.e. in folders with .trama/model/system.md. No new activation event, so a folder without a project shows no button; there the icon and the command still offer to initialize.
- Order: left side, priority 100.
