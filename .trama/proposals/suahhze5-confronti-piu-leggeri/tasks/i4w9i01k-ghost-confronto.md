---
refs:
  - announcement
  - agent.FILE_COMPARISON
  - requirements/rules#announcement
  - requirements/data#announcement
  - requirements/tech#announcement
  - requirements/ui#announcement
---
# Ghost del confronto

Un annuncio può essere un confronto: nasce già Comparing quando chi confronta una Machine chiede il briefing, con il titolo `Comparing <titolo della Machine>`, e arriva (Delivered, senza avviso) quando chi confronta archivia in un solo passo le schede trovate, anche nessuna. Se una scheda del blocco non è valida non arriva nulla e l'annuncio resta Comparing. Una Draft che chi confronta comincia per un suo Drift nominando il confronto si lega al confronto, che non cambia titolo né stato, e non ha un ghost a sé. Ritirato per hook a riposo, fine del comando, chiusura del terminale o fine e interruzione del turno della chat, dà l'avviso delle schede non consegnate.

Fatto quando:
- il file dell'annuncio ha `kind: comparison`, `source: agent`, `machine` e `proposals` come dice `data#announcement`, senza `phase`, `job` né `proposal`;
- `trama proposal new --announcement <id di un confronto>` aggiunge la Draft a `proposals` del confronto senza creare un annuncio;
- il ghost mostra il tipo `Compare`, il titolo e nessuna riga di fase, con il nome accessibile `Agent comparing the code: <title>`, e l'avviso di ritiro è `The agent finished without delivering Compare <title>.`;
- un confronto non conta per la barriera della delega dei Drift, non porta esito e non cambia il ricordo dell'ultimo scan;
- la sincronizzazione del titolo con una Draft non tocca mai un confronto.
