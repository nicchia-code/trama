---
column: done
technical: true
refs:
  - requirements/ui#voce-history
drift: 4nesri70
proposal: null
agent: false
created: 2026-10-24T20:14:20.431Z
finished: 2026-10-24T20:46:14.476Z
---
# Fix code to match the Requirements: History modal focus skips Close

## What happens

When the details of a History entry open, the focus goes to the first focusable element in the window, such as a reference chip of a Task or a link in the text. The Close button comes last, so it does not get the focus.

## What should happen

When the details of a History entry open, the focus goes to the Close button and stays inside the window while it is open.

## Chosen option

**Focus Close on open**

Give the entry's window an opening focus handler that moves the focus to its Close button, the same way the Board's dialogs already do. It changes only where the focus lands on opening: Escape, the click outside, the return of the focus to the entry's title and the navigation from a chip stay as they are. It costs a few lines in the History entry view and no new dependency, and it leaves the Model and the Requirements untouched.

## Where in the code

extension/src/webview/board/history.tsx, the entry's details window (DialogContent, around lines 117-123): it sets the focus on close but no opening focus handler, while the default Close button is rendered last.
