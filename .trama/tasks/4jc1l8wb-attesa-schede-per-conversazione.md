---
column: done
technical: false
refs:
  - panel/Board
  - requirements/rules#panel/Board
  - requirements/tech#panel/Board
drift: null
proposal: n97kq4ls
agent: false
created: 2026-10-21T11:33:12.145Z
finished: 2026-10-21T11:36:21.211Z
---
# Schede in attesa per conversazione

`trama proposal move <id> open`, `trama drift new`, `trama task new` e `trama comparison move <id> delivered`, quando riescono, mandano all'editor sul canale locale la provenienza di ogni scheda: `TRAMA_TERMINAL` quando c'è, altrimenti `chat` con la `conversation` di `TRAMA_CHAT` quando c'è. L'estensione tiene, per finestra, le schede in attesa con il loro terminale, la loro conversazione o la chat del progetto: una scheda consegnata da una conversazione, o da un suo sotto-agente, aspetta soltanto la fine, l'interruzione o la chiusura (`AGENT_STOPPED`, `AGENT_INTERRUPTED`, `CONVERSATION_CLOSED`) di quella conversazione; una scheda `chat` senza conversazione aspetta quelle di una qualunque conversazione di Trama del progetto, come oggi. Una scheda non aspetta, e i suoi pulsanti seguono le regole di prima, quando arriva dalla sua conversazione e quella non ha un turno in corso, oppure arriva senza terminale né conversazione e nessuna conversazione di Trama del progetto ha un turno in corso, oltre ai casi già previsti (terminale senza hook, editor diverso). L'attesa resta senza timer e non sopravvive alla chiusura dell'editor; i segnali ripetuti non cambiano nulla.
