---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#voce-history
proposal: null
task: 5xjjz3fm
origin: null
option: 1
note: null
resolvedBy: chbdcdy7
created: 2026-10-24T19:37:06.276Z
job: 1a64e0c6-6cc2-4d34-a782-2220c2d94f82
---
# History modal focus skips Close

## What happens

When the details of a History entry open, the focus goes to the first focusable element in the window, such as a reference chip of a Task or a link in the text. The Close button comes last, so it does not get the focus.

## What should happen

When the details of a History entry open, the focus goes to the Close button and stays inside the window while it is open.

## Fix options

### Focus Close on open

Give the entry's window an opening focus handler that moves the focus to its Close button, the same way the Board's dialogs already do. It changes only where the focus lands on opening: Escape, the click outside, the return of the focus to the entry's title and the navigation from a chip stay as they are. It costs a few lines in the History entry view and no new dependency, and it leaves the Model and the Requirements untouched.

### Move Close to the top

Place the Close button before the text and the Tasks in the shared dialog component, so that it is the first focusable element of every window. This makes the focus land on Close without any handler in the History view. It changes the layout and the focus order of every window that uses the shared component, not only the History details, so each of them must be checked. It costs more than the first option and touches windows the Requirements do not mention.

### Own Close button first

Hide the default Close button of the History details window and render a Close button as the first element of its content, focused on opening. The other windows keep their layout and their focus. It costs a second Close button path in the History view, to keep in step with the shared one for look and accessibility name, and it duplicates a part of the shared component.

## Where in the code

extension/src/webview/board/history.tsx, the entry's details window (DialogContent, around lines 117-123): it sets the focus on close but no opening focus handler, while the default Close button is rendered last.

## Prepared question

```json
{
  "question": {
    "id": "4nesri70",
    "question": "Where should the focus land when the details window of a History entry opens?",
    "context": "Clicking a History entry opens its details in a modal window: the title, the date, the full text, then the Tasks with their reference chips, and a `Close` button at the end. While the window is open the focus stays inside it, and on closing it returns to the entry's title. The code and the Requirements disagree on which element gets the focus when the window opens.",
    "options": [
      {
        "label": "Focus Close on open",
        "description": "The window moves the focus to its Close button on opening, as the Board's dialogs do.",
        "details": "A few lines in the History details window, no new dependency. Escape, the click outside, the return of the focus to the title and the chips stay as they are. Model and Requirements stay untouched."
      },
      {
        "label": "Move Close to the top",
        "description": "The shared dialog places Close before the content, so it is the first focusable element of every window.",
        "details": "No focus handler in History, but it changes the layout and focus order of every window built on the shared dialog, each of which must be checked. Touches windows the Requirements do not mention."
      },
      {
        "label": "Own Close button first",
        "description": "The History window hides the shared Close and renders its own Close first, focused on opening.",
        "details": "Other windows keep their layout. It adds a second Close path to keep in step with the shared one for look and accessible name."
      },
      {
        "label": "Focus the first element",
        "description": "On opening, the focus goes to the first focusable element in reading order: a link in the text or a Task's chip, otherwise Close, which comes last.",
        "details": "The Requirements are rewritten to say so. Keyboard users reach Close only after tabbing through the links and chips."
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
      "decision": "fix-code",
      "option": 3
    },
    {
      "decision": "proposal"
    }
  ],
  "fingerprint": "e6e7f28051f4d4a197fb285dafcf208cb79e174945b5035f75e9ed7757453853",
  "prepared": "2026-10-24T20:08:37.810Z"
}
```
