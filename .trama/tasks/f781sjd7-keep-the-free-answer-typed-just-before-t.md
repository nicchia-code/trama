---
column: done
technical: false
refs:
  - question-round/In view/developer.CLOSE_PANEL
  - question-round/Asking
  - requirements/tech#question-round
  - requirements/rules#question-round
drift: null
proposal: null
agent: false
created: 2026-10-07T17:47:11.771Z
finished: 2026-10-07T17:54:47.616Z
---
# Keep the free answer typed just before the panel closes

Il testo scritto nello spazio della risposta libera, e non ancora confermato, deve restare nel round anche se il developer chiude il pannello subito dopo aver scritto.

Oggi il testo arriva all'host con un breve ritardo e viene spedito subito solo quando il campo perde il focus o il developer compie un'azione sull'overlay. Se il pannello si chiude mentre il ritardo è in corso (per esempio con la scorciatoia da tastiera che chiude la scheda, con il cursore ancora nel campo), le ultime lettere scritte non arrivano mai all'host e, riaprendo il pannello o con Reopen, la domanda mostra il testo senza di esse.

Fatto quando:
- chiudendo il pannello in qualunque modo subito dopo aver scritto, riaprendolo la domanda mostra tutto il testo scritto, fino all'ultima lettera;
- il testo continua ad arrivare all'host mentre si scrive con un breve ritardo, come dice il Requisito tecnico;
- il testo resta comunque non confermato: non arriva all'agente finché il developer non conferma la domanda.
