---
status: approved
base:
  actors/developer.md: d5af55c4587628579de2468ea9510678c6cacee4934413c034c0e69ca9e71871
  requirements/ui/panel.md: 77b402fda1ba3fc549ac51202c802c4ac5c8ac6d104b541f44d575c2795e4596
  requirements/tech/project-panel.md: 0955ef8395bf7d8f72229a1fbe904b6b4aacacaf0c26ec5256ac1964252104e1
delete: []
request: 2026-10-14T03-41-01
created: 2026-10-14T01:57:43.783Z
scanScope:
  - ref: developer.OPEN_PANEL
    reason: changed
  - ref: question-round/Out of sight/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Closed/developer.OPEN_PANEL
    reason: leads into a change
  - ref: panel/Open/developer.OPEN_PANEL
    reason: leads into a change
  - ref: requirements/tech#project
    reason: changed
  - ref: requirements/tech#panel
    reason: changed
  - ref: requirements/ui#panel
    reason: changed
---
# Open Trama icon in the editor title bar

Il developer vuole un'icona visibile in alto, ricavata da trama-icon.png, che apra Trama. La barra del titolo della finestra di Cursor non è estendibile: il posto più vicino è la barra delle azioni dell'editor.

Decisioni dell'intervista:
- Posizione: barra delle azioni dell'editor, in alto a destra di ogni gruppo di schede (come Send to agent); non nella Activity Bar.
- Cartelle: compare in ogni finestra con almeno una cartella aperta, anche senza progetto Trama; lì il clic fa ciò che fa Trama: Open, cioè l'offerta di inizializzare.
- Finestra senza cartelle: l'icona è nascosta.
- Clic con il pannello aperto: lo porta in primo piano tenendo la sua scheda, come Trama: Open; il Modello non cambia comportamento.
- Con il pannello come scheda attiva l'icona resta visibile.
- Sulle schede delle richieste di design sta a destra di Send to agent.
- Grafica: due SVG monocromatici ridisegnati da trama-icon.png, scuro per i temi chiari e chiaro per i temi scuri.
- Il logo compare anche sulla scheda del pannello e come icona dell'estensione (128×128, logo nero su fondo bianco).
- Tooltip e nome accessibile: Open Trama.
