---
created: 2026-10-18T07:32:06.736Z
updated: 2026-10-18T08:11:10.948Z
summary: "La finestra dei dettagli di una voce di History mostra titolo e data completa, resta modale anche quando la Board si aggiorna o la voce cambia posto, e non si ridisegna a ogni aggiornamento: scorrimento e fuoco restano dove sono finché il contenuto non cambia."
tasks:
  - r174qdoy
  - u5n144hu
  - jdtjzcek
---
# Modale della voce di History

Mentre la finestra dei dettagli è aperta, la Board non ne ricostruisce più il corpo a ogni aggiornamento. Il testo letto conserva la sua posizione di scorrimento e il fuoco resta sul pulsante Close. La finestra si ridisegna solo quando titolo, data, testo o Task della voce cambiano davvero.
