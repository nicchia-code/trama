---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-09T21:03:57.222Z
finished: 2026-10-09T21:09:17.833Z
---
# Count the agent's trama classify as read-only activity in the quiet period of announcements

Quando l'agente riconosciuto da Trama (da un terminale avviato da Trama, con `TRAMA_TERMINAL`, o come agente della chat di Cursor) esegue con successo `trama classify` durante lo smistamento di una scansione, questo conta come attività di sola lettura: fa ripartire i quindici minuti di quiete di ogni annuncio in attesa, come già fanno `trama system`, `trama machine` o `trama search`. I Requisiti nominano esplicitamente `trama classify` fra questi comandi.

Oggi `trama classify` non viene mai riferito all'editor come attività, quindi una scansione che passa molto tempo a smistare le Machine con il classificatore non tiene vivi i ghost e i controlli in attesa.

Fatto quando:
- `trama classify` lanciato dall'agente riconosciuto, e riuscito, fa ripartire la quiete di tutti gli annunci in attesa, senza scrivere i file degli annunci né il loro `touched`;
- lo stesso comando lanciato dal developer nella sua shell non conta;
- senza editor non succede nulla in più e il comando non fallisce per questo.
