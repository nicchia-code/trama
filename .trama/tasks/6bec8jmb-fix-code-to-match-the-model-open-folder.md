---
column: done
technical: false
refs:
  - menu-laterale/No folder
  - requirements/ui#menu-laterale
drift: j6wkuyu1
proposal: null
agent: false
created: 2026-10-24T20:14:34.387Z
finished: 2026-10-24T20:46:21.237Z
---
# Fix code to match the Model: Open Folder loses its name

## What happens

In the icon-only mode the Open Folder button shows just its icon and its text is hidden, so the button has no accessible name left for a screen reader. In the wide view it is named Open Folder.

## What should happen

In the icon-only mode the Open Folder button keeps the accessible name Open Folder, as it has in the wide view.

## Chosen option

**Give the button a name**

Give the Open Folder button an accessible name, Open Folder, as the other entries of the menu already have one. The label keeps hiding in the icon-only mode, and the button is named the same at every width. It is one attribute in one place, and nothing else in the menu changes. The name then does not depend on the width of the view.

## Where in the code

extension/src/webview/menu/app.tsx: the no-folder branch of MenuApp, the Open Folder button and its label.
