---
created: 2026-10-24T17:50:53.791Z
updated: 2026-10-24T20:56:01.512Z
summary: "Scan System in the side menu is always active, also with the Advisor Scanner on; the Diagram has no Scan button and the Trama: Scan System command and Feature scans launched by Trama are gone."
tasks:
  - 4n7k1e9e
  - 0aac3gjx
  - lzkbhbcn
  - xd39f33r
cleared:
  xd39f33r:
    title: Drop scan from panel launches
    finished: 2026-10-24T20:46:10.574Z
    refs:
      - requirements/tech#menu-laterale
  4n7k1e9e:
    title: Diagramma senza Scan
    proposal: krziusik
    tag: Scan System
    finished: 2026-10-24T17:49:08.913Z
    refs:
      - panel
      - requirements/ui#panel
  lzkbhbcn:
    title: Via comando Scan System
    proposal: krziusik
    tag: Scan System
    finished: 2026-10-24T17:48:37.437Z
    refs:
      - agent-launching
      - requirements/rules#agent-terminal
      - requirements/rules#agent-terminal/Agent running
      - requirements/rules#agent-launching
      - requirements/rules#drift-resolution
      - requirements/rules#announcement
  0aac3gjx:
    title: Scan System sempre attivo
    proposal: krziusik
    tag: Scan System
    finished: 2026-10-24T17:46:27.436Z
    refs:
      - menu-laterale
      - task
      - requirements/ui#menu-laterale
      - requirements/tech#menu-laterale
      - requirements/rules#work
      - requirements/tech#panel/Settings
      - requirements/ui#panel/Settings
      - requirements/data#task
      - requirements/tech#task
---
# Scan System only from the menu

Scan System in the side menu now launches the whole-System scan with the Advisor Scanner on or off, shows the number of finished Tasks and remembers the last global scan. The Diagram toolbar no longer has a Scan button at any level, and the editor command Trama: Scan System and the Feature scan instruction are removed: the only scan Trama launches is the whole System from the menu. A Feature is scanned by the agent only when the developer asks in a conversation.
