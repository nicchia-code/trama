---
status: approved
base:
  actors/agent.md: fc89f09f142fa8377cacef04d438bc065eee5c28666b15106c75095312033330
  work/announcement.md: a683761b7a0999aabe54e6de24e9b7e69608199a0f57d74fe8637a895f8d6a36
  editor-panel/panel.md: 258c380b713d67d45d44336e13be8f07e70ba8025ce6ed9516c10d72e49e7d5b
  requirements/ui/ghosts.md: def72fa4dd34f7a23c33b4208c47bcb1b0be706e547a4a4f260b60824517c7da
  requirements/rules/ghost-notes.md: new
  requirements/tech/ghost-notes.md: new
  requirements/data/ghost-notes.md: new
  requirements/cli/ghost-notes.md: new
delete: []
created: 2026-10-22T08:32:47.385Z
label: ghost details
---
# Dettagli dei ghost

Oggi un ghost in System Activities dice solo tipo, titolo e fase: non si capisce cosa stia facendo l'agente né perché. Con pochi token l'agente può dichiarare una nota di una riga a ogni tappa, e un clic sul ghost apre un modale che spiega il ghost e mostra le note.

## Decisioni
- Clic sul ghost: modale con la spiegazione del ghost (testo fisso di Trama per tipo e fase), da quanto è in corso, l'ultima nota in evidenza e al massimo 5 precedenti con l'ora.
- Il modale segue in diretta fase e note; si chiude da solo quando il ghost sparisce.
- Il ghost sulla Board mostra l'ultima nota troncata su una riga sotto la fase.
- L'agente dichiara una nota a ogni tappa del suo lavoro (3–6 per lavoro); i sotto-agenti che confrontano scrivono sul ghost del loro confronto.
- Una nota è una riga di testo semplice, al massimo 120 caratteri; una più lunga si tronca con «…» e il comando lo dice.
- Senza identità la nota va a tutti gli annunci in attesa dello stesso terminale o conversazione, tranne i confronti; un confronto riceve note solo con la sua identità.

## Assunzioni da verificare
- Il comando è `trama announcement edit [<id>]` con `{ note }`, sul modello della dichiarazione di avanzamento dei Task; non conta come lavoro dell'agente e non cambia fase.
- Si conservano 6 note per annuncio (l'ultima + 5); le più vecchie si perdono. Le note restano nel file dell'annuncio, che non è versionato, e spariscono con lui.
- Un ghost senza note (Quick Task, agenti non avviati da Trama, prima della prima tappa) mostra nel modale «No notes from the agent yet.».
- Testi della spiegazione per tipo e fase, layout e icone del modale sono proposte mie (`ui#announcement`).
- Il ghost diventa un pulsante raggiungibile da tastiera; continua a non contare e a non trascinarsi.
