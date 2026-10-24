---
column: done
technical: false
refs:
  - agent-terminal/Agent running
  - question-round
  - requirements/tech#agent-terminal/Agent running
  - requirements/tech#agent-launching
  - requirements/tech#question-round
drift: null
proposal: hu8j2if3
agent: false
created: 2026-10-24T19:20:12.461Z
finished: 2026-10-24T19:22:05.310Z
---
# Overlay senza auto-background

Oggi, in omp Chat, una conversazione di un lavoro con l'hook (per esempio un design) si chiude con `trama.autoExit` acceso, o va a riposo con `trama.autoExit` spento, mentre il suo round di domande è ancora aperto: il round finisce Interrupted e il developer perde le risposte. La causa è lo strumento bash di omp: con `bash.autoBackground.enabled` acceso (il default di omp 18.12, soglia `bash.autoBackground.thresholdMs` di 60000 ms) sposta in background ogni comando che dura più di 60 secondi, anche con `timeout: 0`, quindi `trama question new` smette di tenere occupato il turno, omp risponde al prompt del lavoro e l'host lo conta come `omp-acp.TURN_ENDED`. Nel terminale non succede, perché l'hook manda il riposo con `session_stop`, che aspetta i job asincroni.

Quando il Task è finito:

- `launchOverlay` (`extension/src/host/terminal-agent.ts`) mette sempre `bash: { autoBackground: { enabled: false } }` nell'overlay, scritto con `stringify` della libreria `yaml` come le altre parti; l'overlay non è mai più vuoto, quindi `undefined` resta solo per l'overlay che non si può scrivere (`writeLaunchOverlay` in `extension/src/host/agent.ts`, che non ferma mai il lancio).
- Ogni lancio con l'hook, nel terminale e in omp Chat (design, Setup, rifacimento di una Proposal, import, scan, Run e ogni Run di una sequenza per modello, Resolve Drifts, Unify Drifts, raffinamento), porta `--config <overlay>` con quella chiave, insieme a `disabledExtensions` e alle parti degli advisor quando ci sono, come prima.
- Ask more e General non cambiano: niente hook, niente overlay, niente `--config`.
- Con la chiave nell'overlay, il round di un lavoro aperto in omp Chat tiene occupato il turno finché il developer risponde, e la conversazione non si chiude né va a riposo prima della fine del round.
- Va verificato con omp 18.12.6, ed è un criterio di accettazione, che `--config` con `bash.autoBackground.enabled: false` prevalga sulle configurazioni utente e di progetto anche nel processo ACP (`omp ... acp`) e nei sotto-agenti, e che un comando bash che dura più di 60 secondi resti in primo piano.
- `CHANGELOG.md` dice che i lavori di Trama non mandano più in background i comandi bash lunghi, così un round di domande in omp Chat non si chiude più a metà.

Test `bun:test` in `test/host-terminal-agent.test.ts`: l'overlay senza advisor né esclusioni contiene solo `bash.autoBackground.enabled: false`; con esclusioni e con l'Advisor Scanner contiene anche quelle parti; la riga di comando di un lavoro con l'hook porta sempre `--config`; quella di Ask more non lo porta.
