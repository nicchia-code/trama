# Trama

Program from a layered Model of every state your software can be in, plus the Requirements that say how it must be built. Both are plain Markdown in `.trama/`; an agent explores them through the `trama` CLI; you review changes as Proposals.

Vocabulary: [CONTEXT.md](./CONTEXT.md). Decisions: [docs/adr](./docs/adr). File format: [docs/model-format.md](./docs/model-format.md). CLI: [docs/cli.md](./docs/cli.md).

## Status

Implemented:
- Model format, validation and the `trama` CLI (exploring, Proposals, Tasks, Drifts, board). A Drift is written at the level of behaviour, with two to five **fix options** the developer chooses from when keeping what should happen (and an optional note), and an optional **Where in the code** section for files. An open Drift blocks the Tasks that concern the same thing: the agent cannot start them and runs skip them; the board marks them.
- The agent reaches Trama only through the `trama` command line, run in the editor's terminals or anywhere else, and asks the developer with `trama ask` (ADR 0009). In a terminal Trama started (`TRAMA_AGENT` set), and in Cursor's chat (`CURSOR_AGENT=1`, ADR 0010), the developer's decisions are refused to the agent and its moves to In progress take the Task (ADR 0005).
- Shared agent question rounds through JSON-stdin `trama ask`: an overlay in the Trama panel with an index, free text beside the options, a summary sent with Send to agent, confirmed skips, window-local FIFO and isolated caller cancellation. Editor loss interrupts admitted rounds with `editor-interrupted`, without partial answers or fallback; initial absence remains `unavailable`. [Question contract](./docs/cli.md#question-rounds).
- Nell'overlay delle domande, `Next` e `Review` seguono subito la risposta visibile anche dopo aver deselezionato tutte le opzioni: il solo testo non vuoto permette la conferma, mentre cancellarlo o lasciare soltanto spazi la disabilita.
- Le notifiche esterne sono state eliminate. Il trasporto locale di domande e hook e gli avvisi locali dell'editor restano disponibili; le impostazioni utente non vengono riscritte.
- Cursor è supportato come editor (3.22.12 e 3.23.12): il launcher `auto` predefinito usa la chat, inviando direttamente l'istruzione oppure passando al deeplink con conferma e agli appunti. Gli hook in `~/.cursor/hooks.json`, scritti da Initialize e Update skills, eseguono `trama cursor-hook` per seguire le conversazioni Trama, ritirare i ghost e rilasciare i Task. Vedi il [README dell'estensione](./extension/README.md#cursor). La Agents Window di Cursor non è supportata.
- Il launcher `terminal-tab` (`trama.agentLauncher`, mai scelto da `auto`) apre il terminale agente come scheda editor in un gruppo accanto a quello attivo, lasciando visibile il pannello. Una nuova scheda necessaria mentre la precedente è aperta usa lo stesso gruppo; aprire o riusare la scheda la porta in primo piano nel gruppo senza sottrarre il focus. Riuso, fine comando, avvisi locali, ghost e rilascio Task seguono il terminale integrato. Vedi il [README dell'estensione](./extension/README.md).
- Agent terminals named after their work: the short number of the Task (`T3`) or of the Proposal whose design runs (`P2`), or `Design`, `Scan`, `All tasks` or `Import`, in the terminal area, as an editor tab and as the title of an external window where the terminal allows one. The name is fixed when the terminal opens, so a free terminal or window is reused only for an instruction with the same name; another name opens a new one and leaves the old one open.
- Trama riusa soltanto l'ultimo terminale idoneo, ma continua a seguire ogni comando avviato: anche il terminale sostituito rilascia i suoi Task e ritira i suoi annunci.
- Il launcher `external-terminal` (`trama.agentLauncher`, Linux e macOS, solo progetti locali, mai scelto da `auto`) esegue il comando agente in una finestra del terminale di sistema rilevato, oppure scelto con `trama.externalTerminalCommand` nelle sole impostazioni utente usando `{command}`. Alla fine la finestra resta aperta nella shell di login; un marcatore contenente soltanto l'esito comunica la fine all'editor, preservando avvisi locali, ghost e rilascio Task come nel terminale integrato. Una finestra libera viene riusata solo con Terminal.app, kitty o WezTerm e per un'istruzione con lo stesso nome. Se non si apre, l'istruzione va negli appunti con un errore; la chiusura manuale non viene rilevata. Vedi il [README dell'estensione](./extension/README.md#external-terminal).
- Requirements beside the Model (ADR 0007): one folder per Area in `.trama/requirements/`, with an `area.md` and fragments holding sections attached to Model elements, changed through Proposals, delivered to agents as generated skills (one per fragment, `trama-req-<area>-<fragment>`, or one index skill per Area, `trama-req-<area>`, when the fragments' descriptions pass 4,000 characters) and inside `task show` and the element views. `trama validate` warns of fragments over 12 KB; `trama skills update` converts Areas still written as one file.
- Two ways to ask for a design: **Quick request…** sends one line; **Design…** creates an empty `.trama/requests/<id>.md` named after the date and time (never versioned) and opens it; Trama saves it while you write, and **Send to agent**, or closing the tab, sends the agent an instruction naming the file, once (closing it empty deletes it). The agent binds its first Proposal to it (`proposal new --request <id>`), and handing that Proposal over deletes the request.
- Una richiesta scritta è segnata inviata solo quando il terminale riceve l'istruzione o la chat la invia automaticamente. Gli appunti e la chat di Cursor in attesa di conferma la lasciano mai inviata: **Send to agent** conserva la scheda per riprovare; chiudendola volontariamente, il file resta recuperabile dall'esploratore.
- Proposals start as Drafts, outside the decision count and diagram overlays. The agent finishes every file, validates and reviews the changes, then runs `proposal submit`. Later edits withdraw an open Proposal back to Draft. The developer alone can discard an unfinished Draft.
- Una Proposal tocca le Feature solo attraverso file del Modello effettivamente cambiati: registrare una Machine, una descrizione di Feature o un Actor senza modificarne il contenuto non avvia scansioni aggiuntive.
- Multi-branch e giro di worktree sono stati rimossi: accettare una Proposal la applica sempre nella cartella aperta. Una cartella `.trama/multi-branch/`, un valore di `trama.worktreeAgent` o worktree e branch `trama/*` rimasti da prima non sono letti né eliminati; si tolgono a mano, con git.
- Short numbers: every live Proposal, Task and Drift has a temporary number (`P3`, `T3`, `D3`) beside its permanent eight-character identity. The Board, the panel and the command line show the number while the card is live and the identity only once it is closed, never both; every command that names a card accepts the number (`trama task move T3 doing`) and refuses a wrong letter or a number nobody has; `--json` gives `id` and `number`. Numbers live only in `.trama/short-numbers/assigned` of each working copy (not versioned), and files, branches and instructions to the agent always use the identity. The skills name cards by number and title and write only identities. See [CLI](./docs/cli.md#conventions).
- Four agent skills in [skills/](./skills): `trama-design` (an interview in rounds of questions with recommendations, then a Proposal), `trama-scan` (Model vs code → Tasks and Drifts), `trama-implement` (Task → code; files a Drift when the Model cannot be followed. Asked for one Task it stops there; in a run over several Tasks, Run all To do or Run this design, it takes the Tasks in groups from `trama task next --batch`, skips the blocked ones, goes on past a Drift, and ends with a report of what it implemented, the Drifts it filed and the Tasks left unrun), `trama-import` (existing code → Proposals describing it as it is, with doubts; ADR 0008). `trama init` installs them into `.agents/skills/` (VS Code, Codex, Cursor); `--skills-dir .claude/skills` for Claude Code; `trama skills update` refreshes them and deletes the `trama-fix` skill that earlier versions installed.
- Faster agent runs: `trama task next --batch` gives the group of a parallel run (up to four runnable Tasks that concern different things), which `trama-implement` hands to the agent's own sub-agents in the same folder, then scans the whole System at the end of a clean run; `trama-scan` gives each Machine to a sub-agent and `trama-design` explores with sub-agents. After an approval the automatic scan reads only the Proposal's `## Scan scope` (`trama proposal show`) e si ferma dopo aver archiviato i Task, che il developer avvia dalla Board (per esempio con Run this design). See [CLI](./docs/cli.md).
- Hold scan: uno switch del pannello, accanto a `Design…`, che mette in sospeso le approvazioni fatte dal pannello invece di scansionare dopo ognuna (`Hold scan · N`) e, allo spegnimento, manda una sola scansione di tutte le Proposal in sospeso che toccano ancora una Feature. Le scansioni a mano e le approvazioni dalla riga di comando non toccano il sospeso, che vive in `.trama/scan-hold/` di questa copia di lavoro (non versionata). See [CLI](./docs/cli.md#hold-scan).
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

Una finestra esterna diventa l'ultima riusabile soltanto dopo l'invio riuscito dell'istruzione. Anche se una nuova apertura fallisce o un altro terminale inizia a lavorare, la fine di ogni corsa già avviata continua a rilasciare i suoi Task e ritirare i suoi annunci.
