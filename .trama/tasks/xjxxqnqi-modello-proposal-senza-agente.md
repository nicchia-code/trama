---
column: done
technical: false
refs:
  - proposal
  - requirements/data#proposal
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:05:26.767Z
---
# Modello Proposal senza agente

Il modello scelto per una Proposal non è più legato a un agente: omp è l'unico agente e `trama.agent` non esiste più.

Quando è fatto vale che:
- Con `developer.SCEGLI_MODELLO_PROPOSAL` (solo per una Proposal Open che porta Task e non è allegata a un Drift) Trama ricorda soltanto il modello scelto, o lo dimentica se il campo è vuoto; nessun file cambia e la Proposal resta Open. Non si salva più l'agente del momento.
- In `ExtensionContext.workspaceState`, chiave `trama.proposalModels`, ogni voce è esattamente `{ model }`, con `model` non vuoto e senza spazi attorno. Una voce scritta da una versione precedente con il campo `agent` (`omp`, `cursor` o il vecchio `chat`) ha una forma non valida, qualunque sia il suo agente: non si legge, per quella Proposal valgono i ruoli dei Settings, e la scrittura successiva la toglie. Non c'è nessuna migrazione (nemmeno di `chat` in `cursor` o delle voci `omp`).
- Con `developer.REWORK_PROPOSAL`, se l'istruzione di rifare la Proposal non parte davvero, la Proposal resta rifiutata con il suo feedback e l'istruzione, inviata a mano, la rifà lo stesso; il caso non nomina più una chat dove l'istruzione resta pronta né gli appunti: l'istruzione va solo a omp (terminale o omp Chat).

Codice da cambiare (indicazioni):
- `extension/src/host/proposal-models.ts`: togliere `PROPOSAL_AGENTS`, `ProposalAgent` e il campo `agent` di `ProposalModel`; `validEntry` accetta solo le chiavi `model`; `proposalModels` non converte più `chat`; `chooseProposalModel` perde il parametro `agent` e scrive `{ model }`. I commenti che parlano di `trama.agent` vanno aggiornati.
- `extension/src/host/controller.ts`: togliere `proposalAgent()` (righe 82-83) e il suo passaggio a `chooseProposalModel` e alle altre chiamate che lo usano (intorno alle righe 579, 601, 750, 858, 864), lasciando solo ciò che riguarda il modello.
- Nessun testo del rifacimento (controller, avvisi) deve parlare di chat o appunti per il caso non inviato.

Test: aggiornare `test/host-proposal-models.test.ts` perché le voci attese siano `{ model }`, verifichi che una voce con `agent` (anche `omp` o `chat`) sia ignorata e tolta alla scrittura successiva, e togliere i casi della conversione `chat` → `cursor`.
