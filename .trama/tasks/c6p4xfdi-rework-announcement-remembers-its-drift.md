---
column: done
technical: false
refs:
  - announcement/Announced/drift.CODE_FIX_CHOSEN
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - announcement
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:03:52.372Z
finished: 2026-10-07T17:13:48.405Z
---
# Rework announcement remembers its Drift

L'annuncio che Trama fa quando il developer chiede di rifare la Proposal obsoleta di un Drift deve ricordare quel Drift. Oggi è un annuncio di Proposal qualunque: non sa di quale Drift è, e tenere ciò che dovrebbe succedere su quel Drift non lo tocca, così il ghost resta finché l'agente non consegna o non scadono i quindici minuti, e poi dà l'avviso.

Fatto quando:
- l'annuncio di un rifacimento porta il campo `drift` con l'identità del Drift; gli altri annunci, e quelli scritti prima, non lo hanno e restano leggibili;
- quando il developer tiene ciò che dovrebbe succedere su quel Drift (dal pannello o dalla riga di comando), l'annuncio del rifacimento è ritirato subito e senza avviso; gli annunci di rifacimento di altri Drift restano;
- la consegna della nuova Proposal consegna l'annuncio del rifacimento, come oggi; gli altri ritiri (fine del comando, chiusura del terminale, quiete, avvio dell'editor, chat di Cursor) restano quelli di sempre;
- la Snapshot espone al pannello il Drift dell'annuncio, così il suo ghost può essere disegnato dentro quel Drift invece che in To decide.
