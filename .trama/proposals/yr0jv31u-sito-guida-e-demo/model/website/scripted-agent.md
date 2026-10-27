# Scripted agent

One job of the demo's agent, which plays a script in place of the real agent. A job starts in the demo window whenever the extension would give work to the agent: a design request, Ask more, Rework with feedback, a Run or Run all, a scan, a Fix option or Rework of a Drift, the resolution or unification of Drifts, an import, a refinement. Each job has its own conversation in omp Chat, as in the extension; the demo has no terminal agent, and the terminal only shows omp started. A job also starts when the visitor writes freely in omp Chat: its script is a short courtesy reply that says the demo agent works only from Trama's buttons and points at the tour's next step.

The script comes from the tour when the job answers a step of a chapter; otherwise it is the generic script for that kind of work on that card, so every button works. A script does to the demo project what the real agent does through Trama's command line, with the same rules: it announces its ghost, writes notes on it, takes and moves Tasks, files Proposals, Tasks and Drifts, records History, asks a round of questions. Meanwhile omp Chat shows its messages and tool calls, and the panel, the side menu and the status bar react as they do to the real agent. The generic scripts end well: a Run brings its Tasks to Done, a scan of code that matches the Model files no Drift, a Fix option resolves its Drift.

A script lasts a few seconds. Several jobs can play at once, each in its own conversation.

## States

### Playing (initial)
The script plays its steps one after the other in its conversation of omp Chat; a button there brings it to its end at once.
- `visitor.SPEED_UP_AGENT` → Waiting for answers: the script still has a round of questions to ask; everything before it is done at once and the round opens.
- `visitor.SPEED_UP_AGENT` → Done: the script has no round of questions left; everything left is done at once.
- `ASKED_QUESTIONS` → Waiting for answers: the round opens over the panel, as a round of the real agent does.
- `FINISHED` → Done
- `developer.STOP_CHAT_AGENT` → Stopped: the visitor stops the job in omp Chat.
- `visitor.RESET_DEMO` → Stopped: the job is thrown away with the demo.
- `visitor.LEAVE_DEMO` → Stopped

### Waiting for answers
The script waits for the visitor to answer its round, as the real agent does.
- `developer.SEND_ANSWERS` → Playing: the script goes on. The answers are recorded where the real agent would record them (for a design, the decisions in the body of the Proposal); the rest of the script stays the same whatever the answers.
- `developer.STOP_CHAT_AGENT` → Stopped
- `visitor.RESET_DEMO` → Stopped
- `visitor.LEAVE_DEMO` → Stopped

### Done (final)
The script reached its end; its last message in omp Chat says what it did.

### Stopped (final)
What the script already did to the project stays, as it would with the real agent; its ghost goes away.

## Events

### ASKED_QUESTIONS
Emitted when the script reaches its round of questions.

### FINISHED
Emitted when the script has done its last step.
