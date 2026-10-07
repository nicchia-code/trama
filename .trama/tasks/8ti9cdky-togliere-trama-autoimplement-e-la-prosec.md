---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/proposal.APPROVED
  - scan-hold/On/developer.TURN_SCAN_HOLD_OFF
  - requirements/rules#agent-terminal
  - requirements/rules#scan-hold
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: njq3tp0k
agent: false
created: 2026-10-07T05:30:47.433Z
finished: 2026-10-07T05:55:26.129Z
---
# Togliere trama.autoImplement e la prosecuzione con i Task dalle scansioni automatica e in sospeso

La scansione automatica dopo un'approvazione e la scansione in sospeso allo spegnimento di Hold scan si fermano sempre dopo aver archiviato i Task: l'istruzione inviata all'agente non chiede mai di proseguire con trama-implement, qualunque cosa ci sia nelle impostazioni dell'utente.

Quando è fatto:
- L'istruzione della scansione automatica è esattamente "Use the trama-scan skill on what Proposal <id> changed: …" con la frase che lega i Task, senza la parte "If the scan files no Drift, go on with the trama-implement skill …"; lo stesso per l'istruzione con più Proposal in sospeso (e con una sola è identica alla scansione automatica).
- L'estensione non dichiara più l'impostazione `trama.autoImplement` né la sua descrizione, e non la legge più; un valore rimasto nelle impostazioni utente è ignorato e non viene riscritto.
- I test delle istruzioni descrivono solo la scansione che si ferma, senza la variante che prosegue con i Task.
