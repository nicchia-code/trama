---
status: accepted
---
# Only Cursor's chat and omp are supported agents

Trama supports two agents: **Cursor's chat**, which works only in Cursor, and **omp**, which works in Cursor and in every editor compatible with the VS Code extension API, VS Code included. `trama.agent` is `cursor` (the default) or `omp`. Claude Code, Copilot's chat and the chat in any editor that is not Cursor are no longer supported.

Replaces the parts of ADR 0001 that make VS Code the reference editor and the parts of ADR 0009 that name Copilot and Claude Code as agents of Trama. Both ADRs stay for the rest. ADRs 0004 and 0006 were already superseded and are untouched.

Why they go out:
- **Each chat is a different integration.** Cursor's chat needs its own launcher, hooks and sub-agent definition; Copilot's chat needed another (a hooks file registered in the user settings, a model picker, its own agent definition); Claude Code needed a terminal launcher, `--settings` and `--agents` JSON, a question-tool hook and its own skills folder. Every change to launching, questions or announcements had to be made, and proved by hand, three or four times.
- **Only Cursor and omp could be tested for real.** The versions of Cursor that Trama is checked on are known (3.22.12 and 3.23.12); the Copilot and Claude Code paths depended on behaviour of those products that Trama could not observe or keep in step.
- **omp covers the other editors.** It runs in a terminal inside any editor, so dropping the chats of the other editors leaves every editor with one supported agent, and the chat of Cursor remains where Cursor's own integration is the best one.

What changes:
- `trama.agent` values other than `omp`, the old `chat` and `claude` included, mean `cursor` and are never rewritten. Outside Cursor, `cursor` tries no chat: the instruction goes to the clipboard, and a notice says that Cursor's chat exists only in Cursor and invites the developer to choose omp.
- `trama hook copilot` and `trama hook claude-question-tool` no longer exist. The only hooks are `trama hook cursor` and `trama hook idle`.
- Copilot's leftovers (its hooks file, its entry in `chat.hookFilesLocations`, its user definition of `trama-analysis`) are removed by the extension. `.claude/skills` and `.github/skills` are no longer looked at: what is there stays as it is.
- Documentation and tests present VS Code as one of the editors where omp runs, not as the reference editor.

The cost is accepted: a developer who used Claude Code or Copilot's chat must move to omp (in a terminal, in any editor) or to Cursor.
