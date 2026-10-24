---
status: approved
base:
  agent-launching/raffinamento.md: 23bf4455c0aabfd0eee712e0351d9a790e8056c514a498a86412050ebfce9798
  agent-launching/feature.md: b3068b669a071f683c2303b8101cd250a145f4a72c548503aecfcf9dee3a285f
  actors/developer.md: b769fbedbc2b59d7d93a983e3670b537f765b4d4152cc76c74205afb9842a617
  editor-panel/panel.md: 66f43dbdec9636b4152d42705b513f4ac879058a0b0fee8f46760afa6167444d
  model-changes/proposal.md: f5166077672b56e5712b943c704018b76180429f6b3fab18577ef54eaea5ea0f
  requirements/rules/raffinamento.md: 14b0826510e01dd2228ba9fc901cd22c7e355a57e2389784c7f55c544e13403e
  requirements/rules/decisions.md: 8d6d52b25e469efaee180e61cae6c36fa0fa151a164f08ee48bbb52832a2cb19
  requirements/ui/raffinamento.md: 98880d0d44b7482b0e734be04a40a11216245f5fa48f109ad0273f0eb0f25b96
  requirements/ui/board.md: 03737c4bb73a819dfd5f1b37be11c602bd8c8618f66416a664f359e2715c0560
  requirements/ui/unify-drifts.md: 2ce99ee34c5a007435e523b9a1a82c9a8ec48f96aa8a5f0aa6fbbe22f6e482d9
  requirements/ui/general.md: 03d2e4aa96128343cdc907a0abaf164bfcd7070c0fbdabbca52cb1c5a5628f71
  requirements/ui/panel.md: 394b451c79551077c3558786c7dd46285e6ec28f5565254a1df91a4f21b45c90
  requirements/tech/raffinamento.md: 7e70efb756faccd9297e61144b104270cde83e95d7d173c62d783466ac66d6a0
  requirements/tech/unify-drifts.md: ac49c429650cf67319b1f9c4d816e3ed7118d2d7d01ef0901c49f3b734df8180
  requirements/data/raffinamento.md: 2ebc43dadd2e5035aef5188af1710da1f5c04beb521b122820592effbf8fcca6
  requirements/quality/raffinamento.md: 057e3faaaef39b4dfa9d45e65fdfad569819cd9b99a7a8e4bcd300068540450a
delete: []
request: 2026-10-24T17-46-27
created: 2026-10-24T15:53:53.107Z
label: Refine All
---
# Refine All

La voce `Refine All` nel menu della freccetta di `+ Add Work Item`, sotto `Unify Drifts`, rende attuali in un clic tutti i design obsoleti: li raffina sul Modello di adesso e li approva, come Approve su ciascuna scheda `to refine`. Per la velocità il raffinamento lavora in parallelo per catene indipendenti invece che una Proposal alla volta.

## Decisioni
- Posto: seconda voce del menu della freccetta di `+ Add Work Item`, sotto `Unify Drifts`, senza icona né tooltip.
- Impostazione: la voce c'è sempre; con Auto-update Stale Proposals spenta è disabilitata con il motivo `Turn on Auto-update Stale Proposals in Settings`.
- Esito: ogni Proposal raffinata da Refine All è poi approvata, come con Approve.
- Velocità: in parallelo per catene indipendenti; le Proposal che condividono file o sono legate da `requires` stanno nella stessa catena e vanno in sequenza.
- Posti: gli N posti di `trama.maxParallelAgents` si dividono fra i raffinamenti come per Run all in parallelo.
- Una sola coda: anche le Proposal messe in coda con Approve seguono le catene in parallelo.
- Proposal che aspettano una Proposal richiesta: incluse, partono quando quelle sono approvate durante lo stesso lavoro; altrimenti tornano `to refine`.
- Draft rimaste a metà di un raffinamento: incluse.
- Run in corso: Refine All resta disponibile; le approvazioni aspettano la fine del Run come oggi.
- Annullare: lanciato Refine All, la voce diventa `Cancel Refine All`, cliccabile 2 secondi dopo; svuota tutta la coda, Approve singoli compresi; i raffinamenti in corso finiscono. La voce torna `Refine All` quando nulla aspetta di partire.
- Conteggio: l'etichetta è `Refine All (<n>)`.
- Testi: quelli proposti nel round (descrizioni accessibili e motivi in inglese).
- Badge `queued`: dice il motivo vero dell'attesa (catena, Proposal richiesta, posti pieni).

## Assunzioni
- Le catene si ricalcolano a ogni partenza dai file che le Proposal toccano in quel momento; una Proposal che torna obsoleta alla fine del suo raffinamento rientra in coda come oggi.
- Dentro una catena l'ordine è quello delle dipendenze (prima le Proposal richieste), poi quello del Backlog.
- Un raffinamento tiene i suoi posti fino alla fine: una catena che diventa pronta quando i posti sono tutti tenuti aspetta che un raffinamento finisca. Chi parte insieme si divide i posti liberi in parti uguali.
- Approve singolo resta indisponibile durante un Run, come oggi; solo `Refine All` fa partire raffinamenti durante un Run.
