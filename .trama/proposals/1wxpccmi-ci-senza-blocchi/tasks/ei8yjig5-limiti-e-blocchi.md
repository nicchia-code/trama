---
technical: true
refs: [requirements/tech#General]
---

# Limiti e blocchi dei test

Nel workflow della release (`.github/workflows/release.yml`), che usa Bun 1.4.4:

- I job che costruiscono e provano un pacchetto (`package`) hanno `timeout-minutes: 25`; gli altri job (`plan`, `release`) restano a 15.
- Il passo dei test non lancia più `bun test --isolate` direttamente: lo lancia uno script del repository che legge l'uscita della suite e la ripete nel log. Quando la suite non stampa nulla di nuovo per 3 minuti, lo script ferma la suite con tutti i processi che ha avviato (anche su Windows, dove un processo figlio non muore con il padre), stampa il file di test che era in corso (l'ultimo file di cui la suite ha stampato l'intestazione) e termina con un errore, così il passo fallisce. Se la suite finisce da sola, lo script termina con il suo stesso codice di uscita.
- Lo script funziona allo stesso modo su `ubuntu-latest`, `macos-14` e `windows-latest`; un test di `bun:test` prova, con un comando finto, che un'uscita silenziosa oltre il limite ferma il comando e nomina l'ultimo file, e che un comando che finisce passa il suo codice di uscita.

La suite resta come richiede il resto della sezione: nessun test si blocca su nessuna piattaforma, anche con `bun test --isolate`.

`CHANGELOG.md` registra i nuovi limiti e il fermo dei test bloccati sotto la prossima versione.
