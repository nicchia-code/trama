---
technical: false
refs:
  - panel/Settings
  - requirements/quality#panel/Settings
---

# Nessun output di omp nell'errore, solo il percorso o l'exit code

Il motivo che la scheda Settings riceve per un errore di omp è sempre un testo fisso: il percorso usato per `ENOENT`, la scadenza, oppure il codice di uscita. Stdout e stderr di omp non entrano in `error`, nel webview né in un log, anche quando l'uscita è un errore. Il PATH passato a omp contiene solo la cartella di `trama.ompPath` o quella di bun, in testa al PATH dell'editor; nessuna altra cartella viene cercata.
