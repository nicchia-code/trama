---
column: done
technical: true
refs:
  - requirements/ui#question-round
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:35:05.727Z
---
# Overlay names the asking terminal

The header of the question overlay (`extension/src/webview/questions/index.tsx`) shows `Questions from the agent`, `·` and the name of the terminal or omp Chat conversation that asked the round, the same name as its tab (for example `Design`, a Task's tab name, `General`), followed by `Question <n> of <total>` or `Summary`. The bare agent name (`omp`, from `roundAgent` in `extension/src/host/question-session.ts`) is no longer shown. A round of a prepared question, asked by Trama itself, has no name in the header.

The host passes the name of the round's terminal or conversation with the round state. Everything else in the overlay (Minimize and Close icon buttons with tooltips and accessible names, index, options, free answer, summary, minimized bar, Reopen notification) stays as it is.
