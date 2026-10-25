---
description: "Use for the privacy, security, reliability and acceptance of Trama's ntfy notifications."
---
# Away notifications quality

## notice
- Privacy: a notification leaves the machine and goes only to the server of the settings. It holds only the name of the project's folder, the name of the conversation, a fixed text for the event, a tag and a priority: never what the agent wrote, asked or ran, the content or the path of a file, an answer of the developer, a Proposal, a Task or a Drift. On ntfy.sh the topic works as a password, and the description of the setting says so.
- The server, the topic and the token never appear in messages to the developer, in logs or in diagnostics; the token is never in the settings, in a file, in a message to the webview or in a command line.
- Security: both settings are read only from the user settings, so a cloned repository can neither turn the notifications on nor send them to its own server.
- Reliability: sending is asynchronous and every error is caught; it never blocks or changes the editor, the agent, a round, a conversation or a job. After the only retry a failure is silent.
- Performance: a window holds at most one finished notice; each notice has at most one request in flight; timers exist only while a notice waits, and nothing polls.
- Acceptance, with omp Chat on and a topic on a server that receives: a scan with `trama.autoExit` on (one notification at once) and off (one after thirty seconds of quiet); a `Run all` with two Runs (one notification, after the last); a round left unanswered for thirty seconds (one notification) and one answered before (none); a permission request with `trama.ompChatApproval` on `ask`; omp killed during a Run (a stopped notification at once); Ask more and General (none); a reload during a Run (none at the reopening, one at the end); a wrong server (nothing shown); the test button with a valid and a wrong token.
