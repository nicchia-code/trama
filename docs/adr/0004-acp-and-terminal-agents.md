---
status: superseded by ADR-0006
---
> Replaced by [ADR 0013](0013-vscode-and-omp-only.md): Trama supports only omp, run by Trama in the integrated terminal or over ACP in omp Chat.

# Agents over ACP, with the terminal as a fallback

Trama talks to coding agents through the Agent Client Protocol (ACP): the extension is the client, the agent (omp, Copilot CLI, Claude Code or Codex through their adapters, Gemini and others) runs as a separate process over stdio, and Trama shows the conversation, the agent's questions and its permission requests in an "Agent" tab next to the Diagram and the Board. Agents without ACP are still launched as a command in a terminal (`trama.agentCommand`). The editors' built-in chats (Copilot Chat, Cursor) are not ACP servers and have no stable API for receiving a prompt, so Trama does not drive them.

By default Trama grants an agent's requests to read or edit files inside the project and to run `trama`, and asks the developer for everything else.

## Consequences

The agent stays a separate process, so ADR 0001 still holds: Trama does not embed an agent, it only hosts the conversation. Trama now owns a small chat view, which has to keep up with protocol changes.
