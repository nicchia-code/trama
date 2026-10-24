---
description: "Usa quando leggi o scrivi le prenotazioni dei file in `.trama/claims/`."
---
# Dati delle prenotazioni dei file

## prenotazione-file
- Le prenotazioni stanno in `.trama/claims/`, locale a questa copia di lavoro e non versionata, con il suo `.gitignore` che ignora tutto (il testo `*`), scritto insieme al primo file, come `.trama/progress/`.
- Un file per file prenotato: `<hash>.json`, dove `<hash>` è lo SHA-256 in esadecimale del percorso del file relativo alla radice del progetto, con `/` come separatore anche su Windows. Contiene `{ path, terminal, agent, ancestors, task, claimedAt, renewedAt }`: il percorso relativo, il `TRAMA_TERMINAL` e l'identità di omp del sotto-agente che lo tiene, le identità dei suoi antenati dalla più vicina, il Task del suo Run e gli istanti ISO 8601 della presa e dell'ultimo rinnovo. `task` c'è solo quando il Run del sotto-agente realizza un solo Task, ed è l'identità permanente di quel Task; manca negli altri Run. Il rinnovo non lo cambia. Nessun altro campo.
- Un file illeggibile o di forma diversa vale come errore di lettura (`rules#prenotazione-file`), non come prenotazione assente.
- Il lock breve che separa controllo e presa è il file di `withFileLock` nella stessa cartella, con le sue regole.
