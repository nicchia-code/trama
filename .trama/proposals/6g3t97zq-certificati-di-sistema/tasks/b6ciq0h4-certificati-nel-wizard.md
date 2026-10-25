---
refs:
  - setup-wizard
  - requirements/rules#setup-wizard
  - requirements/ui#setup-wizard/omp
---
# Certificati nel wizard

Quando il Task è finito, il passo `omp` del wizard di setup ha la modalità System Certificates, così chi lavora dietro un proxy che ispeziona HTTPS la accende prima che la verifica di omp blocchi `Next`. Usa il modulo dell'host del Task «Export dei certificati» e il componente della riga di stato e di `Refresh` del Task «Certificati in Settings»; se non sono ancora fatti, vanno fatti prima.

- `trama.systemCertificates` è l'ultima chiave del passo `omp` (dopo `trama.language`), con lo stesso componente della scheda Settings: `Checkbox`, descrizione, riga di stato del bundle e `Refresh` solo con la casella spuntata nel passo.
- Il valore del passo vale subito, anche prima della conferma, per ciò che il passo stesso avvia: la verifica di omp con il suo aggiornamento, il terminale di installazione e i terminali di login. `agentCheckWanted`, `installOmp` e `ompLogin` mandati dal wizard portano in più `systemCertificates?: boolean` con il valore del passo, validato da `parseToHost` come booleano quando c'è; senza, vale l'impostazione salvata.
- Spuntare la casella nel passo, quando il bundle manca o ha più di 24 ore, manda `systemCertificatesExport`, e a fine export il passo verifica omp di nuovo con il bundle; toglierla verifica omp di nuovo subito, senza bundle. `Refresh` nel passo (`developer.REFRESH_SYSTEM_CERTIFICATES` → omp), solo con la casella spuntata e nessun export in corso, esporta di nuovo e a fine export, riuscito o no, il passo verifica omp di nuovo; le scelte del wizard restano.
- Il valore si salva con le altre scelte alla conferma e compare nel riepilogo come le altre impostazioni del passo; annullare il wizard lascia il valore salvato com'era, e ogni altro processo di Trama segue solo il valore salvato. Il bundle esportato dal passo resta su disco anche dopo l'annullamento.
- Lo stato della verifica usa come motivo il testo dell'errore di certificato quando l'host lo manda: «<text>. Trama cannot work without omp.» con omp che non risponde, e «Could not update omp (<text>). omp <version> answered with <N> models.» dopo un aggiornamento fallito.
- Test con `bun:test`: la chiave nel passo `omp` e nel riepilogo, i campi `systemCertificates` dei tre messaggi con la casella spuntata e no, la nuova verifica dopo l'export e dopo averla tolta, `parseToHost` per il campo nuovo.
