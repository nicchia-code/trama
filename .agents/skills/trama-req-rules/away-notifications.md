# Requirements: Regole di business, Away notification rules

Use when implementing when Trama's ntfy notifications are born, wait, are cancelled and are sent, the test notification and the ntfy access token.

## notice

- A notice is born only when `trama.ntfyTopic`, trimmed, is not empty at that moment (`tech#away-notifications`), and only for a job conversation of omp Chat of this window: a conversation with Trama's hook (design, scan, Run, Resolve Drifts, Unify Drifts, import, refinement). Ask more, General, a terminal (also the terminal a conversation falls back to when it does not start), the prepared question of the Async Drift Resolver and the conversations of other windows never give a notice. A topic set after a round opened, a request arrived or the window stopped working gives no notice about them.
- Working window: the window works while it has at least one job in progress, in a job conversation in Agent running or in a terminal in Agent running, or a Run of a sequence still to start (`rules#agent-launching`). Ask more and General never count.
- Finished notice: born when the window goes from working to not working because the work of a job conversation ended with `omp-acp.TURN_ENDED` for the reason `end_turn`. It is not born when that end is `cancelled` (the developer pressed Stop), when it is abnormal (the stopped notice is born instead), when the last job to end ran in a terminal, or when the developer closed the last conversation himself. A window holds at most one finished notice that waits or retries; while it does, no other is born.
- Quiet of a finished notice: thirty seconds with no `session/update` from any job conversation of the window still open and no message of the developer in one of them; each of them starts the thirty seconds again. When no job conversation of the window is left open (all closed, for example by `trama.autoExit`), there is no wait and the notice goes at once.
- A finished notice is cancelled when any conversation of omp Chat opens in the window (`omp-chat-conversation.OPENED`): a job makes the window work again, Ask more means the developer is there. When its wait ends and the window works again for any other reason (for example a job started in a terminal), it is not sent.
- Question notice: born when a round whose `TRAMA_TERMINAL` is the identity of a job conversation of this window enters Asking (`question-round.ROUND_OPENED`); a round in the queue has no notice until it is presented. One per round, whatever its number of questions. Its thirty seconds start then and do not start again with an answer, a skip or a step back; it is cancelled when that round closes (`question-round.ROUND_CLOSED`).
- Permission notice: born for each `session/request_permission` of a job conversation that waits for the developer, which happens only with `trama.ompChatApproval` on `ask`; with `yolo` the host answers alone and nothing is born. Its thirty seconds start with the request; it is cancelled when the developer chooses an option or when the request is answered `cancelled` (Stop, closing of the conversation, end of the process, end of the turn).
- Stopped notice: born, with no wait, when the work of a job conversation in Agent running ends abnormally (`refusal`, `max_tokens`, `max_turn_requests` or a prompt omp refused, `tech#omp-acp`) and at `omp-acp.EXITED` from Agent running, also while other jobs of the window work. Not born for `omp-acp.EXITED` from Agent idle, for `omp-acp.SESSION_NOT_RESUMED` nor for a conversation that does not start.
- Reload: `omp-acp.SESSION_RESUMED` and a conversation that comes back in Agent idle give no notice. A job continued after the reload is a job in progress like any other, and its end counts.
- When the window closes or reloads, every notice of the window that waits or waits to retry is cancelled; nothing is saved and nothing is born again at the reopening.
- The text is composed when the notice goes, not when it is born (`ui#notice`); the retry sends the same text without composing it again. The jobs counted by a finished notice are the job conversations whose work ended since the window last started working.
- Sending: one request per attempt (`tech#notice`). A failure waits ten seconds and tries once more, only if the topic is still set and the server and the topic are still valid; a second failure gives the notice up. A server or topic that is not valid when the wait ends sends nothing. Neither case shows anything to the developer, and nothing is logged with the server, the topic or the token.
- A notice, delivered or not, changes nothing in rounds, conversations, jobs, Tasks, Proposals, Drifts or the Board.

## developer.SET_NTFY_TOKEN

- The token is one per user, in the editor's keychain, shared by every window; never in the settings, in a file of the project, in a message to the webview or in a log.
- The masked box refuses an empty text or one made only of spaces and stays open; the token is saved trimmed. A failure of the keychain shows `Trama: could not save the ntfy access token: <reason>.` and nothing changes; a failed removal shows `Trama: could not remove the ntfy access token: <reason>.`.
- A token saved or removed in another window updates the Settings tab of this window (`editor.NTFY_TOKEN_CHANGED`); the next notification of every window uses the token of that moment.

## developer.SEND_TEST_NOTIFICATION

- Available only when the server and the topic of now are valid and no test is being sent in this window. It does not need omp Chat, a job or a project, and it is never a notice: it is not cancelled, not retried and does not count for anything else.
- One request with the same form and time limit as a notice (`tech#notice`), with the token saved, if any. It succeeds only with an HTTP 2xx answer; otherwise the reason is one of `HTTP <status>`, `no response within 10 seconds`, `the server redirected the request` or the message of the network error.
