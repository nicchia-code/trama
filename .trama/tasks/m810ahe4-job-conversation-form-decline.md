---
column: done
technical: true
refs:
  - requirements/quality#omp-chat-conversation
drift: null
proposal: kv1x3wmx
agent: false
created: 2026-10-24T14:42:09.104Z
finished: 2026-10-24T15:17:55.614Z
---
# Decline forms in job conversations

When done, omp's own question tool can never show a form in a job conversation, even if the hook did not load: the hook refuses the tool and the ACP client also declines the form.

- The conversation (and its saved entry for resume) carries an explicit field saying it is a job conversation with the hook; it is not derived by searching `--hook` among the arguments.
- In a job conversation `createElicitation` (`extension/src/host/omp-chat/client.ts`) answers at once `decline` with the question tool's refusal message (`QUESTION_TOOL_REFUSAL`) and the webview receives nothing. In Ask more and General the form still goes to the webview and is answered with the developer's reply, or declined when the conversation closes first.
- Reliability as the quality section states: no signal of a conversation's end of work goes through a process launched by the agent; a conversation never leaves an orphan process; resume never leaves half conversations; a failed start never loses the instruction. The acceptance exercises an omp question shown as a form in General and refused in a job also with the hook removed, and a job ending on omp's answer to the prompt with `trama.autoExit` on and off without any `trama hook idle` or `trama hook start`.
