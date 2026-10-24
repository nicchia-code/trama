---
created: 2026-10-24T11:23:03.235Z
updated: 2026-10-24T11:23:03.235Z
summary: The side menu shows no hover tooltips; below 56 px it becomes icon-only, and a disabled Scan System explains itself in a line under the button.
tasks:
  - dimk77i0
cleared:
  dimk77i0:
    title: Menu laterale senza tooltip
    proposal: srkyrbvl
    tag: Chat & panel polish
    finished: 2026-10-24T10:33:23.021Z
    refs:
      - menu-laterale
      - requirements/ui#menu-laterale
      - requirements/tech#menu-laterale
---
# Side menu without tooltips

The side menu shows no hover tooltips on its items, on Scan System or on Open Folder; each item is recognised by its text and icon. The editor's tooltip on the activity-bar icon stays. When the Advisor Scanner disables Scan System, a short line under the button says that the Advisor Scanner checks the code during Runs; in wide mode it is linked as the button's description. Icon-only mode starts below 56 px instead of 200 px and is pure CSS. Implemented by Task dimk77i0 with its menu tests.
