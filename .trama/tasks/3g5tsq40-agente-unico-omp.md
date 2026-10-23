---
column: done
technical: false
refs:
  - agent-launching
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/ui#agent-launching
  - requirements/quality#agent-launching
  - requirements/rules#work
  - requirements/tech#work
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T18:24:01.338Z
---
# Agente unico omp

Trama lavora soltanto con omp, l'unico agente, in VS Code con l'estensione; omp è anche l'unica fonte dei modelli. Alla fine:

- Esiste un solo programma omp, risolto da un'unica funzione dell'host a ogni uso: `trama.ompPath`, tolti gli spazi attorno, quando non è vuota, altrimenti `omp` cercato nel `PATH` dell'editor. Lo usano la riga di ogni terminale dell'agente (Quick e Ask more compresi), dove entra citato per la shell al posto della parola `omp` che `extension/src/host/terminal-agent.ts` scrive oggi, il processo di ogni conversazione di omp Chat (`extension/src/host/omp-chat/client.ts`), `omp models --json` (`extension/src/host/model-lists.ts`) e la verifica di omp del wizard.
- `trama.ompPath` resta `scope: "application"`; con `trama.terminalLocation`, `trama.autoExit`, `trama.maxParallelAgents` e i ruoli si legge solo dalle impostazioni utente, e il percorso di omp entra nella riga di comando solo citato per la shell (`extension/src/host/quote.ts`).
- Nessun codice sceglie o calcola un agente: niente `trama.agent`, niente modello passato alla chat di Cursor (`modelConfig`, `openCursorChat`), niente definizione utente `~/.cursor/agents/trama-analysis.md` né `trama-advisor.md` (`extension/src/host/chat-sub-agent.ts` sparisce; la definizione `trama-advisor` di `src/core/sub-agents.ts` sparisce, resta `trama-analysis` per omp in `.omp/agents/`). La cancellazione della definizione utente di Copilot (`~/.copilot/agents/trama-analysis.agent.md`) resta com'è. Ciò che le versioni precedenti hanno scritto per Cursor non si tocca.
- Il modello di una Proposal, quando c'è, sostituisce il ruolo della corsa senza nessun confronto con un agente (`appliedProposalModels`, `proposalRunModel` in `extension/src/host/proposal-models.ts`, `extension/src/host/run-groups.ts`); `--slow` usa sempre `trama.scan`.
- La sequenza per modello di `Run all` passa al Run successivo alla fine normale del precedente (hook a riposo, fine del comando con codice 0) e si ferma per chiusura del terminale mentre l'agente lavora, codice diverso da 0 o assente, controllo di esecuzione, istruzione che non parte, chiusura dell'editor: nessun segnale della chat di Cursor.
- Le frasi delle istruzioni (sotto-agenti, Parallel Execution, Sub-agents Context Sharing, Advisor Scanner) non dicono più «con ogni agente»; la frase dell'Advisor Scanner è solo quella di omp: "The Advisor Scanner is on: skip the pre-flight and the targeted end-of-run scan; the omp advisor checks the code against the Model during the run." La variante per la chat di Cursor (`ADVISOR_CHAT_SENTENCE` in `src/core/advisors.ts`) sparisce, e con lei i paragrafi dell'Advisor della chat nella skill `skills/trama-implement/SKILL.md` e le frasi «in a terminal and in Cursor's chat alike» di `trama-implement`, `trama-scan` e `trama-import`.
- L'Advisor Scanner vale come oggi con omp; l'advisor è sempre quello di omp, e il segno del Run (`TRAMA_ADVISOR_SCANNER`) resta l'unico modo con cui l'advisor riconosce un Run.
- Il contatore dei Task finiti dall'ultimo scan globale si azzera quando l'istruzione dello scan è scritta nel terminale o mandata alla conversazione di omp Chat (`requirements/tech#work`); non esiste più una consegna alla chat o agli appunti.
- I testi delle impostazioni (`requirements/ui#agent-launching`) dicono che non c'è nessuna scelta dell'agente; il nome di un modello si scrive come lo accetta omp.

Test da aggiornare o togliere: i casi con `trama.agent` uguale a `cursor` in `test/host-agent-terminals.test.ts`, `test/host-terminal-agent.test.ts`, `test/host-run-groups.test.ts`, `test/skills.test.ts` (frasi della chat di Cursor nella skill implement); un test prova che la riga del terminale usa `trama.ompPath` citato quando è impostata e `omp` quando è vuota.
