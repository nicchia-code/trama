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

- VS Code 1.95 or later, or Cursor.
- Linux (x64), macOS (Apple silicon) or Windows (x64, preview).
- An agent: Cursor's chat (in Cursor only), or omp installed and on your `PATH` (in any of the editors above).
- With the Advisor Scanner on in Cursor's chat, Cursor 3.27.6 or later: its review rounds run in the background while the agent keeps working, and Cursor delivers each result and its notes to the agent. Trama reports the notes again in the review of the Task or the final review. Earlier versions are not recognised.

The `trama` command line comes inside the extension: there's nothing else to install.

## Install

Download the `.vsix` for your platform from [Releases](https://github.com/nicchia-code/trama/releases), then run **Extensions: Install from VSIX…** from the command palette, or:

```sh
code --install-extension trama-<platform>-<version>.vsix
```

> **Windows is in preview**: it is tested on CI but not yet by hand. `trama.exe` is not signed, so SmartScreen or an antivirus may warn the first time it runs.

## Use

1. **Open your project** and click the Trama logo in the Activity Bar, then **Open Trama**.
2. **Set it up.** In a folder without a Trama project the panel opens on **Get Started**: choose **Import from Code** (the agent maps the app you already have) or **Start from Scratch**, then your agent and its models. Nothing is written until you confirm the summary.
3. **Ask for a change.** On the Board, click **+ Add Work Item**, write what you want in the tab that opens, and send it with **Send to agent** (closing the tab sends it too).
4. **Decide.** Answer the agent's questions, then **Approve** or **Reject** its Proposal.
5. **Build.** Click **Run all** and the agent implements the Tasks.
6. **Keep the map honest.** **Trama: Scan System** has the agent compare the code with the map. Each Drift it finds offers ways to fix the code: **Resolve** it or **Dismiss Drift**.

Every setting is in the **Settings** tab of the panel, which saves to your user settings; **Guided setup** there walks you through the main ones again.

## Learn more

- [What the words mean](./CONTEXT.md)
- [Model file format](./docs/model-format.md)
- [Command line reference](./docs/cli.md)
- [Contributing](./CONTRIBUTING.md)

## License

Trama is open source under the [GNU AGPL v3](./LICENSE): use it, change it and share it, as long as your changes stay open too. For a commercial license, [get in touch](mailto:luca.soda@gmail.com).

Copyright © 2026 Luca Soda
