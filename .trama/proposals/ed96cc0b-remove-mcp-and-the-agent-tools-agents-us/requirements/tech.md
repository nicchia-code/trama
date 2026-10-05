---
description: "Use when choosing or using languages, frameworks, libraries, platforms, project structure or build and deploy setup."
---
# Technology and constraints

## General
- Language: TypeScript in strict mode (ES2022, ES modules, bundler module resolution) with `noUncheckedIndexedAccess` on, so every indexed read may be undefined.
- Runtime, package manager, test runner and compiler of the command line: Bun (`bun install`, `bun test`, `bun build --compile`). Type checking is `tsc --noEmit`.
- Only three runtime libraries: `yaml` (front matter and settings files), `cytoscape` and `elkjs` (drawing and laying out the Diagram).
- Layers: `src/core` holds the Model, Requirements, Proposals, Tasks, Drifts and Snapshot logic and must not depend on Bun, so the editor extension reuses it; `src/cli` is the command line; `extension/src` is the VS Code extension (a host running in Node, bundled as CommonJS, and a webview running in the browser).
- The command line is one standalone binary named `trama`, built with `bun build --compile`. The agent skills are embedded in the binary.
- Persistent project information is plain Markdown (with YAML front matter where needed) in a `.trama/` folder at the project root, versioned with the project's git. There is no database or network service; the extension's user-local question socket and transient discovery records are the exception to project-file storage.
- Trama never calls a language model and never reads the project's code; the agent does, through the command line.
- The extension targets VS Code (engine `^1.95.0`), also works in Cursor, and is packaged as one `.vsix` per platform (`linux-x64`, `darwin-arm64`), each with the command-line binary inside. Tagged releases (`v*`) are built and published by a GitHub Actions workflow on Bun 1.4.0, which type-checks, runs the tests and smoke-tests the packaged binary.
- Agent skills live in `skills/` (trama-design, trama-scan, trama-implement, trama-import) and are installed into the project's `.agents/skills` by default, or `.claude/skills` for Claude Code.
- `examples/shop` is a complete sample Trama project (Model and Requirements of an online shop) used by the demo scripts, the harness and the manual acceptance run; it is data, not part of the System.

## agent-terminal
- The agent runs in a terminal named "Trama agent", created in the project folder with the environment variable `TRAMA_AGENT=1`; the command line refuses the developer-only commands (approve, reject, discard, resolve a Drift, take a Task back) while it is set. This stops an agent that runs them by mistake, not one that clears the variable on purpose (ADR 0005).
- Settings: `trama.agentCommand` (command that starts the agent; `{prompt}` is replaced by the shell-quoted prompt, or the prompt is appended if missing), `trama.agentLauncher` (`terminal`, the default, or `chat`), `trama.autoScan` (default on) and `trama.skillsDir` (default `.agents/skills`).
- The setting `trama.language` is free text, empty by default, and is read each time an instruction is sent. It is part of the instruction only: it is not saved in the project, in `.trama/` or in the skills, so an agent that the developer starts without Trama does not receive it. Trama does not check that the text names a real language. The interface of Trama stays in English.
- The chat launcher runs the editor's `workbench.action.chat.newChat` and `workbench.action.chat.open` with the prompt in agent mode; this is not a documented API, so the prompt goes to the clipboard when it fails and always in Cursor.

## panel
- Markdown in the panel is rendered by a small renderer of our own in the webview code, with no new runtime library. One renderer serves the Diagram, the Board and the Requirements tabs, and it is a plain function from text to DOM nodes that can be tested without a browser page.
- The renderer builds elements with the DOM API and sets text with `textContent`; it never uses `innerHTML` or similar, so no text from a file can inject markup or script. Links are only given an `href` when they are http or https, and are opened by the editor host in the system browser, not by navigating the webview.

## proposal
- The command line has `trama proposal submit <id>` for the agent's hand-over and `trama proposal discard <id>` for the developer's discard (a developer-only command). Every command that registers, writes or deletes a file of a Proposal sends an open Proposal back to Draft and says so in its output.

## drift
- `trama drift new` takes `--happens` and `--should` (the text of the two sides) and the optional `--where` (the text of Where in the code), in place of `--body`, which is removed. It also takes from two to five fix options: each `--option <title>` is followed by its `--option-text <text>`, in the order of the options. Creating a Drift with fewer than two, more than five, an option without title or text, or a title without its text is refused. The skills that file Drifts (`trama-scan`, `trama-implement`, `trama-import`) write both sides and the options, the recommended one first, follow the writing guidelines of the Drift, and put code locations only in `--where`.
- `trama drift replace-proposal <id> --proposal <p>` attaches a newer Proposal in place of the stale one; it is not a developer-only command, since the agent runs it. The skill `trama-design` uses it when asked to rework the stale Proposal of a Drift.
- `trama drift resolve` stays developer-only; `--fix-code`, `--accept-proposal` and `--dismiss` apply the rules of the Drift. `--fix-code` takes `--option <n>` (the number of the chosen option) and the optional `--note <text>`. When `--fix-code` is given without `--option` for a Drift that has options and the command runs in an interactive terminal, it shows the options as a numbered menu with the recommended one as the default, taken by pressing Enter, then asks for an optional note, empty for none; in a non-interactive run it is refused, saying that an option must be chosen. `--option` with `--accept-proposal` or `--dismiss`, and `--note` with them, are refused.

