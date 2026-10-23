---
status: accepted
---
# Only omp, in VS Code

Trama supports one agent, **omp**, in one editor, **VS Code** with the Trama extension. Cursor is no longer supported, neither as an editor nor as an agent.

Replaces [ADR 0010](0010-cursor-chat-agent-is-the-agent.md) and [ADR 0011](0011-cursor-chat-and-omp-only.md), and the parts of [ADR 0012](0012-acp-returns-for-omp-chat-only.md) that concern Cursor. Those ADRs stay, each with a line at the top that points here. ADRs 0004 and 0006 were already superseded and are untouched.

What goes out:
- **Cursor as an editor.** The extension, its documentation and its acceptance tests target VS Code. Nothing is written into Cursor's folders (`~/.cursor`).
- **Cursor's chat, with its hooks and the chat Advisor.** `trama hook cursor`, the conversation tracking of the editor, the refusal of Cursor's question tool, the `trama-advisor` sub-agent and the review rounds it ran (`trama advisor review`) are removed. The Advisor Scanner works through omp's advisors only; `trama advisor show` stays.
- **`trama.agent`.** With one agent there is nothing to choose: the setting is no longer declared, and a value left in the user settings is neither read nor rewritten.
- **`CURSOR_AGENT`.** The command line recognises an agent only by `TRAMA_AGENT`, set in the terminals and conversations Trama starts. `CURSOR_AGENT` identifies no agent, takes no Task and marks no announcement.

Why:
- **Two integrations cost twice.** Cursor's chat needed its own launcher, hooks, sub-agent definitions, state files and acceptance checks, and every change to launching, questions, announcements or the Advisor had to be made and proved by hand for it and for omp.
- **Cursor's chat cannot be kept in step.** Its hooks, shell environment and background sub-agents are behaviour of a product Trama does not control and can only observe, version after version.
- **omp does everything the chat did, and more.** It runs in a terminal or, with omp Chat (on by default), in a conversation inside VS Code, with questions through Trama's round, announcements, taken Tasks and its own advisors.

The cost is accepted: a developer who used Trama in Cursor must move to VS Code and omp. Anything the extension wrote into Cursor's user folders stays where it is; the developer removes it by hand.
