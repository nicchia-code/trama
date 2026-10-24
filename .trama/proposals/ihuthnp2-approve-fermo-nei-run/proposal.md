---
status: approved
base:
  model-changes/proposal.md: a341c0e90b75585283ad343c43cf7ab5d6f02344d17b895f1fa49ec89b250764
  agent-launching/raffinamento.md: 77376a459b494a7b88ea378d09da94104db186cdc4f414d3c1177b08c6ca97bb
  requirements/rules/decisions.md: 419ba7447f01f914a08d938a4bde7e21daaca5a247edfbdeb213cddfad9d6933
  requirements/rules/raffinamento.md: 729d4889e1a9f9f97d305d75ae15028a08e290cdad7070e6cf0bbf9232369897
  requirements/ui/raffinamento.md: 323f717b58fa0757a9b30beb481bcaa26b59c65c33994f98581fadb147e474b0
delete: []
created: 2026-10-24T08:10:42.703Z
label: Approve e Run
---
# Approve fermo nei Run

Oggi approvare una Proposal non è bloccato da un Run in corso, e il Run prende anche i Task che nascono mentre lavora. Con più design approvati durante i Run, i loro Task entrano in una corsa già partita: il piano dei gruppi e le prenotazioni non li avevano previsti, e il Modello cambia sotto i sotto-agenti che hanno già letto il testo dei loro Task. Con Approve fermo durante un Run, ogni Run lavora su un Modello che non cambia finché non finisce.

## Decisioni

- Finché un Run lanciato da questa finestra è in corso, Approve è indisponibile, anche quello che avvia o riprende un raffinamento.
- Un raffinamento che finisce durante un Run non approva subito: l'approvazione aspetta la fine del Run.

## Assunzioni da verificare

- Il motivo sul pulsante è `A run is in progress`, lo stesso di Clear; l'host rifiuta con lo stesso motivo un'approvazione che arriva comunque.
- Accettare la Proposal allegata a un Drift si fa solo dalla riga di comando, quindi non è toccato; la Proposal raffinata che aspetta il Run ha sulla scheda il badge `waiting for the run`, e riaprire l'editor dimentica l'attesa (la Proposal resta Open e si approva con Approve).
- Alla fine del Run Trama approva la Proposal raffinata che aspettava solo se è ancora Open e non è bloccata; se nel frattempo è tornata obsoleta rientra nella coda dei raffinamenti, come oggi.
- La riga di comando non conosce i Run della finestra e non è bloccata: `trama proposal move <id> approved` resta com'è.
- Un Run di un'altra finestra non blocca, come per gli altri blocchi dei Run.

## Already present

- `proposal/Draft/agent.SUBMIT_PROPOSAL` — `src/core/proposals.ts`, `submitProposal`: la consegna che porta la Proposal in Open non cambia.
- `proposal/Draft/drift-resolution.PREPARED_RESOLUTION_WRITTEN` — `src/core/resolution.ts`: la consegna della risoluzione preparata non cambia.
