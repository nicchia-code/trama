---
description: "Use when choosing or using languages, frameworks, libraries, platforms, project structure or build and deploy setup."
---
# Technology and constraints

## General
- Language: TypeScript in strict mode (ES2022, ES modules, bundler module resolution) with `noUncheckedIndexedAccess` on, so every indexed read may be undefined.
- Runtime, package manager, test runner and compiler of the command line: Bun (`bun install`, `bun test`, `bun build --compile`). Type checking is `tsc --noEmit`.
- Only three runtime libraries: `yaml` (front matter and settings files), `cytoscape` and `elkjs` (drawing and laying out the Diagram).
- Layers: `src/core` holds the Model, Requirements, Proposals, Tasks, Drifts and Snapshot logic and must not depend on Bun, so the editor extension reuses it; `src/cli` is the command line; `src/tools` is the catalogue of agent tools shared by the MCP server and the editor's language-model tools; `extension/src` is the VS Code extension (a host running in Node, bundled as CommonJS, and a webview running in the browser).
- The command line is one standalone binary named `trama`, built with `bun build --compile`. It also serves the agent tools over MCP on standard input and output (newline-delimited JSON-RPC) with `trama mcp`. The agent skills are embedded in the binary.
- Persistent project information is plain Markdown (with YAML front matter where needed) in a `.trama/` folder at the project root, versioned with the project's git. There is no database or network service; the extension's user-local question socket and transient discovery records are the exception to project-file storage.
- Trama never calls a language model and never reads the project's code; the agent does, through the tools or the command line.
- The extension targets VS Code (engine `^1.95.0`), also works in Cursor, and is packaged as one `.vsix` per platform (`linux-x64`, `darwin-arm64`), each with the command-line binary inside. Tagged releases (`v*`) are built and published by a GitHub Actions workflow on Bun 1.4.0, which type-checks, runs the tests and smoke-tests the packaged binary.
- Agent skills live in `skills/` (trama-design, trama-scan, trama-implement, trama-import, trama-fix) and are installed into the project's `.agents/skills` by default, or `.claude/skills` for Claude Code.
- `examples/shop` is a complete sample Trama project (Model and Requirements of an online shop) used by the demo scripts, the harness and the manual acceptance run; it is data, not part of the System.

## agent-terminal
- The agent runs in a terminal named "Trama agent", created in the project folder with the environment variable `TRAMA_AGENT=1`; the command line refuses the developer-only commands (approve, reject, discard, resolve a Drift, take a Task back) while it is set. This stops an agent that runs them by mistake, not one that clears the variable on purpose (ADR 0005).
- Settings: `trama.agentCommand` (command that starts the agent; `{prompt}` is replaced by the shell-quoted prompt, or the prompt is appended if missing), `trama.agentLauncher` (`terminal`, the default, or `chat`), `trama.autoScan` (default on) and `trama.skillsDir` (default `.agents/skills`).
- The chat launcher runs the editor's `workbench.action.chat.newChat` and `workbench.action.chat.open` with the prompt in agent mode; this is not a documented API, so the prompt goes to the clipboard when it fails and always in Cursor.

## proposal
- The command line has `trama proposal submit <id>` for the agent's hand-over and `trama proposal discard <id>` for the developer's discard (a developer-only command). The agent tools offer `trama_proposal_submit` and have no tool to discard. Every tool and command that registers, writes or deletes a file of a Proposal sends an open Proposal back to Draft and says so in its output.

## task
- The agent tools and the command line that move a Task to In progress as the agent, and `trama task show`, report the blocking Drifts or fix Task by ID and title. `trama drift new` and `trama_drift_new` accept the origin Task (`--task <id>`). The skill `trama-implement` files its Drift with it, leaves the Task In progress, and goes on with the Tasks that are not blocked; it no longer stops the whole run. The skills `trama-scan` and `trama-fix` file Drifts without an origin.

## project
- The extension starts only in workspaces that contain `.trama/model/system.md`. The panel offers to initialize a workspace that has no `.trama/`; initializing runs the same code as `trama init` with the configured skills folder.
- In Cursor, once a project exists, the extension writes the Trama MCP server into `.cursor/mcp.json` (`trama --root <project> mcp`), keeping every other server in the file; it leaves an unreadable file alone and says so.
- When the package ships a `trama` binary for the platform, its folder is put first on the PATH of the editor's terminals so the agent finds it.

## question-round
- Expose `trama_ask` with one shared request/result contract in the agent-tool catalogue. Copilot invokes the editor-native tool directly; Cursor and other MCP clients invoke it through `trama mcp`. The operation waits asynchronously for the completed round and remains offered when no editor is connected, returning explicit editor unavailability in that case.
- Expose `trama ask`, reading the same round as JSON from standard input and waiting until it can print the result as JSON to standard output. Keep diagnostics off standard output so agents can consume the result. This command displays no terminal question interface.
- Use the editor extension host's native Quick Pick and Input Box APIs for the question sequence, multi-selection, recommended defaults, Back navigation and focus preservation. Share this presentation path between direct tool invocations and local transport requests.
- The extension accepts MCP/CLI question requests over a user-local Unix-domain socket, or a named pipe on Windows, accessible only to the current OS user. Do not expose an HTTP port or remote service and do not add runtime libraries for this transport.
- Supply the launching window's endpoint in the environment of Trama agent terminals. MCP/CLI clients without that address discover a live endpoint for the same project through user-local runtime records outside the repository, using focus recency to select a window. Stale records are not a reachable editor.
- Preserve workspace/project routing independently of the process working directory, including Cursor's existing `trama --root <project> mcp` setup and CLI root selection. Reuse existing MCP configuration rather than adding a separate question server to `.cursor/mcp.json`.
- Propagate native tool cancellation, MCP cancellation notifications, caller connection closure, and CLI interruption or disconnection to the round's lifecycle. Close controls only for the affected round and release its queue position. Client-side timeouts that are not signalled to Trama cannot be detected; observable cancellation or disconnection is required to remove those rounds.
- Distinguish initial editor connection failure from loss of an established editor connection after sending a validated round. Connection failure before submission returns initial editor unavailability. Closure or failure of the editor connection after submission and before a complete result returns the shared `editor-interrupted` error without answers; do not wait for a response timeout or translate it into the fallback result. Native tool invocations end with the editor host or report the same interruption while the host can still respond.
- For `editor-interrupted`, agent tools return an error result containing its code and message; `trama ask` prints the same error as JSON on stdout and exits with failure, keeping diagnostics on stderr. This ends the waiting operation, not unrelated MCP requests or external agent processes. The agent skills enforce stopping the workflow awaiting those decisions.
