---
refs:
  - omp-chat-conversation
  - requirements/rules#omp-chat-conversation
  - requirements/ui#omp-chat-conversation
  - requirements/quality#omp-chat-conversation
  - requirements/tech#omp-chat
  - requirements/tech#omp-chat-conversation/Agent running
---
# yolo default with notice

When this Task is done, omp Chat's approval is yolo by default, and a developer who never chose an approval is told once.

## Default and reading
- `extension/package.json`: `trama.ompChatApproval` keeps `type: "string"`, `enum: ["ask", "yolo"]`, `scope: "application"`, but its `"default"` becomes `"yolo"` (today `"ask"`). Its description says that `yolo` is the default: omp runs every command without asking, even those it would ask about in the terminal, and that `ask` makes omp ask permission as in the terminal, each request shown in the conversation.
- The value is read only from `inspect("trama.ompChatApproval").globalValue` (user settings; a workspace value never counts): `ask` means ask, every other value, absence included, means `yolo`. Today `conversationLaunch` in `extension/src/host/agent.ts` (~line 119) reads `globalValue === "yolo" ? "yolo" : "ask"`; it must become `globalValue === "ask" ? "ask" : "yolo"`. An explicit user value saved earlier is kept as is: a saved `yolo` stays yolo, a saved `ask` stays ask. No migration and no rewriting of settings.
- With `ask` the process starts without any approval option (omp asks as in the terminal and requests reach the conversation); with yolo it starts with omp's yolo approval (`--yolo`) and no permission request reaches the conversation. Read when each conversation opens — job, Ask more and General (General at each of its starts, also after a clean-up); a conversation resumed after a reload keeps the value it started with.
- Update the comments that describe the old default: the doc comment of `conversationLaunch` (agent.ts ~116), the comment at `extension/src/host/terminal-agent.ts:47` («`ask` … the default»), and the first-line comment of `extension/src/host/omp-chat/client.ts` (`--yolo` unless `trama.ompChatApproval` is `ask`).

## One-time yolo notice
- Who: only a developer whose `trama.ompChatApproval` has no user value (`inspect(...).globalValue` is `undefined`). A user value, `ask` or `yolo`, means the developer chose: never a notice.
- When: when a new conversation process is about to start — a job conversation, Ask more, or General (each start of General counts as a start) — never for a resumed conversation (the resume paths such as General's `resumeLaunch` and the reopening after a reload never show it). New starts all go through `conversationLaunch` in agent.ts (job launch ~line 701, Ask more ~757, General's `launch` ~213), which is a natural single place; `resumeLaunch` must not trigger it.
- Memory: the host keeps in `ExtensionContext.globalState` (shared by every window and project of the editor) the key `trama.yoloNoticeShown`. The notice is shown only when that key is not `true`; the host writes the key to `true` first and then shows the message, so it appears at most once per developer, never again in any window or project.
- Message: `vscode.window.showInformationMessage` (non-modal), text exactly `Trama: omp Chat now runs commands without asking (yolo). Change it in Settings.`, one button `Open Settings`. The text is English and does not follow `trama.language`. `Open Settings` does what the same button of the omp-missing notice does (`OPEN_SETTINGS_BUTTON` in `extension/src/host/omp-launch.ts`, which runs `trama.openSettings`): it opens the Trama panel on the Settings tab, also when the panel was closed. Closing the message does nothing else.
- Not blocking: the host does not wait for the answer; the start of the conversation does not wait for the message. The notice changes nothing: the conversation starts in yolo as it would without it.

## Docs
- README (line ~62, the **Approval** bullet): `yolo` is the default and omp runs every command without asking, a risk to accept; it says how to switch to `ask` (set `trama.ompChatApproval` to `ask` in user settings) and mentions the one-time notice. It still says the setting concerns omp Chat conversations only, not the omp terminal.
- CHANGELOG: an entry saying the omp Chat approval default is now `yolo`, an explicit saved value is kept, and the one-time notice.
- `docs/uat.md`: README, CHANGELOG and uat say omp Chat is on by default with the yolo approval and how to switch to `ask`. Fix rows that assume `ask` is the default: Z14 («permissive approval» → yolo), Z16 (set `trama.ompChatApproval` to `ask` explicitly instead of «(the default)»), Z17 (yolo now also with the setting absent); add a row for the notice: with the setting absent and the key never written, the first new conversation shows the message once with `Open Settings` opening Settings; a second conversation, another window, a resumed conversation, or a saved `ask`/`yolo` shows nothing.

## Tests
- The approval read: absent → yolo (`--yolo`), `"yolo"` → yolo, `"ask"` → no approval option, any other value → yolo.
- The notice: shown once with the setting absent (and the key written to `true` before the message); never with `ask` or `yolo` saved; never again after the key is written; never for a resumed conversation; the conversation start does not wait for the message.
