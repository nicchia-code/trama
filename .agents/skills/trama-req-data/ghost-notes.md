# Requirements: Dati, Note dei ghost

Usa quando tocchi il campo delle note negli annunci e nel quadro della Board.

## agent.DECLARE_ANNOUNCEMENT_NOTE

- Il file `announcements/<id>.md` ha nel front matter `notes`, una lista di al massimo 6 oggetti `{ at, text }`, dalla più vecchia alla più nuova: `at` è l'istante UTC ISO 8601 in cui la nota è arrivata, `text` la nota già ridotta a una riga e al più a 120 caratteri. Assente o vuota quando non ci sono note; un valore che non è una lista, o una voce senza `at` o `text` validi, si ignora come se mancasse, senza rendere illeggibile l'annuncio. Nessun altro campo cambia quando arriva una nota.
- Il quadro della Board porta per ogni annuncio `notes` nella stessa forma (lista vuota quando non ce ne sono) e `announced`, l'istante in cui l'annuncio è nato, per la durata del modale. Le note restano locali come il resto della cartella `announcements/`, mai versionate, e spariscono con il file dell'annuncio.
