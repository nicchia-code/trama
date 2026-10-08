---
column: done
technical: true
refs:
  - requirements/tech#General
drift: null
proposal: null
agent: false
created: 2026-10-08T05:29:53.343Z
finished: 2026-10-08T05:31:18.110Z
---
# Support --help for every command

Ogni comando di Trama deve accettare --help e -h in qualunque posizione dopo il nome del comando, mostrare su standard output uso e descrizione, uscire con codice 0 e non avviare altre operazioni né leggere stdin. Gli argomenti non validi di un comando esistente devono produrre il suo errore d'uso, non Unknown command. Documentare il comportamento in docs/cli.md.
