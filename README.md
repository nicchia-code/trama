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
6. **Keep the map honest.** **Scan System** in the side menu has the agent compare the code with the map. Each Drift it finds offers ways to fix the code: **Resolve** it or **Dismiss Drift**.

Every setting is in the **Settings** tab of the panel, which saves to your user settings; **Guided setup** there (top right) walks you through the main ones again, step by step, with each setting explained under its title.

To use a model with a subscription (ChatGPT, Anthropic, GitHub Copilot, Google Gemini CLI, Google Antigravity, Cursor or xAI Grok), open the **omp** group of the **Settings** tab, or the `omp` step of the wizard, and press **Log in** on the provider's row of the **Providers** section (**Log in again** when it already shows **Connected**). Trama opens a terminal named `Log in to <provider>` where omp runs `omp login <provider>`: omp opens the browser or shows a code, and you finish the login there. When the command ends, Trama checks omp again and updates the **Connected** marks; it never reads the terminal or your credentials.

For Cursor you can also give Trama a **Cursor API key**: press **Set API key** on the Cursor row of the **Providers** section (**Change API key** and **Remove API key** appear once one is saved), paste a user API key from the Cursor dashboard in the masked box the editor opens, and Trama saves it in the editor's secret storage (`trama.cursorApiKey`), one key per user shared by every window and project; the key never goes into a file, a setting, the panel or an instruction to the agent. Every omp that Trama starts afterwards (jobs, Ask more, the login terminal, `omp models --json`, `omp --version`, the check and update of omp, `omp usage --json`, and the conversations of omp Chat and General) receives it in the environment variable `CURSOR_ACCESS_TOKEN`, which wins over one the editor inherited; without a saved key Trama adds nothing, and an omp you start by hand receives nothing. Terminals and conversations already open keep the access they had. Known risk: Cursor's documentation says the dashboard's user keys are exchanged for an access token, omp does not do that exchange, and it is not verified that a dashboard key works as `CURSOR_ACCESS_TOKEN`; omp lists Cursor's models even with a wrong key, so the row can say **Connected** with an invalid key. Like any environment variable, the key is visible to the commands omp runs in its process.

To make omp forget a provider, press **Log out** on the row of a provider that shows **Connected**, and confirm in the editor's dialog (closing it changes nothing). Trama then runs `omp auth-broker logout <provider>` in the background, with no terminal; the row's **Log out** shows a spinner and its buttons are unavailable until omp has finished and Trama has checked omp again. omp removes every account it stored for that provider (OAuth logins and keys saved by its login). It never touches credentials omp reads from elsewhere (environment variables, `.env` files, keys in `models.yml`) or the **Cursor API key** saved in Trama: if the provider is still **Connected** after a successful logout, Trama says it is still reachable through another credential, and you remove that one where it lives. A failure is shown as an editor error with the last line of omp's error output.
Behind a proxy that inspects HTTPS traffic, omp and the commands its agent runs reject the proxy's certificates, because they do not trust the authority your company installed in the system. **System Certificates** (`trama.systemCertificates`, the last setting of the **omp** group and of the wizard's `omp` step, off by default, user settings only) fixes that: while it is on, Trama exports the certificate authorities your system trusts, together with the public ones the editor's runtime ships, into one bundle in your own cache folder (`~/Library/Caches/Trama/system-certificates.pem` on macOS, `%LOCALAPPDATA%\Trama\system-certificates.pem` on Windows, `$XDG_CACHE_HOME/trama/system-certificates.pem`, or `~/.cache/trama/`, on Linux), and every omp that Trama starts afterwards receives its path in `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE`, `REQUESTS_CA_BUNDLE`, `CURL_CA_BUNDLE`, `GIT_SSL_CAINFO`, `PIP_CERT`, `CARGO_HTTP_CAINFO`, `AWS_CA_BUNDLE` and `DENO_CERT`, overwriting the same variables of the editor's environment: the terminals of the jobs and of Ask more, the omp Chat conversations (General included), the terminals that install omp and log in, the logout, `omp models --json`, `omp usage --json`, and the check and update of omp. Trama reads only what is trusted for every user: the system keychains of macOS (`/Library/Keychains/System.keychain` and `/System/Library/Keychains/SystemRootCertificates.keychain`, never your `login` keychain), the `Cert:\LocalMachine\Root` store of Windows (never your own store) and, on Linux, the first readable of `/etc/ssl/certs/ca-certificates.crt`, `/etc/pki/tls/certs/ca-bundle.crt`, `/etc/ssl/ca-bundle.pem`, `/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem` and `/etc/ssl/cert.pem`. The export runs without a shell, takes at most 30 seconds, never blocks the editor or a launch, and runs when you turn the mode on, when the extension starts with a missing bundle or one older than 24 hours, and with **Refresh** next to the state line under the setting or the command **Trama: Refresh System Certificates** (shown only while the mode is on). A failed export keeps the earlier bundle and says why. A process receives the variables only when it starts, so open terminals and conversations keep what they had. Trama never turns certificate checking off, and Java's tools, which read a truststore instead of a PEM bundle, are not covered. The setting, with its state line and **Refresh**, is also the last one of the wizard's `omp` step: the value you choose there counts at once for what the step itself starts (its check of omp, the Install omp terminal and the login terminals), checking the box exports the bundle when it is missing or older than 24 hours and the step checks omp again when the export ends, and the value is saved with the other choices only when you confirm. Whatever the mode, when omp fails because it could not verify a server's certificate, Trama says so in plain words instead of omp's raw error.


