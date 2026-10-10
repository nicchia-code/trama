---
status: resolved
resolution: fix-code
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
proposal: null
task: gikuub7d
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:49:00.365Z
---
# Le istruzioni possono ancora avviare un terminale esterno

## What happens

Il developer può ancora scegliere un terminale di sistema esterno all'editor. Trama rileva il programma, apre o riusa una finestra, avvolge il comando dell'agente e segue la sua fine con marcatori e socket. All'attivazione prepara inoltre una cartella dedicata ai marcatori nell'archivio globale dell'estensione, anche prima che venga chiesta un'istruzione.

## What should happen

Gli unici terminali dell'agente sono quelli integrati nell'editor, nell'area dei terminali o in una scheda. Il terminale esterno è rimosso: nessun rilevamento, comando avvolto, marcatore di fine, socket o sottocartella dedicata nell'archivio globale. Una vecchia impostazione utente resta intatta ma non influenza più l'invio.

## Fix options

### Eliminare il percorso del terminale esterno

Rimuovere l'avvio, il riuso e il controllo delle finestre esterne, insieme alle impostazioni e alla preparazione dei loro marcatori. Le istruzioni del terminale usano esclusivamente il terminale integrato scelto dal developer. Non servono più risorse o rilevamenti esterni; chi usava una finestra di sistema passa all'area dei terminali o alla scheda dell'editor.

### Ripristinare il terminale esterno nel design

Cambiare Modello e Requisiti per ammettere esplicitamente un terzo luogo di esecuzione, descrivendone fine del lavoro, chiusura, focus e gestione delle risorse locali. Conserva l'esperienza delle finestre esterne, ma mantiene marcatori e socket e richiede una nuova decisione sul ciclo di vita invece della loro rimozione approvata.

## Where in the code

extension/src/host/agent.ts: launchExternal, externalOrigin, watchExternalRuns; extension/src/host/main.ts: activate; extension/src/host/external-open.ts; extension/src/host/external-reuse.ts; extension/src/host/external-terminal.ts; extension/package.json
