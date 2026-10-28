---
status: rejected
base:
  requirements/ui/menu-laterale.md: d516c4e99f07836ec16c41b54d103f095b892f7c0bcd40a100d7653f4766b75b
  requirements/tech/menu-laterale.md: 657bd90d49af5bfbbf4532a025cbef5550cf4af55d07d0162c2401a0bc0c8cd4
  requirements/ui/raffinamento.md: ba563e30ac62d8aab9d8ff17c331ccfcff745cfa14dc342222be49b342e55124
  requirements/rules/focus.md: e583432914b898fc97f295b0b3f0121571e806ced3ce62d9a5c597bb8a96e6b8
  requirements/rules/omp-chat-general.md: dfa1d931baa71310520c18295cb6f50e4fe20656ba826d80cde75cfc38044304
  requirements/ui/omp-chat.md: ce2b5b67c7ab9afbfe99919eb1db5a2dffe706612865e9b85103ee2d63370744
  requirements/tech/omp-chat-general.md: 54c9ee928935a3ced7626678420160debf50082b95d1252f647eba60a95097ef
  requirements/tech/history.md: 79ab7a4e37a108e85d6c7a119bdfbc096d5c623f99afb10402fb63861f639f7e
  requirements/rules/project.md: ea8244a70d2ca67348099fd85d7b49da3c1735225e5a1d001411692716c52186
  agent-launching/omp-chat-general.md: 31456a10d8c00ff00c985d2e0272d5cf36055a3d42ca5f21412ec5f8165c5468
  model-changes/proposal.md: 1786693b60308ed745cf42daff95ba152f04b6acae5a7978f0e25695d4120af6
  team/issue.md: 8f912d5aa8f410c59696bb98b89c66544ff84bab5e77e8fb8b1b9c754197939a
delete: []
created: 2026-10-27T07:30:58.288Z
label: Unify Drifts
---
# Modello come il codice

Modello e Requisiti dicono ciò che il codice fa oggi, per tutte le differenze del Drift unificato: soglia della modalità solo icone del menu a 72 px; avvisi del raffinamento come notifiche dell'editor e non sulla Board; riferimenti a sezioni senza elemento contati fra i mancanti nel Diagramma; riga di sessione nuova anche dopo una ricarica con la sessione di General non riaperta; dettaglio di una voce di History con il `Dialog` del pannello; divisione di un issue bloccata mentre un Run di questa finestra è in corso; esito della pubblicazione di un issue registrabile anche da Not published; nessuna pulizia delle tracce di Copilot nella regola del progetto.

Due differenze sono contraddizioni fra Modello e Requisiti, che nessuna correzione del codice può chiudere: il Modello non dice che la divisione di un issue aspetta la fine di un Run, mentre il Requisito sì; la regola del progetto chiede la pulizia delle tracce di Copilot, mentre la regola di tecnologia la esclude. Per questo il Drift non ha Fix options.

## Feedback

Drift 2pdnq92f resolved by Proposal 3b2ri2b3