## Optional features

The **Advanced** group of the Settings tab holds the theme and the optional features, split into the subgroups **Appearance**, **Drifts**, **Agents** and **omp Chat**. Every optional feature is on by default: **omp Chat** with its **omp Chat Intent Tracing**, **Auto Exit**, the **Advisor Scanner** (`trama.advisorScanner`), **Parallel Execution** (`trama.parallelExecution`), the **Async Drift Resolver** (`trama.asyncDriftResolver`), **Sub-agents Context Sharing** (`trama.subagentsContextSharing`) and **Auto-update Stale Proposals** (`trama.autoUpdateStaleProposals`). Turn one off by unticking it in the Settings tab or by setting it to `false` in your user settings; a value in the workspace settings never counts, so a cloned repository cannot change it. A `false` saved earlier stays off; nothing is rewritten or migrated. The details of **omp Chat**:

- It is on by default and stays on until you turn it off in your user settings (`trama.ompChat` set to `false`); a value in the workspace settings does not count, so a cloned repository cannot change it.
- With it on, the jobs Trama starts open as conversations in the **omp Chat** view, one conversation per job, instead of omp terminals. The view sits in its own container of the secondary sidebar of VS Code, on the right like the VS Code chat (VS Code 1.106 or later). Trama never opens, closes or moves a side bar by itself, except to show the view when a conversation opens.
- **General** is always the first tab of the view in a window with a folder open: a free chat with omp in that folder.
- **Usage.** Every conversation of omp Chat (General, a job's conversation, Ask more), even an empty one, shows under the message field, next to the model selector, how much of your subscription limits you have used, as omp reports them with `omp usage --json`: one entry per limit window (`5h`, `7d`, `7d Fable`) of the provider of the model chosen in that conversation, with a ring and the whole percentage (warning colour from 80 %, error colour at 100 %); changing a conversation's model changes its bar at once. Click it to open every provider with its windows and when they reset; each opening asks omp again. The usage is one per window, shared by every conversation. Trama asks omp when a conversation appears and the window has none yet, and after a turn of any omp Chat agent in the window when the last request ended more than 60 seconds ago, never on a timer; a window with no General but with job conversations asks the same way. With only API keys, no subscription, or if omp fails, nothing is shown. Trama reads no credentials and makes no network calls of its own: omp asks the provider with the credentials it already holds.
- **Approval**: the **omp Chat Approval** setting (`trama.ompChatApproval`, user settings only) is `yolo` by default: **omp runs every command without asking**, even those it would ask you to approve in the terminal, which is a risk to accept. To make omp ask permission as in the terminal, set `trama.ompChatApproval` to `ask` in your user settings: each request then shows in the conversation with a button per option. A developer who never chose an approval gets a one-time notice, with a button that opens Settings, when the first conversation starts. The setting applies to omp Chat conversations only: the omp terminal and omp sessions you start by hand are not affected.
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
