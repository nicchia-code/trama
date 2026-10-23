---
status: accepted
---
> The parts that concern Cursor (Cursor's chat and Cursor as an editor) are replaced by [ADR 0013](0013-vscode-and-omp-only.md).

# ACP returns, for omp Chat only

Trama speaks the Agent Client Protocol (ACP) again, but for one purpose: **omp Chat**. With `trama.ompChat` on (it is, unless the user settings turn it off), the extension is an ACP client of `omp acp`. Each job Trama starts (design, scan, Run, Resolve Drifts, Quick Task, Ask more) opens one conversation in a view of the secondary sidebar, and each conversation is one `omp acp --yolo` process, spawned without a shell. The conversation takes every rule of the omp terminal it replaces: the same instruction, role and model, announcement, taken Tasks, question rounds, `trama.autoExit` and run check. When omp cannot be started, the same instruction runs in the terminal as with omp Chat off, and a notice says why.

Two choices follow from running without a terminal:
- **Every command runs without asking.** The process starts with omp's yolo mode, so no permission request reaches the conversation. This is the developer's accepted choice, limited to omp Chat processes; the setting is read only from the user settings, so a cloned repository cannot change it. The terminal of omp and sessions started by hand are unchanged.
- **The session receives only omp's native MCP servers** (`.omp/mcp.json` of the project and `~/.omp/agent/mcp.json`, with omp's precedence), the same ones omp would read in a terminal. Files of other tools (`.mcp.json`, `.claude/`) and plugins are not read.

ADR 0004, which is superseded, does not come back. Its ACP "Agent" tab hosted many agents (Copilot CLI, Claude Code, Codex, Gemini) and granted or asked for their permissions; ADR 0011 removed those agents, and Trama does not bring them back:
- no agent other than omp speaks ACP with Trama;
- no "Agent" tab is added to the panel: the conversations live in their own view, outside the Diagram and the Board;
- no permission dialogs: the agent runs in yolo mode, and the terminal stays the fallback instead of a general launcher setting.

ADR 0009 also holds: the agent reaches Trama only through the `trama` command line, from inside the conversation too. The agent stays a separate process, so ADR 0001 still holds.

The cost is accepted: Trama owns a small chat view that has to keep up with omp's ACP changes, and each new omp version that changes ACP must be checked again (acceptance in `docs/uat.md`, section Z).
