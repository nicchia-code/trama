---
status: resolved
resolution: fix-code
refs:
  - menu-laterale/No folder
  - requirements/ui#menu-laterale
proposal: null
task: 6bec8jmb
origin: null
option: 1
note: null
resolvedBy: i95wscqs
created: 2026-10-24T19:38:50.880Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# Open Folder loses its name

## What happens

In the icon-only mode the Open Folder button shows just its icon and its text is hidden, so the button has no accessible name left for a screen reader. In the wide view it is named Open Folder.

## What should happen

In the icon-only mode the Open Folder button keeps the accessible name Open Folder, as it has in the wide view.

## Fix options

### Give the button a name

Give the Open Folder button an accessible name, Open Folder, as the other entries of the menu already have one. The label keeps hiding in the icon-only mode, and the button is named the same at every width. It is one attribute in one place, and nothing else in the menu changes. The name then does not depend on the width of the view.

### Keep the label for readers

In the icon-only mode, hide the label of the Open Folder button with a screen-reader-only style instead of removing it from the page. The text then stays in the accessibility tree while it is not drawn, and the button needs no extra attribute. It changes the label's style in one place, and the label stays in the page at narrow widths, which the other entries do not do.

## Where in the code

extension/src/webview/menu/app.tsx: the no-folder branch of MenuApp, the Open Folder button and its label.

## Prepared question

```json
{
  "question": {
    "id": "j6wkuyu1",
    "question": "What accessible name should the Open Folder button have in the side menu's icon-only mode?",
    "context": "With no folder open, the Trama side menu shows the `Open Folder` button. When the view is narrower than 56 px the menu switches to the icon-only mode: every button shows only its icon and hides its text, and no button has a tooltip. The other entries keep the accessible name of the wide view; the code and the Requirements disagree on whether `Open Folder` keeps one too.",
    "options": [
      {
        "label": "Give the button a name",
        "description": "The Open Folder button gets the accessible name Open Folder as an attribute, like the other menu entries.",
        "details": "One attribute in one place. The label keeps hiding in the icon-only mode and the name no longer depends on the width of the view. Model and Requirements stay untouched."
      },
      {
        "label": "Keep the label for readers",
        "description": "In the icon-only mode the label is hidden with a screen-reader-only style instead of being removed.",
        "details": "No extra attribute; the text stays in the accessibility tree while not drawn. Only this button keeps its label in the page at narrow widths, unlike the other entries."
      },
      {
        "label": "No name in icon-only mode",
        "description": "In the icon-only mode the Open Folder button shows only its icon and has no accessible name; in the wide view it is named Open Folder.",
        "details": "The Requirements are rewritten to make Open Folder the one exception to the rule that accessible names stay those of the wide view. A screen reader announces an unnamed button."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "fix-code",
      "option": 1
    },
    {
      "decision": "fix-code",
      "option": 2
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "fcc0880a07efca6005c855f5f39b1ab9d5dc7e59488e65e6e368ce7313d15601",
  "prepared": "2026-10-24T20:08:38.073Z"
}
```
