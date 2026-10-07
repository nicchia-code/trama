---
status: approved
base:
  work/drift.md: a7e2bc1ee0c03a4bbfb2e42bff5d56ef3fec039b1739bffe0dce01bbae798ca4
  model-changes/proposal.md: 127cecf1a7553eee7399611762586478c1d5ce14ef3fd3bf9600946cf9f66340
  work/announcement.md: 7489ffe877ddfddfdbff0dbac91348cf93b4710f08d1a237aba285624a93646b
  editor-panel/panel.md: 3df17d41f49d91574d1a816af1d96b20b76c541bd0d82f52928deb39c792ebc6
  actors/developer.md: aade38a37446ac93ab6b6045390c6c4eeae84e5e0b84320bd0fb0fea7ac218bf
  requirements/ui/work.md: 4f3f978f9d194bf1df0f3595101b7ec314bd322dd038b79c7ffbce0a2ee6f970
  requirements/rules/decisions.md: 31c0d844f286784a98fb60bdcb4de1a408ac1507349aecc2eb4f5986b7102b74
  requirements/rules/tasks.md: 9cd349ee2276d9899aef23adcf018c52d46707d7854e6629d33538bf76bc07d4
  requirements/rules/announcements.md: new
  requirements/rules/agent-terminal.md: 607ab44cd370018bced4aae076eb1b4d61db8281083506696e3c39578530b37e
  requirements/data/work.md: 71b9b573c6c967a716191f3466589a5b086bf2da4cd9cb3b954c631e31e7cca3
  requirements/tech/work.md: 867edd038d7421875dcb563ed8dc89d0125bee8d2e890593b21cd3067f3b8cfc
  requirements/tech/announcements.md: b86114a4fdea90e0ab23860cc5a8108ade6b569074f4d8b3c10d7a8779361252
  requirements/ui/panel.md: 41395cd3d6f8d847cbc8885e3cdb2168bc1ea626c871b2a0d4f331b2b3d793ed
delete: []
created: 2026-10-07T16:51:17.351Z
scanScope:
  - ref: developer.APPROVE_PROPOSAL
    reason: changed
  - ref: developer.REJECT_PROPOSAL
    reason: changed
  - ref: developer.FIX_DRIFT_CODE
    reason: changed
  - ref: panel/Diagram
    reason: changed
  - ref: panel/Board
    reason: changed
  - ref: proposal
    reason: changed
  - ref: proposal/Draft/drift.CODE_FIX_CHOSEN
    reason: changed
  - ref: proposal/Open/developer.APPROVE_PROPOSAL
    reason: changed
  - ref: proposal/Open/developer.REJECT_PROPOSAL
    reason: changed
  - ref: proposal/Open/drift.CODE_FIX_CHOSEN
    reason: changed
  - ref: proposal/Rejected
    reason: changed
  - ref: announcement
    reason: changed
  - ref: announcement/Announced/agent.SUBMIT_PROPOSAL
    reason: changed
  - ref: announcement/Announced/drift.CODE_FIX_CHOSEN
    reason: changed
  - ref: announcement/Preparing/agent.START_PROPOSAL
    reason: changed
  - ref: announcement/Writing
    reason: changed
  - ref: drift
    reason: changed
  - ref: drift/Open/developer.FIX_DRIFT_CODE
    reason: changed
  - ref: drift/Open/agent.REPLACE_DRIFT_PROPOSAL
    reason: changed
  - ref: drift.CODE_FIX_CHOSEN
    reason: changed
  - ref: panel/Open/developer.SHOW_DIAGRAM
    reason: leads into a change
  - ref: panel/Open/developer.SHOW_BOARD
    reason: leads into a change
  - ref: proposal/Open/drift.PROPOSAL_REPLACED
    reason: leads into a change
  - ref: requirements/data#task
    reason: changed
  - ref: requirements/data#announcement
    reason: changed
  - ref: requirements/rules#agent-terminal
    reason: changed
  - ref: requirements/rules#announcement
    reason: changed
  - ref: requirements/rules#drift
    reason: changed
  - ref: requirements/rules#proposal
    reason: changed
  - ref: requirements/tech#announcement
    reason: changed
  - ref: requirements/tech#drift
    reason: changed
  - ref: requirements/tech#proposal
    reason: changed
  - ref: requirements/ui#General
    reason: changed
  - ref: requirements/ui#drift
    reason: changed
  - ref: requirements/ui#proposal
    reason: changed
---
# Attached Proposal lives inside its Drift

Quando un Drift porta una Proposal, quella Proposal è parte del Drift: non si decide da sola, si vede dentro la scheda del Drift e tenere un lato del Drift la decide. Oggi invece compare come scheda autonoma in To decide, si può approvare o rifiutare a parte lasciando il Drift senza via d'uscita, e resta aperta quando il codice viene corretto.

Decisioni prese nell'intervista:
- Board: la Proposal allegata a un Drift aperto non ha una scheda propria e non conta fra ciò che aspetta una decisione; vive dentro la scheda del Drift.
- Decisione: approvarla o rifiutarla direttamente è rifiutato, dal pannello e dalla riga di comando, con il messaggio di decidere sul Drift.
- Tenere «What should happen»: la Proposal allegata aperta è rifiutata in automatico con il feedback «Drift <id> resolved by fixing the code».
- Contenuto: nella colonna «What happens», sopra il Keep this, un riquadro «Attached Proposal» con numero, titolo, file cambiati e i pulsanti View diagram / View requirements; la riga sotto il Keep this diventa «Accepts Proposal P3: the Model changes to match».
- Arrivo: un solo ghost, quello del Drift; l'agente archivia il Drift con la Draft allegata e poi consegna la Proposal, che non è mai visibile da sola.
- Diagramma e Requisiti: la Proposal allegata resta nel selettore con il suffisso «· D3»; i suoi dettagli non hanno Approve/Reject ma un link «Decide on Drift D3».
- Riga di comando: `trama board` la elenca rientrata sotto il suo Drift; `proposal list` e `proposal show` dicono «attached to D3»; `proposal approve/reject` la rifiutano indicando `drift resolve`.
- Allegare: solo una Proposal Draft o aperta, non già allegata a un altro Drift aperto, sia alla creazione del Drift sia nel rimpiazzo.
- Rifacimento: il ghost sta dentro il Drift («Being reworked»); l'agente allega la nuova Draft al Drift appena la crea e solo dopo la consegna.

Scelte mie, da controllare:
- Tenere «What should happen» con una Draft allegata la scarta (è una bozza mai finita) invece di rifiutarla; nuovo Event `drift.CODE_FIX_CHOSEN`, che ritira anche senza avviso il ghost di un rifacimento di quel Drift.
- La Draft di un Drift si lega all'annuncio del Drift (`proposal new --announcement <annuncio del Drift>`), così non nasce un ghost di Proposal a sé; il ghost del Drift mostra allora la fase «Writing the Proposal».
- L'annuncio di un rifacimento ricorda il Drift (nuovo campo `drift`), così il suo ghost si disegna nel Drift fin dall'inizio. Con il launcher della chat non c'è annuncio di Trama: il ghost a sé della Draft dura solo fino al suo aggancio al Drift.
- Un Drift già risolto non trattiene più la sua Proposal: una Proposal rimasta aperta di un Drift chiuso in passato torna una scheda autonoma.
- Il frammento `rules/tasks.md` supera 12 KB con le aggiunte: la sezione `announcement` passa, senza cambiarne il testo esistente, al nuovo frammento `rules/announcements.md`.
