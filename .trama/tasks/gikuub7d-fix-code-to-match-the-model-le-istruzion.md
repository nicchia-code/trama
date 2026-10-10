---
column: done
technical: false
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
drift: cz5qn6ny
proposal: null
agent: false
created: 2026-10-10T14:15:26.823Z
finished: 2026-10-10T16:15:23.670Z
---
# Fix code to match the Model: Le istruzioni possono ancora avviare un terminale esterno

## What happens

Il developer può ancora scegliere un terminale di sistema esterno all'editor. Trama rileva il programma, apre o riusa una finestra, avvolge il comando dell'agente e segue la sua fine con marcatori e socket. All'attivazione prepara inoltre una cartella dedicata ai marcatori nell'archivio globale dell'estensione, anche prima che venga chiesta un'istruzione.

## What should happen

Gli unici terminali dell'agente sono quelli integrati nell'editor, nell'area dei terminali o in una scheda. Il terminale esterno è rimosso: nessun rilevamento, comando avvolto, marcatore di fine, socket o sottocartella dedicata nell'archivio globale. Una vecchia impostazione utente resta intatta ma non influenza più l'invio.

## Chosen option

**Eliminare il percorso del terminale esterno**

Rimuovere l'avvio, il riuso e il controllo delle finestre esterne, insieme alle impostazioni e alla preparazione dei loro marcatori. Le istruzioni del terminale usano esclusivamente il terminale integrato scelto dal developer. Non servono più risorse o rilevamenti esterni; chi usava una finestra di sistema passa all'area dei terminali o alla scheda dell'editor.

## Where in the code

extension/src/host/agent.ts: launchExternal, externalOrigin, watchExternalRuns; extension/src/host/main.ts: activate; extension/src/host/external-open.ts; extension/src/host/external-reuse.ts; extension/src/host/external-terminal.ts; extension/package.json
