---
column: done
technical: false
refs:
  - developer.REJECT_PROPOSAL
  - developer.REWORK_PROPOSAL
  - requirements/ui#developer.REWORK_PROPOSAL
  - requirements/tech#developer.REWORK_PROPOSAL
  - requirements/cli#General
drift: null
proposal: q51924cv
agent: false
created: 2026-10-22T05:44:18.607Z
finished: 2026-10-22T05:49:50.913Z
---
# Rework: casella e istruzioni

Quando il task è finito, dall'host dell'estensione Rework with feedback su una Proposal funziona così, e `Reject` semplice non chiede più nulla.

- `Reject` dal pannello (scheda in Backlog o dettagli del Diagramma) rifiuta subito, senza aprire `showInputBox` e senza feedback. Il codice del vecchio feedback facoltativo di `Reject` in `extension/src/host/controller.ts` (circa righe 690-703) è tolto.
- Il messaggio `reworkProposal { proposal }` del webview è accettato da `extension/src/host/messages.ts` solo con l'identità di una Proposal in Backlog. L'host apre `vscode.window.showInputBox` con titolo `Rework <numero breve> – <titolo>`, testo `What should the agent change? Leave empty to redo it on the current Model.`, segnaposto `Feedback for the agent` e `ignoreFocusOut: true`. Esc (`undefined`) non fa nulla.
- Testo vuoto dopo `trim()`: finestra modale `vscode.window.showWarningMessage("Rework <numero breve> without feedback? The agent redoes it on the current Model.", { modal: true }, "Rework")`; solo `Rework` prosegue, annullare non fa nulla. Con un testo si prosegue subito.
- Poi l'host ricontrolla le condizioni sul quadro appena letto (Proposal aperta, non allegata a un Drift aperto, nessuna attesa di fine turno; per una risoluzione anche le condizioni di `Resolve`), rifiuta con la stessa funzione di `src/core` usata da `trama proposal move <id> rejected`, con il feedback (vuoto: nessuna sezione `## Feedback`) e il segno `reworkRequested`; se il rifiuto è rifiutato compare `Trama: <motivo>` e non parte nulla.
- Dopo il rifiuto l'host costruisce in `extension/src/host/prompts.ts` l'istruzione secondo il tipo della Proposal rifiutata, con la sua identità permanente:
  - `change`, e `setup` con il Modello che ha già una Feature o un Actor: "Use the trama-design skill to rework the rejected Proposal <id> with the developer's feedback. Bind the first Proposal you open to it with the `reworks` field." (terminale `Design`);
  - `setup` con il Modello senza Feature né Actor: "Use the trama-setup skill to rework the rejected setup Proposal <id> with the developer's feedback. Bind the setup Proposal you open to it with the `reworks` field." (terminale `Setup`);
  - `import`: "Use the trama-import skill to rework the rejected Proposal <id> with the developer's feedback. Bind the first Proposal you open to it with the `reworks` field." (terminale `Import`);
  - `resolution`: "Use the trama-resolve-drifts skill to rework the rejected resolution <id> with the developer's feedback, on the Drifts `<d1>`, `<d2>`. Bind the resolution you open to it with the `reworks` field." con i Drift ancora aperti e fuori da ogni altra risoluzione, nell'ordine della sua lista (terminale `Drifts`); senza nessun Drift così non parte nulla e compare `Trama: <numero breve> was rejected: none of its Drifts is still open.`.
- Ogni istruzione porta sulla stessa riga le frasi dell'istruzione della stessa skill (limite dei sotto-agenti, Context Sharing quando è acceso, lingua) e usa lo stesso launcher di design, setup, import e Resolve Drifts. Il modello è `trama.analysis` per design, setup e import; per una risoluzione è quello che `Resolve` sceglierebbe per il primo Drift raccolto (anche quello della Proposal del suo Task d'origine, quando vale). Il percorso di `Resolve` nell'host, che oggi raccoglie sempre un solo Drift, accetta anche più Drift per questa istruzione: rifiuto, annuncio e segno in risoluzione valgono per ciascuno. Al lancio Trama annuncia una Proposal con il titolo della Proposal rifiutata; per una risoluzione l'annuncio è quello di Resolve Drifts. Se l'istruzione non parte davvero (resta pronta nella chat o va negli appunti) la Proposal resta rifiutata e l'istruzione, inviata a mano, funziona lo stesso.
- L'aiuto di `trama proposal new` e `docs/cli.md` descrivono `reworks` (la Proposal rifiutata che la nuova rifà, mai insieme a `request`); `trama proposal move <id> rejected` accetta ancora `feedback`.
- Tutti i testi dell'interfaccia sono in inglese e non seguono `trama.language`.

Il legame `reworks` in `src/core` (istante di creazione ereditato, `requires` riscritti) e il pulsante diviso del webview sono di altri Task di questa Proposal: qui si usano.
