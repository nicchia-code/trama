---
column: done
technical: false
refs:
  - agent-questions
  - requirements/cli#General
  - requirements/rules#General
  - requirements/tech#General
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:08:23.255Z
---
# Comandi e documenti senza Cursor

La riga di comando, le skill e la documentazione non conoscono più Cursor come agente o come editor. Alla fine:

- Gli hook della riga di comando sono due, `trama hook idle` e `trama hook start <pid>`. `trama hook cursor` non esiste più (`src/cli/commands/hook.ts`: il comando `cursor`, `runCursorHook`, `sendWatched`; `HOOK_COMMANDS`), e come ogni comando sconosciuto esce con 2 e un errore d'uso, senza comparire in `trama --help`, `trama hook --help` o `docs/cli.md`. `trama advisor review` non esiste più (`src/cli/commands/advisor.ts`); `trama advisor show` resta com'è.
- Una decisione del developer (`proposal approve`, `proposal reject`, `proposal discard`, `drift resolve`, `task take-back`, `ids rewrite`) eseguita da un agente si riconosce solo con `TRAMA_AGENT=1`: `CURSOR_AGENT` non conta più (`agentVariable` in `src/cli/main.ts`, `src/cli/context.ts`, `CURSOR_AGENT_ENV` in `src/core/announcements.ts`).
- Le skill di Trama, in ogni lavoro, fanno chiedere al developer solo con il round di Trama: vietano per nome soltanto lo strumento `ask` di omp e il round scritto nella conversazione (Feature agent-questions); nessuna skill nomina `AskQuestion`, `AwaitShell`, `CURSOR_SANDBOX` o la chat di Cursor.
- Il pacchetto Windows si prova con `trama.exe --help`, `project new` e `model check`; il passo `hook cursor` con `{}` sparisce da `.github/workflows/release.yml`, insieme alla nota di rilascio sulla forma degli hook di Cursor su Windows. L'anteprima di Windows finisce dopo la verifica manuale di `docs/uat.md` con VS Code e omp.
- Una nuova ADR in `docs/adr/` (la prossima numerazione libera, `0013`) registra la scelta di supportare solo omp in VS Code: cosa esce (Cursor come editor, la chat di Cursor con i suoi hook e l'Advisor della chat, `trama.agent`, `CURSOR_AGENT`) e perché. `0010-cursor-chat-agent-is-the-agent.md`, `0011-cursor-chat-and-omp-only.md` e le parti di `0012-acp-returns-for-omp-chat-only.md` che riguardano Cursor ricevono in testa una riga che rimanda alla nuova; 0004 e 0006 non si toccano.
- `CHANGELOG.md` registra sotto `## Unreleased` la rimozione di Cursor (`trama.agent`, `trama hook cursor`, `trama advisor review`, la vista di omp Chat nel pannello in basso), omp Chat accesa per default e `trama.ompChatApproval`. `README.md` dice che servono VS Code e omp e non nomina più Cursor come editor o agente; `CONTRIBUTING.md` non toglie più `CURSOR_AGENT` dall'ambiente dei test e parla dell'estensione di VS Code; `docs/cli.md` si rigenera con `bun run docs:cli` e perde le sezioni «Cursor hooks» e «Advisor rounds»; `docs/model-format.md` non descrive più il titolare `cursor` né i campi `chat`/`conversation`; `docs/uat.md` perde la sezione «R. Cursor» e i passi che provano Cursor.

Test: `test/help.test.ts` e `test/cli-registry.test.ts` non elencano più `hook cursor` né `advisor review`; `test/advisor.test.ts` perde la parte di `review`; nessun test toglie o imposta `CURSOR_AGENT`.
