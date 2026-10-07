---
column: done
technical: false
refs:
  - panel/Board
  - panel/Diagram
  - requirements/ui#drift
  - requirements/ui#General
drift: null
proposal: 37d8rz9w
agent: false
created: 2026-10-07T17:04:37.119Z
finished: 2026-10-07T17:17:38.832Z
---
# Show the attached Proposal inside the Drift comparison

Nel confronto di un Drift (dettagli nel Diagramma e scheda della Board) la Proposal allegata vive dentro il Drift.

- La colonna «What happens» mostra, fra il suo testo e il Keep this, un riquadro con l'intestazione `Attached Proposal`: numero breve e titolo della Proposal, l'elenco dei file che cambia con i conteggi come nella scheda di una Proposal (stesso limite e stessa riga `and N more files`), e i pulsanti `View diagram` e `View requirements`, ciascuno solo quando la Proposal cambia il Modello o i Requisiti, che aprono quella vista con la Proposal disegnata. Niente Approve né Reject nel riquadro.
- Riquadro e Keep this sinistro stanno nella stessa cornice, riconoscibile anche dall'intestazione e non solo dal colore; il riquadro resta nella colonna «What happens» anche quando le colonne si impilano. I collegamenti a sé stanti «Proposal … attached» della scheda non servono più.
- Con una Proposal allegata ancora in scrittura il riquadro mostra numero e titolo e la riga `Being written by the agent` al posto dei file, senza pulsanti View.
- La riga sotto il Keep this sinistro, con una Proposal approvabile, dice «Accepts Proposal P3: the Model changes to match».
- La riga sotto il Keep this destro aggiunge in fondo `; Proposal P3 is rejected`, oppure `; Proposal P3 is discarded` quando la Proposal è ancora in scrittura.
- Ogni numero mostrato segue la regola generale: numero breve se la scheda ne ha uno, altrimenti l'identità permanente, con il tooltip e il nome accessibile che li distinguono.
