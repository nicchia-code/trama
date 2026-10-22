---
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#announcement
---
# Dettagli dei ghost sulla Board

Sulla Board ogni ghost di System Activities mostra l'ultima nota dell'agente e si apre in un modale di dettagli.

Quando il Task è finito:
- Il ghost è un pulsante raggiungibile da tastiera, con la riga dell'ultima nota sotto la fase, troncata su una riga con il testo intero come tooltip; continua a non contare e a non trascinarsi.
- Cliccarlo, o premerlo con Invio o Spazio, apre un modale solo da leggere con tipo, titolo, da quanto è in corso, la spiegazione del ghost secondo tipo e fase, l'ultima nota in evidenza e le precedenti con l'orario, oppure «No notes from the agent yet.».
- Il modale segue in diretta fase e note, si chiude da solo quando il ghost sparisce o il pannello si chiude, e chiuso dal developer rimette il fuoco sul ghost.
- Aspetto, testi e accessibilità seguono `ui#announcement`; il modale usa il `Dialog` già presente e la logica pura (spiegazioni, durata) sta in `board/logic.ts` con i suoi test, come dice `tech#agent.DECLARE_ANNOUNCEMENT_NOTE`.
