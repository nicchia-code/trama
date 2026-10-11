---
column: done
technical: false
refs:
  - drift-resolution/Free
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-11T09:09:16.036Z
finished: 2026-10-11T09:20:36.407Z
---
# Take the automatic collection's snapshot at the real send

I Drift di una raccolta automatica devono essere fotografati nel momento in cui l'istruzione parte davvero, e la raccolta deve ricordare esattamente quelli. Oggi l'elenco viene fissato quando il coordinatore decide di avviare la raccolta, prima della prenotazione e dell'attesa del proprio turno di invio, mentre l'istruzione inviata nomina soltanto quelli che a quel momento sono ancora ammissibili. Un Drift che nel frattempo non lo è più (risolto a mano, modificato, escluso, o critico dopo il passaggio da yolo a enabled) non viene dato all'agente ma resta nella raccolta, e quando l'agente finisce viene segnato come fallito con «No authorized automatic fix decision was submitted», con il badge di autopilota fallito, pur non essendo mai stato affidato. Deve essere vero a fine lavoro: la raccolta ricorda i Drift dell'istruzione realmente inviata, quelli non più ammissibili al momento dell'invio restano fuori senza fallimento, e una raccolta che a quel punto resta vuota non parte.
