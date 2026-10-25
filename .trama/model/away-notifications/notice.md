# Notice

A notification to the developer away from the computer, about one moment in which Trama needs him. There are four kinds: the window has finished its work, a job asks a question round, a job asks a permission, the agent of a job stopped abnormally. A notice is neither a Task nor a Drift nor a Proposal: it is not decided, not moved and never shown on the Board.

A notice is born in Waiting, in the window that launched the job, only if the developer has set an ntfy topic at that moment, and only for the job conversations of omp Chat of that window (never for Ask more, General or a terminal):

- Finished: when the window stops working, that is when a job of omp Chat ends its work and the window has no other job in progress, in a conversation or in a terminal, and no Run of a sequence still to start. A window that stops working because the developer pressed Stop gives no notice, nor does one whose last job stopped abnormally, which already has its own. While a finished notice waits, the window can hold no other one.
- Question: when a question round asked by the agent of a job conversation becomes the one presented in the window (`question-round.ROUND_OPENED`); one per round, whatever its number of questions.
- Permission: when omp asks a permission in a job conversation (`omp-acp.PERMISSION_REQUESTED`); one per request.
- Stopped: when the agent of a job conversation stops abnormally, that is when its turn ends because the model refused, reached its token or request limit, or omp refused the prompt, or when its process ends before the turn does; also while other jobs of the window keep working.

The wait before sending is thirty seconds of quiet for a finished notice, thirty seconds for a question or permission notice, and none for a stopped notice or for a finished notice whose window has no job conversation left open, because their conversations closed with Auto Exit. What the notice says is composed when it goes, from what is true then, and the retry sends the same text.

## States

### Waiting (initial)
The notice waits for its moment; the developer can still come back by himself.
- `time.NOTICE_DELAY_ELAPSED` → Sending: the topic is still set, the server and the topic are valid and, for a finished notice, the window is still not working. Trama composes the notification and sends it to the server.
- `time.NOTICE_DELAY_ELAPSED` → Not sent: the topic was removed, the server or the topic is not valid, or, for a finished notice, the window is working again. No network request; nothing is shown.
- `question-round.ROUND_CLOSED` → Cancelled: only for the question notice of that round: the developer answered or skipped it, or the round was abandoned or interrupted.
- `developer.ANSWER_PERMISSION` → Cancelled: only for the permission notice of that request.
- `omp-acp.TURN_ENDED` → Cancelled: only for a permission notice of that conversation, whose request the end of the turn cancels.
- `omp-acp.EXITED` → Cancelled: only for a permission notice of that conversation, whose request ended with the process.
- `developer.STOP_CHAT_AGENT` → Cancelled: only for a permission notice of that conversation, whose request Stop cancels.
- `developer.CLOSE_CHAT_CONVERSATION` → Cancelled: only for a permission notice of that conversation, whose request the closing cancels.
- `omp-chat-conversation.OPENED` → Cancelled: only for a finished notice: a conversation opened in the window, either a job, which makes the window work again, or Ask more, which means the developer is there.
- `editor.WINDOW_CLOSED` → Cancelled: every waiting notice of the window; nothing is sent when the window closes or reloads.

### Sending
The notification is on its way to the ntfy server; true for both attempts.
- `ntfy.DELIVERY_SUCCEEDED` → Delivered

#### First attempt (initial)
The first request.
- `ntfy.DELIVERY_FAILED` → Retrying

#### Second attempt
The only retry, with the same text.
- `ntfy.DELIVERY_FAILED` → Failed: the notification is given up; nothing is shown to the developer.

### Retrying
The first attempt failed; the notice waits ten seconds before trying again.
- `time.RETRY_DELAY_ELAPSED` → Second attempt: the topic is still set and the server and the topic are still valid.
- `time.RETRY_DELAY_ELAPSED` → Not sent: the topic was removed, or the server or the topic is no longer valid.
- `editor.WINDOW_CLOSED` → Cancelled: the window closed or reloaded before the retry.

### Delivered (final)
The server accepted the notification.

### Not sent (final)
The notification did not go, and no request was made.

### Cancelled (final)
The developer answered or came back in time, or the window closed, so the notification is no longer needed.

### Failed (final)
The second attempt failed too, and the notification is lost in silence.
