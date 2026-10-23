---
status: approved
base:
  editor-panel/panel.md: 4eb1e683e4554f02bd47f99084fe7f9a07dccd053228d4776fcdb812a27cb91e
  editor-panel/feature.md: 186e78a495cff47b615691e647cc26a9ec0fc8052a6a17952808948d30a911e6
  editor-panel/focus.md: b09d975bdb018fe8cb450339370d67aad2e25e5397feb69bb2c170cb398ab9a4
  editor-panel/menu-laterale.md: new
  work/task.md: 510df13c237fb329d44345338e0d04e73f111f12f02c295070f77c057d888d34
  work/voce-history.md: bc675791c7118f0bc43429598e9bad114ce1135307b2d9a6623e8eaba7606c38
  work/feature.md: e7fd90f47424465ea56e9b1da60513ed5ec3abb7d345570193e3d24fe9b4abf9
  actors/developer.md: ea4bf3e590b416e373aa88bdce056feb70c801b33220764233326d901da55d0b
  project-setup/project.md: fc97c02a4ecb76e46f07357393fe271ec36e4cc7f7518ecd6404ae0abec345d7
  agent-launching/feature.md: 9808f8bb29a32cc78060e2517f09365b234e4ba4a4d2a625564f50eaa51049f5
  requirements/ui/panel.md: e466f96f4426831293e98c8b8269cd7dc095d21150e77696e8354ee37b23fbf9
  requirements/ui/menu-laterale.md: new
  requirements/ui/board.md: 3ed4f04ea8d90037bad334d506c996c791cbb585e4ce19e883a27823dcbf6865
  requirements/ui/history.md: 7476a022d909ad97e6374800282685d59e6a932319d09643309146fd9d4d9955
  requirements/ui/focus.md: d3f1c44df676fa691e46a4250bdc0249743441110d99215f533ae143b1fe4b3f
  requirements/ui/ask-more.md: cbb5eb1e93fa678db345ab090a2ed5dec556d9dcfebea8c39c364137e9110b82
  requirements/ui/tasks.md: c4a9c9350e5340121dc0f7208004fd801b77c52940763315ad138071f9eeb5eb
  requirements/ui/get-started.md: ff5a9dc9a37641657b69171b36f50373b1a89509fd824e2e243568b8dd60d9aa
  requirements/ui/settings-specs.md: bdf3dca602ecd5bfa7f32eddaff022db0ef3de598f994aeda1d819fb8671f452
  requirements/ui/ghosts.md: dc457a71f6eb54e11a65fd50d9c965e42d3b5fa89ce3c57ba9c24acdf3332493
  requirements/tech/panel.md: f5782ce7ddb65fd71074565d98bace6fbeb8098325905672ec801fed0c171ba6
  requirements/tech/history.md: af29636be8a49e7de35429563a95a1d603870ad03d82e10293604d40619f587b
  requirements/tech/settings.md: 56b155b9ad978456c720ef0de467bf2a3744fe7e7453ecdfc8f4209ebefeb579
  requirements/tech/project.md: fc2c849e693d1249cf0d6751f0b89be92f8f4dc36798fe7f8df4c435db559030
  requirements/tech/omp-chat.md: a9f073f26bba3cb1ac8374baa05d9f092e122576ac5aa9eca58d79e47d075c41
  requirements/tech/announcements.md: 9be3367f410ece2f1001c0b559aae48c90cce3724119785299449f3161922384
  requirements/data/work.md: 32cb9569e2079f6eb3437c18a359bf2e433708f2e7f681260e9761de90166d11
  requirements/rules/turn-history.md: cb15fd9bd006998d1be34e9e1a866dca6454432987d034499f45d833b6094efd
  requirements/tech/menu-laterale.md: new
  requirements/data/history.md: new
delete: []
request: 2026-10-23T20-40-20
created: 2026-10-23T19:02:47.914Z
label: Menu laterale
---
# Menu laterale e colonna Done

# Menu laterale e colonna Done

La navigazione del pannello passa nella barra laterale primaria dell'editor, la History diventa una vista del pannello e, sulla Board, la colonna History lascia il posto a una colonna Done che il developer svuota con Clear.

## Decisioni

- La vista di Trama nella barra laterale diventa un menu disegnato da Trama (Machine Menu laterale): Board, Diagram, Requirements, Specs e History; poi `Scan System`; in fondo Settings.
- Il pannello non ha più la barra delle schede: si naviga dal menu laterale, dai collegamenti delle schede e da nuovi comandi della palette (`Show Board`, `Show Diagram`, `Show Requirements`, `Show Specs`, `Show History`, `Show Settings`). Il titolo della scheda dell'editor resta il nome del Sistema.
- Nel menu è evidenziata la voce della vista mostrata dal pannello aperto; a pannello chiuso nessuna.
- `Scan System` sta solo nel menu laterale, con il suo numero e la disattivazione con l'Advisor Scanner; la barra della Board lo perde; il `Scan` del Diagramma resta com'è.
- Settings è una voce del menu; il pannello non ha più la rotella.
- La History è una vista del pannello a tutta larghezza, aperta dalla voce History: voci con periodo e gruppi per giorno come oggi; il clic su tutta la voce apre i dettagli e la «i» sparisce.
- La Board è la vista di partenza in ogni apertura che oggi parte dal Diagramma: apertura ordinaria, round di domande, dopo la creazione del progetto, dopo conferma o annullamento del wizard con il Modello vuoto, quando la cartella diventa un progetto da fuori.
- L'icona di Trama è nella barra delle attività in ogni finestra, anche senza cartelle. Senza cartella la vista mostra una frase, `Open Folder` e Settings (che apre il pannello sulle sole impostazioni); in una cartella non Trama il menu ha solo Get Started e Settings.
- Il numero di ciò che aspetta una decisione sta sulla voce Board e come badge sull'icona di Trama.
- La Board ha le colonne Backlog, Active e Done. Done mostra ogni Task in Done, il più recente prima, raggruppato per giorno, anche quelli chiusi senza modifiche (badge `unchanged`); è collassata a ogni apertura del pannello; le sue schede hanno pallino, numero, titolo, tag, ora di fine (come la History di oggi) e chip, e il clic apre i dettagli del Task con Ask more.
- In fondo a Done, `Clear` con l'icona `Trash2`, senza conferma, cancella per sempre i file dei Task della colonna; disattivato con `Nothing to clear` quando non c'è nulla da togliere e con `A run is in progress` durante un Run lanciato da Trama; solo nel pannello, nessun comando.
- Clear lascia in Done un Task nominato da un Drift aperto (badge `kept`, `Kept while Drift <numero> is open`).
- Prima di cancellare un Task, Clear ne scrive una copia (titolo, tag, data di fine, riferimenti) in ogni voce di History che lo cita; i dettagli della voce lo mostrano dalla copia con il segno `cleared`.
- Il numero di `Scan System` conta ancora i Task cancellati da Clear finiti dopo l'ultimo scan globale.
- Sulla scheda di un Task attivo sparisce `Open`, senza spostarlo altrove; `View on diagram`, `View requirements` e `Run` restano. `Show details` non c'era già più.
- I dettagli dei ghost restano come sono: ogni ghost li apre già al clic.

## Already present
- `question-round/Out of sight/developer.OPEN_PANEL` — `extension/src/host/controller.ts:551-560` (`offerReopen`, Reopen riapre il round o apre soltanto il pannello), comportamento che non cambia
- `setup-wizard/Closed/developer.OPEN_PANEL` — `extension/src/webview/getstarted/index.tsx:39-41` (Get Started monta il wizard dal primo passo), comportamento che non cambia
