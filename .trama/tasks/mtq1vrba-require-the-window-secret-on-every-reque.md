---
column: done
technical: false
refs:
  - question-round
  - requirements/data#question-round
  - requirements/tech#question-round
drift: null
proposal: iyil1j92
agent: false
created: 2026-10-11T17:07:03.744Z
finished: 2026-10-11T17:19:03.178Z
---
# Require the window secret on every request to the editor

Ogni finestra dell'editor genera, a ogni avvio, un segreto casuale con un generatore crittografico e lo scrive nel proprio record di discovery, fuori dal repository. Il segreto non compare mai sotto `.trama/`, nei log, nelle variabili d'ambiente dei terminali né nelle risposte che l'editor manda a chi si connette (oggi l'editor risponde al primo messaggio rimandando indietro l'intero record). La riga di comando lo legge sempre dal record dell'endpoint che usa, anche quando l'endpoint arriva da `TRAMA_QUESTION_ENDPOINT`, e lo porta in ogni richiesta all'editor: domande di `trama ask`, messaggi del coordinatore, hook di Cursor e Copilot, attività e fine lavoro dell'agente. Su ogni piattaforma una richiesta senza il segreto giusto non riceve nessuna risposta e la connessione si chiude; un record senza segreto non identifica un editor raggiungibile. Oggi il record contiene solo progetto, finestra, endpoint e recenza del focus e nessuna richiesta porta un segreto.
