---
column: done
technical: false
refs:
  - panel/Open/workspace.MODEL_CHANGED
drift: null
proposal: null
agent: false
created: 2026-10-10T11:28:25.578Z
finished: 2026-10-10T14:22:17.371Z
---
# Show the error when Hold scan is on and a Proposal file cannot be read during a panel refresh

Quando i file cambiano mentre il pannello è aperto, se i file non si possono leggere il pannello deve mostrare l'errore e ogni scheda tiene il suo ultimo quadro.

Oggi questo non vale quando **Hold scan è acceso** e un file di una Proposal non si può leggere (per esempio un `proposal.md` con dati non validi): la lettura dell'interruttore Hold scan, fatta prima di costruire il quadro e fuori dalla gestione degli errori, fallisce e l'aggiornamento si interrompe senza che il pannello riceva alcun errore. Le schede tengono l'ultimo quadro, ma il developer non vede perché.

Quando è fatto: in questo caso, come per ogni altro file illeggibile, il pannello mostra l'errore e le schede tengono il loro ultimo quadro; lo stesso vale per gli aggiornamenti dovuti al round di domande e alla risoluzione dei Drift.

Riferimento nel codice: `extension/src/host/controller.ts`, `refresh()` riga 220 (`noteSwitch()` prima del `try` di riga 221), che chiama `readScanHold` → `listProposals` in `src/core/scan-hold.ts` riga 99.
