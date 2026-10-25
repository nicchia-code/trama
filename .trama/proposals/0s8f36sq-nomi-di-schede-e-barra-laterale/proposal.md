---
status: approved
base:
  editor-panel/panel.md: 8a403cd449dd94b58518088e7b574e3b44dcec8cd106d6dee97d87694987dd4c
  editor-panel/menu-laterale.md: df644fc11d06a21bf61583b3feeaa546b517361fdea2014acae274c9af0dc946
  requirements/ui/panel.md: faf90d3c91846541c9090af437b9815e50ce6eb9978e21e8540be547e48276c4
  requirements/ui/get-started.md: 1126fd15f34b1f4a86038885148a4ad5e7f9038083e736a56ea4e3556eb85d45
  requirements/ui/menu-laterale.md: b769624a3c55b0197455c3ad331a9a12fc6df3b9ed70b30ca806094b71922304
  requirements/tech/menu-laterale.md: aef9cd84ae608b59fbe0d3f8f2907c37fd4f1c79809149b7770812093b3e062c
  requirements/tech/panel.md: ebf395ae6f1e685fb817cda1f5c0e4b8c963f2ecf7035e6e94c6bcf05f149e73
delete: []
request: 2026-10-25T09-39-34
created: 2026-10-25T08:44:54.229Z
label: Titoli schede
---
# Nomi di schede e barra laterale

La richiesta scritta chiede che a sinistra, nella barra laterale aperta dall'icona della barra delle attività, compaia il nome del progetto invece di Trama, e che la scheda del pannello nell'editor porti il nome della vista mostrata (per esempio Board) invece del nome del progetto.

Decisioni:
- Il nome del progetto va nel titolo della vista di Trama nella barra laterale: l'intestazione diventa `TRAMA: <NOME>`. Il tooltip e il nome accessibile dell'icona nella barra delle attività restano `Trama`, perché VS Code non permette di cambiarli mentre gira.
- Il nome del progetto è il nome del Sistema del Modello, con il nome della cartella del progetto come ripiego quando il Modello manca, non si legge o non ha un nome; segue il Modello quando cambia.
- Fuori da un progetto Trama (senza cartelle o in una cartella che non è un progetto) l'intestazione resta soltanto `TRAMA`.
- La scheda del pannello porta solo il nome della vista che mostra, con le stesse parole del menu laterale: Board, Diagram, Requirements, Specs, History, Settings, Get Started; cambia a ogni cambio di vista. Il nome del Sistema sparisce dalla scheda.
- Con il wizard Guided setup aperto dentro Settings la scheda resta `Settings`; in una finestra senza cartelle, dove il pannello mostra solo le impostazioni, la scheda è `Settings`.