## task
- The command line that moves a Task to In progress as the agent, and `trama task show`, report the blocking Drifts or fix Task by ID and title. `trama drift new` accepts the origin Task (`--task <id>`). The skill `trama-implement` files its Drift with it, leaves the Task In progress and stops: it takes no further Task in the same run, blocked or not. When a move to In progress is refused because the Task is blocked, the skill stops too, names the Task and the Drift (or fix Task) the refusal names, and takes no further Task. Its final report says what it implemented and which Drift stopped the run. The skill `trama-scan` files Drifts without an origin.

## announcement
- `trama announce <proposal|task|drift> "<title>"` prints the new announcement's ID. It is not developer-only: the agent runs it.
- `trama proposal new`, `trama task new` and `trama drift new` take an optional announcement ID (`--announcement <id>`). The command that hands a Proposal over needs no ID, since the Draft is already bound.
- Every terminal Trama starts for an agent gets the environment variable `TRAMA_TERMINAL`, an ID of six random lowercase letters and digits that stays with the terminal for as long as it exists, including when it is reused. `trama announce`, and a `trama proposal new` that makes an announcement of its own, copy that variable into the announcement's `terminal`; without the variable the announcement has none. The announcement Trama makes for a design request gets the ID of the terminal it types into.
- The command line writes and deletes the announcement files; the extension also deletes them, when it withdraws them. The Snapshot reads them like the other project files, and the panel refreshes when they change.
- The extension owns the fifteen minutes of quiet and the end of the agent's command: it watches the terminals Trama started and the open question round, withdraws the announcements and keeps the notices. It counts the end of a command only when the terminal reports it with the command line Trama typed, compared after trimming; any other end is ignored, as are ends that arrive without a command line. It withdraws only the announcements whose `terminal` is the terminal where the command ended or that was closed. The command line alone never withdraws an announcement on its own.
- The skills `trama-design`, `trama-scan`, `trama-import` and `trama-implement` tell the agent to announce each card as soon as it knows it will create it and to pass the ID when it creates it: `trama-design` for the Proposals it writes after the first, `trama-scan` for each Task and each Drift, `trama-import` for each Proposal and `trama-implement` for the Drift it files. They tell it never to wait for an announcement to be shown before going on.

## project
- The extension starts only in workspaces that contain `.trama/model/system.md`. The panel offers to initialize a workspace that has no `.trama/`; initializing runs the same code as `trama init` with the configured skills folder.
- When the package ships a `trama` binary for the platform, its folder is put first on the PATH of the editor's terminals so the agent finds it.

## question-round
- Expose `trama ask`, reading the round as JSON from standard input and waiting until it can print the result as JSON to standard output. When no editor is connected for the project it prints explicit editor unavailability instead of an answer. Keep diagnostics off standard output so agents can consume the result. This command displays no terminal question interface.
- Use the editor extension host's native Quick Pick and Input Box APIs for the question sequence, multi-selection, recommended defaults, Back navigation and focus preservation.
- The extension accepts `trama ask` question requests over a user-local Unix-domain socket, or a named pipe on Windows, accessible only to the current OS user. Do not expose an HTTP port or remote service and do not add runtime libraries for this transport.
- Supply the launching window's endpoint in the environment of Trama agent terminals. `trama ask` without that address discovers a live endpoint for the same project through user-local runtime records outside the repository, using focus recency to select a window. Stale records are not a reachable editor.
- Preserve workspace/project routing independently of the process working directory, through `trama ask --root <project>`.
- Propagate the interruption of `trama ask` (SIGINT or SIGTERM) and its disconnection to the round's lifecycle. Close controls only for the affected round and release its queue position. Client-side timeouts that are not signalled to Trama cannot be detected; observable cancellation or disconnection is required to remove those rounds.
- Distinguish initial editor connection failure from loss of an established editor connection after sending a validated round. Connection failure before submission returns initial editor unavailability. Closure or failure of the editor connection after submission and before a complete result returns the shared `editor-interrupted` error without answers; do not wait for a response timeout or translate it into the fallback result.
- For `editor-interrupted`, `trama ask` prints the error with its code and message as JSON on stdout and exits with failure, keeping diagnostics on stderr. This ends the waiting operation, not external agent processes. The agent skills enforce stopping the workflow awaiting those decisions.
