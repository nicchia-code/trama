# Trama

**T**asks · **R**equirements · **A**nalysis · **M**ap · **A**gents

**Your AI agent writes code fast. Trama makes sure it's the code you meant.**

Trama keeps a map of your app next to your code: every state it can be in, and the events that move it from one to the next, written as plain Markdown in `.trama/` and drawn for you as a diagram. Your agent reads the map before it writes a line. Every change to the design arrives as a **Proposal** you approve before any code exists. When the code and the map stop telling the same story, Trama raises a **Drift**, and you decide which one is right.

Trama is an editor extension. It never calls a model: the work is done by the agent you already use, with your subscription.

## How it works

1. **Describe a change** in plain words, as you'd tell a colleague.
2. **Answer the agent's questions**: only what it can't decide alone, with its recommendation already selected.
3. **Approve the Proposal**: the change drawn on the map, with every decision and assumption beside it.
4. **Run the Tasks**: the agent builds what you approved while you follow along on the Board.
5. **Resolve the Drifts**: fix the code, or keep it and update the map. Until you decide, no Task touches that part of the app.

Your rules (tech stack, design, data, business rules) live next to the map as **Requirements**, and the agent follows them on every Task.

## Requirements

- VS Code 1.106 or later with the Trama extension: it is the only editor Trama supports.
- Linux (x64), macOS (Apple silicon) or Windows (x64, preview).
- omp, the only agent Trama supports. It is required: Trama finds it in `trama.ompPath` or, when that is empty, in your `PATH`, then in `~/.bun/bin` and `~/.local/bin`; when it is missing Trama offers to install it with omp's official installer, and before every launch it checks for a newer omp and updates it by itself.

The `trama` command line comes inside the extension: there's nothing else to install.

## Install

Download the `.vsix` for your platform from [Releases](https://github.com/nicchia-code/trama/releases), then run **Extensions: Install from VSIX…** from the command palette, or:

```sh
code --install-extension trama-<platform>-<version>.vsix
```

> **Windows is in preview**: it is tested on CI but not yet by hand. `trama.exe` is not signed, so SmartScreen or an antivirus may warn the first time it runs.

## Use

1. **Open your project** and click the Trama logo in the Activity Bar: the Trama menu opens in the side bar. Choose **Board**, **Diagram** or any other entry to open the panel on it (the same entries are the `Trama: Show …` commands of the palette).
2. **Set it up.** In a folder without a Trama project the panel opens on **Get Started**, a step-by-step setup (`Set up Trama`): choose **Import from Code** (the agent maps the app you already have) or **Start from Scratch**, check omp, pick the models omp uses, and confirm a summary of your choices. The steps appear at the top, each earlier one is a button that takes you back with your choices kept, and **Back**, **Next** and the confirmation stay in a bar at the bottom. Nothing is written until you confirm the summary.
3. **Ask for a change.** On the Board, click **+ Add Work Item**, write what you want in the tab that opens, and send it with **Send to agent** (closing the tab sends it too).
4. **Decide.** Answer the agent's questions, then **Approve** or **Reject** its Proposal.
5. **Build.** Click **Run all** and the agent implements the Tasks.
6. **Keep the map honest.** **Trama: Scan System** has the agent compare the code with the map. Each Drift it finds offers ways to fix the code: **Resolve** it or **Dismiss Drift**.

Every setting is in the **Settings** tab of the panel, which saves to your user settings; **Guided setup** there (top right) walks you through the main ones again, step by step, with each setting explained under its title.

## Optional features

The **Features** group of the Settings tab holds optional features, off by default except **omp Chat** and its **omp Chat Intent Tracing**:

- It is on by default and stays on until you turn it off in your user settings (`trama.ompChat` set to `false`); a value in the workspace settings does not count, so a cloned repository cannot change it.
- With it on, the jobs Trama starts open as conversations in the **omp Chat** view, one conversation per job, instead of omp terminals. The view sits in its own container of the secondary sidebar of VS Code, on the right like the VS Code chat (VS Code 1.106 or later). Trama never opens, closes or moves a side bar by itself, except to show the view when a conversation opens.
- **Approval**: the **omp Chat Approval** setting (`trama.ompChatApproval`, user settings only) is `ask` by default: omp asks permission as in the terminal, and each request shows in the conversation with a button per option. With `yolo`, **omp runs every command without asking**, even those it would ask you to approve in the terminal; choose it only if you accept that. The setting applies to omp Chat conversations only: the omp terminal and omp sessions you start by hand are not affected.
- **Intent Tracing**: the **omp Chat Intent Tracing** setting (`trama.ompChatIntentTracing`, on by default, user settings only; a workspace value does not count) makes the agent write, at each tool call in omp Chat, the sentence that says why it makes it. Off saves tokens. It applies to conversations started afterwards.
- The session receives only the MCP servers of omp's own files (`.omp/mcp.json` in the project and `~/.omp/agent/mcp.json`); the files of other tools are not read.
- If omp cannot be reached (not found, exits at start, does not answer), the job starts in the omp terminal as it does with the feature off, and a notice says why.

## Learn more

- [What the words mean](./CONTEXT.md)
- [Model file format](./docs/model-format.md)
- [Command line reference](./docs/cli.md)
- [Contributing](./CONTRIBUTING.md)

## License

Trama is open source under the [GNU AGPL v3](./LICENSE): use it, change it and share it, as long as your changes stay open too. For a commercial license, [get in touch](mailto:luca.soda@gmail.com).

Copyright © 2026 Luca Soda
