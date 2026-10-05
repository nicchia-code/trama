# Trama

Program from a layered Model of every state your software can be in, plus the Requirements that say how it must be built. Both are plain Markdown in `.trama/`; an agent explores them through the `trama` CLI; you review changes as Proposals.

Vocabulary: [CONTEXT.md](./CONTEXT.md). Decisions: [docs/adr](./docs/adr). File format: [docs/model-format.md](./docs/model-format.md). CLI: [docs/cli.md](./docs/cli.md).

## Status

Implemented:
- Model format, validation and the `trama` CLI (exploring, Proposals, Tasks, Drifts, board). A Drift is written at the level of behaviour, with two to five **fix options** the developer chooses from when keeping what should happen (and an optional note), and an optional **Where in the code** section for files. An open Drift blocks the Tasks that concern the same thing: the agent cannot start them and runs skip them; the board marks them.
- The agent reaches Trama only through the `trama` command line, run in the editor's terminals or anywhere else, and asks the developer with `trama ask` (ADR 0009). In a terminal Trama started (`TRAMA_AGENT` set), and in Cursor's chat (`CURSOR_AGENT=1`, ADR 0010), the developer's decisions are refused to the agent and its moves to In progress take the Task (ADR 0005).
- Shared agent question rounds through JSON-stdin `trama ask`: an overlay in the Trama panel with an index, free text beside the options, a summary sent with Send to agent, confirmed skips, window-local FIFO and isolated caller cancellation. Editor loss interrupts admitted rounds with `editor-interrupted`, without partial answers or fallback; initial absence remains `unavailable`. [Question contract](./docs/cli.md#question-rounds).
- Away notifications through [ntfy](https://ntfy.sh) (`trama.ntfy`, user settings only): when a question round of an agent that Trama started in a terminal stays unanswered for 10 seconds, and when that agent's command ends without another instruction within 10 seconds, Trama POSTs a short message (project folder, question and option labels, or outcome and Board counts) from the extension host, retries once and then warns in the editor. Nothing is sent without a topic; Trama's conversations in Cursor's chat get the end notice at each turn, other editors' chats and agents started by hand get none. It is the only network request Trama makes by itself.
- Cursor as a first-class editor (3.22.12 and 3.23.12): the `auto` launcher (the default) uses Cursor's chat, sending the instruction by itself or falling back to the confirmed deeplink and the clipboard; Cursor's hooks in `~/.cursor/hooks.json`, written by Initialize and Update skills, run `trama cursor-hook` so the editor follows Trama's conversations (ghosts, ntfy notices). See the [extension README](./extension/README.md#cursor). Cursor's Agents Window is not supported.
- The `terminal-tab` launcher (`trama.agentLauncher`; never chosen by `auto`): the integrated agent terminal opened as an editor tab in a group beside the active one, so the panel stays visible; a new tab needed while the previous one is still open goes into that tab's group; opening or reusing the tab brings it to the front of its group without taking the focus; reuse, end of command, notices, ghosts and taken Tasks behave as with the integrated terminal, and worktree terminals stay in the terminal area. See the [extension README](./extension/README.md).
- Agent terminals named after their work: the short number of the Task (`T3`) or of the Proposal whose design runs (`P2`), or `Design`, `Scan`, `All tasks` or `Import`, in the terminal area, as an editor tab and as the title of an external window where the terminal allows one. The name is fixed when the terminal opens, so a free terminal or window is reused only for an instruction with the same name; another name opens a new one and leaves the old one open. Worktree terminals stay `Trama agent`.
- The `external-terminal` launcher (`trama.agentLauncher`, Linux and macOS, local projects only; never chosen by `auto`): the agent command runs in a window of the system's default terminal (detected, or `trama.externalTerminalCommand`, user settings only, with a `{command}` placeholder), the window stays open in the developer's login shell when the command ends, and the end reaches the editor through a marker file holding only the exit status, so notices, ghosts and taken Tasks behave as with the integrated terminal. A free window is reused only with Terminal.app, kitty or WezTerm, and only for an instruction with the same name; if a window cannot be opened the instruction goes to the clipboard with an error; closing a window by hand is not detected. See the [extension README](./extension/README.md#external-terminal).
- Requirements beside the Model (ADR 0007): one folder per Area in `.trama/requirements/`, with an `area.md` and fragments holding sections attached to Model elements, changed through Proposals, delivered to agents as generated skills (one per fragment, `trama-req-<area>-<fragment>`, or one index skill per Area, `trama-req-<area>`, when the fragments' descriptions pass 4,000 characters) and inside `task show` and the element views. `trama validate` warns of fragments over 12 KB; `trama skills update` converts Areas still written as one file.
- Two ways to ask for a design: **Quick request…** sends one line; **Design…** creates an empty `.trama/requests/<id>.md` named after the date and time (never versioned) and opens it; Trama saves it while you write, and **Send to agent**, or closing the tab, sends the agent an instruction naming the file, once (closing it empty deletes it). The agent binds its first Proposal to it (`proposal new --request <id>`), and handing that Proposal over deletes the request.
- Proposals start as Drafts, outside the decision count and diagram overlays. The agent finishes every file, validates and reviews the changes, then runs `proposal submit`. Later edits withdraw an open Proposal back to Draft. The developer alone can discard an unfinished Draft.
- Short numbers: every live Proposal, Task and Drift has a temporary number (`P3`, `T3`, `D3`) beside its permanent eight-character identity. The Board, the panel and the command line show the number while the card is live and the identity only once it is closed, never both; every command that names a card accepts the number (`trama task move T3 doing`) and refuses a wrong letter or a number nobody has; `--json` gives `id` and `number`. Numbers live only in `.trama/short-numbers/assigned` of each working copy (not versioned), and files, branches and instructions to the agent always use the identity. The skills name cards by number and title and write only identities. See [CLI](./docs/cli.md#conventions).
- Four agent skills in [skills/](./skills): `trama-design` (an interview in rounds of questions with recommendations, then a Proposal), `trama-scan` (Model vs code → Tasks and Drifts), `trama-implement` (Task → code; files a Drift when the Model cannot be followed. Asked for one Task it stops there; in a run over several Tasks, Run all To do or Run this design, it takes each Task from `trama task next`, skips the blocked ones, goes on past a Drift, and ends with a report of what it implemented, the Drifts it filed and the Tasks left unrun), `trama-import` (existing code → Proposals describing it as it is, with doubts; ADR 0008). `trama init` installs them into `.agents/skills/` (VS Code, Codex, Cursor); `--skills-dir .claude/skills` for Claude Code; `trama skills update` refreshes them and deletes the `trama-fix` skill that earlier versions installed.
- The VS Code extension in [extension/](./extension): Diagram, Board, Requirements (every description and body shown in them is rendered as Markdown), a ghost on the Board of each card the agent is about to create, and buttons that send prompts to the editor's agent chat or to a terminal agent (`trama.agentLauncher`). The Board is read-only for Tasks: it has no way to move a Task, drag a card or take a Task back from the agent; those stay in the command line (`trama task move`, `trama task take-back`). When the agent's command ends, the Tasks it had taken go back to To do.
- Packaging: `bun run package` builds a `.vsix` per platform (linux-x64, darwin-arm64) with the CLI inside; tagged releases are built by GitHub Actions.

Not done yet: licensing.

## Develop

```sh
bun install
bun test
bun run typecheck
bun run build          # dist/trama, a single binary
bun run build:extension # extension/dist/{host,webview}.js
bun run harness        # extension/dist/harness.html: the webview in a plain browser, demo data
```

If the shell was launched as a Trama agent or by Cursor's chat agent, use `env -u TRAMA_AGENT -u CURSOR_AGENT bun test`: the isolated test fixtures exercise developer-only commands as well.

Try it on the example Model:

```sh
cd examples/shop
bun run ../../src/cli/bin.ts machine order
bun run ../../src/cli/bin.ts paths order Draft Shipped
```

`src/core` has no dependency on Bun, so the extension reuses it. `src/cli` is the command line. To run the extension, open `extension/` in VS Code and press F5 after `bun run build:extension`.
