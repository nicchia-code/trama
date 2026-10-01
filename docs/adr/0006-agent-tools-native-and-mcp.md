---
status: accepted
---
# Agents use Trama through tools: native in VS Code, MCP elsewhere

Supersedes ADR 0004. Trama exposes one catalog of operations as tools an agent calls directly: in VS Code they are registered as language-model tools, so Copilot's agent mode sees them like its own; everywhere else (Cursor, Claude Code, Codex, omp) `trama mcp` serves the same catalog over MCP, and in Cursor the extension writes `.cursor/mcp.json`. The catalog has no tool for approving or rejecting a Proposal or resolving a Drift, which makes those the developer's decisions by construction for agents using the tools, not only by the skills' instructions. The skills still carry the workflow and fall back to the `trama` CLI when no tools are offered.

## Considered Options

- **ACP, with Trama hosting the conversation (ADR 0004).** Dropped: the editors' own agent chats already host the conversation, and the gap was letting their agents act on the Model, which tools solve without Trama owning a chat view.
- **Only MCP.** VS Code can use MCP too, but its native tools integrate with Copilot's permissions and tool picker and need no server process.
- **Calling the editor's model from Trama (`vscode.lm`, a `@trama` chat participant).** Would make Trama an agent, against ADR 0001.
