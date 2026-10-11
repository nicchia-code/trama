---
column: done
technical: true
refs:
  - requirements/tech#task
  - requirements/rules#task
drift: null
proposal: null
agent: false
created: 2026-10-11T09:47:51.715Z
finished: 2026-10-11T10:20:11.544Z
---
# Share the scan scope function between Proposals and finished Tasks

L'ambito della scansione di fine corsa, calcolato da `trama task scope`, deve nascere dalla stessa funzione che calcola l'ambito di scansione di una Proposal, come chiede il Requisito: oggi i Task hanno un calcolo a parte che ripete la ricerca delle Transition che entrano negli elementi nominati o reagiscono a un Evento nominato. A lavoro finito esiste un solo calcolo, usato da entrambi, e a parità di elementi nominati i due ambiti coincidono, comprese le voci che la Proposal assorbe (le Transition e gli Stati dentro uno Stato o una Machine già nominati non compaiono come voci a parte). Il comportamento di `trama task scope` per l'utente non cambia: stesso formato, motivi `changed` e `leads into a change`, ambito vuoto dichiarato con uscita 0, Task inesistente come errore d'uso.
