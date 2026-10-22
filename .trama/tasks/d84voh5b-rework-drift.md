---
column: done
technical: false
refs:
  - developer.REWORK_DRIFT
  - developer.FIX_DRIFT_CODE
  - requirements/ui#developer.REWORK_DRIFT
  - requirements/tech#developer.REWORK_DRIFT
  - requirements/rules#developer.REWORK_DRIFT
drift: null
proposal: q51924cv
agent: false
created: 2026-10-22T05:44:18.607Z
finished: 2026-10-22T05:46:23.022Z
---
# Rework di un Drift

Quando il task è finito, Rework with feedback dalla freccetta di `Dismiss Drift` (scheda rossa in Backlog e dettagli del Drift nel Diagramma) fa risolvere quel solo Drift all'agente seguendo il testo del developer, senza chiuderlo.

- Il messaggio `reworkDrift { drift }` è accettato da `extension/src/host/messages.ts` solo con l'identità di un Drift aperto che ha la sua scheda rossa. È disponibile solo quando lo sono sia `Dismiss Drift` sia `Resolve`: Drift aperto e fuori da ogni risoluzione, nessuna attesa di fine turno dell'agente che lo ha registrato, nessun Run lanciato da Trama in corso, nessun agente di risoluzione al lavoro, nessuna domanda pronta aperta e nessuna risoluzione in scrittura o aperta senza `prepared: true`. L'host lo ricontrolla come per il messaggio `resolveDrifts`.
- L'host apre `vscode.window.showInputBox` con titolo `Rework <numero breve> – <titolo>`, testo `How should the agent resolve this Drift? Leave empty to resolve it as Resolve does.`, segnaposto `Feedback for the agent`, `ignoreFocusOut: true`; Esc non fa nulla. Testo vuoto dopo `trim()`: modale `Resolve <numero breve> without feedback?` con il pulsante `Resolve`; annullare non fa nulla.
- L'istruzione, costruita in `extension/src/host/prompts.ts`, è quella che `Resolve` manda oggi per quel Drift (in `prompts.ts`: "Use the trama-resolve-drifts skill on the open Drift <id>, and on no other open Drift: …"), seguita sulla stessa riga, quando c'è un feedback, dalla frase "The developer's feedback on how to resolve it: \"<feedback>\"" con il feedback senza spazi attorno; con la casella vuota è esattamente quella di `Resolve`. Porta le stesse frasi di `Resolve`, il terminale `Drifts`, lo stesso modello che `Resolve` sceglierebbe per quel Drift (anche quello della Proposal del suo Task d'origine, quando vale) e l'annuncio di Resolve Drifts; le virgolette per la shell restano quelle di `extension/src/host/quote.ts`.
- Rework non usa mai la domanda pronta del Drift, anche quando è valida: lancia sempre l'agente. Nessuna Proposal è rifiutata o scartata e il Drift resta aperto, segnato `Resolving` come dopo `Resolve`; è raccolto solo se l'istruzione parte davvero.
- La skill `trama-resolve-drifts` (in `skills/`), quando l'istruzione porta un feedback, lo prende come indicazione del developer su come risolvere il Drift: registra la decisione che il feedback indica e chiede in un round di `trama question new` solo le decisioni che il feedback lascia aperte (per esempio quale Fix option, se il feedback non lo dice).
- Dal pannello un singolo Drift si può dunque chiudere con `Dismiss Drift` oppure far risolvere con `Resolve` o con Rework with feedback; tenere ciò che dovrebbe succedere resta solo dalla riga di comando.
- I testi dell'interfaccia sono in inglese e non seguono `trama.language`.

Il pulsante diviso del webview e lo stato della risoluzione in corso sono di altri Task di questa Proposal: qui si usano.
