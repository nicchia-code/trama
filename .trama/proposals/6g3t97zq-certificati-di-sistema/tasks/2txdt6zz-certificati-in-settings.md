---
refs:
  - panel
  - requirements/ui#panel/Settings
  - requirements/ui#developer.REFRESH_SYSTEM_CERTIFICATES
---
# Certificati in Settings

Quando il Task è finito, la scheda Settings mostra e governa la modalità System Certificates, usando il modulo dell'host del Task «Export dei certificati» (export, bundle, variabili, messaggio `systemCertificates`, comando e testo degli errori di certificato); se quel Task non è ancora fatto, va fatto prima.

- Nel gruppo `omp`, ultima dopo `trama.language`, l'impostazione `trama.systemCertificates` con titolo `System Certificates`, una `Checkbox` spenta di default e la descrizione «On: omp and your agent's commands trust the certificates your system trusts, for proxies that inspect HTTPS. Replaces `NODE_EXTRA_CA_CERTS`, `SSL_CERT_FILE` and similar variables.». Si salva come le altre, subito, nelle impostazioni utente.
- Accenderla esporta subito il bundle; quando l'export finisce, e ogni volta che si spegne, Trama rifà in silenzio la verifica di omp, lo stato dei fornitori e i suggerimenti dei modelli.
- Solo con la casella spuntata, sotto la descrizione, una riga di testo secondario con lo stato del bundle e, a destra sulla stessa riga, il pulsante `Refresh`:
  - export in corso: lo spinner dello stato di omp e «Exporting system certificates…»;
  - pronto: `CircleCheck` nel colore di successo e «<N> certificates, exported <date and time>.»;
  - fallito con un bundle precedente: `TriangleAlert` nel colore degli avvisi e «Could not export the system certificates (<reason>). Using the ones exported <date and time>.»;
  - fallito senza bundle: `TriangleAlert` e «Could not export the system certificates (<reason>). omp gets no certificates from Trama.».
  `<date and time>` è l'ora in cui è stato scritto il bundle in uso, nella forma breve della lingua dell'editor.
- `Refresh` (`developer.REFRESH_SYSTEM_CERTIFICATES`) è un piccolo pulsante outline con l'icona lucide `RefreshCw` e nome accessibile `Refresh system certificates`; manda `refreshSystemCertificates`; durante un export è disabilitato con il tooltip «Exporting system certificates…». A fine export, riuscito o no, Trama rifà in silenzio la verifica di omp, e il wizard, se aperto, si aggiorna allo stesso modo. Quando la riga non sta, il pulsante va a capo sotto il testo, allineato a sinistra; nulla si sovrappone da circa 300 px.
- La riga si legge a parole, è collegata alla casella con `aria-describedby` e annuncia i cambi con `aria-live="polite"`.
- Il riquadro dello stato di omp e la riga d'errore dell'elenco dei modelli mostrano il testo dell'errore di certificato, con il punto finale, quando l'host lo manda come motivo.
- Tutti i testi in inglese, senza seguire `trama.language`.
- Test dei componenti con `bun:test` e happy-dom: riga e pulsante presenti solo con la casella spuntata, i quattro stati, pulsante disabilitato durante l'export, messaggio mandato al clic.
