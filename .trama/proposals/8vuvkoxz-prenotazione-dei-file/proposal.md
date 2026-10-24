---
status: approved
base:
  agent-launching/prenotazione-file.md: new
  actors/agent.md: bbd9d7a69fd85640532922480b52f0216198a01e342fb757cc689fb733c14ed9
  actors/agent-hook.md: 73f36e5a02574e8f9393bae1de183a8ae007a2ee926e00a85bb95f586a6396f4
  work/task.md: eee2b5c6d442d95a691e8311099feb28afd09335ccae77f88b8d494230ffe1da
  requirements/rules/prenotazioni.md: new
  requirements/tech/prenotazioni.md: new
  requirements/data/prenotazioni.md: new
  requirements/tech/agent-hooks.md: 8be82edb6ba0a45e5ee3d58df9a0b07b3adaa9d2a81fb0362f5aaf1aced2a1f9
  requirements/rules/models.md: d12697cea03f1b7fdf2caac6e426d1eba1ebb5c776687a4feaeb61c3242c12d7
  requirements/tech/work.md: 2f75529758e0ce7c8de5f274cdac61849d54a97274ae047fd80e77860031c368
delete: []
created: 2026-10-24T07:54:14.055Z
label: Prenotazioni
---
# Prenotazione dei file

In un Run i sotto-agenti lavorano nella stessa cartella. Trama non dà mai insieme due Task che riguardano la stessa cosa del Modello, ma Task diversi finiscono spesso negli stessi file (per esempio `controller.ts`, `docs/cli.md`, il manifest dell'estensione), e oggi la regola dei conflitti dipende dal sotto-agente che se ne accorge da solo. Con più design in esecuzione insieme questi casi crescono. La prenotazione dei file dà un segnale certo al momento della scrittura: il primo sotto-agente che scrive un file lo tiene fino alla fine della sua corsa, e un altro che prova a scriverlo è fermato prima di scrivere.

## Decisioni

- Le prenotazioni stanno in file dentro `.trama/claims/`, cartella della copia di lavoro ignorata dal controllo di versione, come `progress/` e `announcements/`.
- Un sotto-agente la cui scrittura è bloccata si ferma subito: lascia il Task In progress senza annullare nulla e torna all'agente principale, che lo riassegna quando il Task di chi tiene il file è Done.
- L'agente principale controlla le prenotazioni ma non prenota.
- Le prenotazioni valgono in ogni Run, con Parallel Execution accesa o spenta.

## Assunzioni da verificare

- Valgono solo nei Run (un Task chiesto per nome e Run all, sequenze per modello comprese): design, scan, import e risoluzioni non scrivono codice e non prenotano.
- Gli strumenti guardati sono quelli con cui omp scrive i file (`write`, `edit`, `apply_patch`, `ast_edit`); un comando della shell che scrive un file non si vede.
- Un sotto-agente avviato da chi tiene il file può scriverlo; gli advisor di omp non prenotano e non sono fermati.
- Una prenotazione scade dopo 2 ore senza scritture di chi la tiene; ogni sua scrittura la rinnova.
- La fine del lavoro di un terminale (hook a riposo, fine del comando, chiusura, controllo di esecuzione) cancella tutte le prenotazioni di quel terminale.
- Se la prenotazione non si può leggere o scrivere (per esempio un errore del disco), la scrittura è bloccata con un messaggio che lo dice: meglio un sotto-agente fermo che due sullo stesso file.
- Fuori da Parallel Execution l'agente principale tratta il sotto-agente fermato come con Parallel Execution, ma non registra il conflitto nei tempi.
