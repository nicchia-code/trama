---
status: accepted
---
# Agents use Trama through the command line only

Supersedes ADR 0006. Trama no longer serves agent tools over MCP (`trama mcp`) and no longer registers them as VS Code language-model tools. Every agent, in Copilot, Cursor or a terminal, reaches Trama through the `trama` command line and asks the developer with `trama ask`, which identifies itself to the editor as `trama ask` whoever the agent is. In Cursor the extension stops writing `.cursor/mcp.json` and leaves an existing `trama` entry alone. The skills describe only commands.

One surface instead of three removes a catalog that had to be kept equal to the CLI, the MCP server process, the Cursor configuration and the per-client agent names. The cost is accepted:

- **The developer-only guard rests on `TRAMA_AGENT`.** With the tools, no operation existed for approving, rejecting or resolving. Now the CLI refuses those commands only when `TRAMA_AGENT` is set, so an agent running outside the terminal Trama started is not stopped by it. ADR 0005 already states that the guard is not a security boundary.
- **An agent outside Trama's terminal does not take a Task.** It takes one by moving it to In progress with `trama task move` in the terminal marked with `TRAMA_AGENT`; a move from anywhere else cannot be told from the developer's. There is no tool path for taking a Task.
- **The agent needs `trama` on its PATH.** The extension puts the bundled binary first on the PATH of the editor's terminals; Copilot's terminal tool uses them.

## Considered Options

- **Keep MCP and drop only the native tools.** Still a second surface to keep equal to the CLI, and a configuration file in Cursor.
- **Keep the native tools for Copilot only.** It would keep the one agent that had the stronger guard, at the price of a catalog and a manifest built for it alone.
