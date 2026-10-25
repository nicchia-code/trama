# Requirements: Tecnologia e vincoli, Away notifications technology

Use when building the ntfy notifications of omp Chat jobs: settings, signals from the host, sending, access token and test notification.

## away-notifications

- Settings in the manifest (`extension/package.json`), both `"type": "string"` and `scope: "application"`: `trama.ntfyServer`, `"default": "https://ntfy.sh"`, and `trama.ntfyTopic`, `"default": ""`, with the `markdownDescription` of `ui#away-notifications` and the explicit titles `ntfy Server` and `ntfy Topic` in `EXPLICIT_TITLES` (`extension/src/host/settings-schema.ts`). They are read only from `inspect(key).globalValue`, every time a notice is born, its wait ends or its retry is due, and when a test is sent; a workspace value never counts.
- Validity, a pure function of `src/core` with its `bun:test` tests, shared by the Settings tab (an invalid value is not saved and the field says why, `panel/Settings`) and by the sending: the server, trimmed, is an absolute `http:` or `https:` URL without user name, password, query or fragment, and an empty server counts as the default; the topic, trimmed, matches `^[A-Za-z0-9_-]{1,64}$`. An empty topic means notifications are off; it is not an error.
- `SETTING_GROUPS` gets the sub-group `Notifications` of `Advanced`, after `omp Chat`, with `trama.ntfyServer` and then `trama.ntfyTopic`. The wizard leaves both keys out with `NOT_IN_WIZARD` of `extension/src/webview/wizard/logic.ts`, as it does for `trama.autoExit`, so the Advanced step and its summary skip the sub-group (`tech#setup-wizard`). The test that fixes groups and titles is updated.
- `trama.ntfy` of older versions is neither declared nor read; a value left in the user settings is not rewritten.
- No new runtime library; the command line takes no part.
- `README.md`, `extension/README.md` and `CHANGELOG.md` describe the notifications: which events send them, that only the jobs of omp Chat do, the two settings, the access token, the test button and that on ntfy.sh the topic is readable by anyone who knows it. `docs/uat.md` has the steps of `quality#notice`.

## notice

- Pure logic in `src/core/away-notices.ts`, tested with `bun:test`: the birth of each kind of notice from the facts of the window, the working state of the window, the quiet, the cancellations, the composition of title, message, tags and priority (`ui#notice`) and the reason of a failure. The constants (30 s of wait and quiet, 10 s before the retry, 10 s of time limit per request) live there and are not settings.
- One notifier per window in the host (`extension/src/host/away-notices.ts`), fed by what the host already knows:
  - `extension/src/host/omp-chat/conversations.ts`, only for conversations with `hook`: the end of the work (`omp-acp.TURN_ENDED` with its `stopReason`, which `src/core/omp-chat-conversation.ts` already tells normal or abnormal), `omp-acp.EXITED` from Agent running, the opening of every conversation, and `onUpdate` of the job conversations still open, for the quiet;
  - the permission requests of those same conversations, their answer and their cancellation, once per request: from the session port (`onPermissionRequest`, `answerPermission`, `onPermissionCancelled`), never from `extension/src/host/omp-chat/view-model.ts`, which replays the waiting requests when the webview comes back;
  - the rounds: the moment `QuestionSession` presents a round (`extension/src/host/question-session.ts`, `reveal`) and its end, with `context.terminal` looked up among the job conversations of the window (a lookup that does not exist yet);
  - the job registry and the sequences of Runs (`extension/src/host/run-groups.ts`) for the working state of the window, terminals included;
  - the deactivation of the extension, which clears every timer.
- Sending: the global `fetch` of the extension host, `POST` to the server URL with `Content-Type: application/json` and the JSON body `{ topic, title, message, tags, priority }` of ntfy's JSON publishing, so every text stays UTF-8; `Authorization: Bearer <token>` only with a token saved; `redirect: "manual"`, so a redirect is a failure; `AbortSignal.timeout(10_000)`. Only an HTTP 2xx answer is a success; every other status, a redirect, a network error or the time limit is a failure. No ntfy action, click, attachment or Markdown.
- Timers only while a notice waits or waits to retry; no polling.

## developer.SET_NTFY_TOKEN

- Storage: `ExtensionContext.secrets` with the only key `trama.ntfyToken`, owned by a host module `extension/src/host/ntfy-token.ts` built like `extension/src/host/cursor-api-key.ts`: it reads the token at activation, keeps it in memory, updates it after its own `store` and `delete` and at every `secrets.onDidChange` for that key that does not follow a write of the same window, which is `editor.NTFY_TOKEN_CHANGED`. Errors of `get`, `store` and `delete` become the messages of `rules#developer.SET_NTFY_TOKEN` with `vscode.window.showErrorMessage`.
- Webview → host: `setNtfyToken` and `removeNtfyToken`, with no field, validated by `parseToHost` (`extension/src/host/messages.ts`). Host → webview: `ntfyToken { saved: boolean }`, at the `ready` of the webview, when the Settings view becomes visible and after every change the module reads. The token is never in a message.
- Set: `vscode.window.showInputBox({ title, prompt, password: true, ignoreFocusOut: true, validateInput })` with the texts of `ui#developer.SET_NTFY_TOKEN`; `validateInput` refuses an empty text after `trim()`; `undefined` (Esc) does nothing; then `secrets.store("trama.ntfyToken", text.trim())` and `ntfyToken`. Remove: `secrets.delete("trama.ntfyToken")` and `ntfyToken`.

## developer.SEND_TEST_NOTIFICATION

- Webview → host: `sendTestNotification`, with no field, validated by `parseToHost`; refused while a test runs in the window. Host → webview: `testNotification { state: "sending" | "sent" | "failed", reason?: string }`.
- The host uses the same sending function as the notices, with one attempt; the title uses the name of the folder of the window's project, or `Trama` without a project.
