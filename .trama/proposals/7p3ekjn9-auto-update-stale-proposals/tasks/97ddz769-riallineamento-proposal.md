---
technical: false
refs:
  - proposal
  - requirements/rules#proposal
  - requirements/data#raffinamento
---
# Riallineamento della Proposal

Il core e la CLI devono supportare il riallineamento di una Proposal obsoleta durante un raffinamento (Auto-update Stale Proposals) e il nuovo campo `refining` di `proposal.md`.

## `trama proposal edit <id>` con `rebase: true`
- L'input JSON di `trama proposal edit` accetta `rebase: true` (in `src/cli/commands/proposal.ts` e `src/core/proposals.ts`, vicino a `editInProposal` / `deleteInProposal` / `copyProposalFiles`).
- Con `rebase: true` Trama registra di nuovo il punto di partenza (`base`) di ogni file toccato dalla Proposal, calcolato sopra le Proposal che richiede, come fa la prima registrazione; quando il file non esiste vale `new`. Oggi `base` si scrive con `??=`: il rebase è l'unica eccezione alla regola "editing a file of a Proposal again does not change what was recorded for it" (`rules#proposal`). Dopo il rebase la Proposal non è più obsoleta per `health`, salvo cambi successivi.
- Scrive `refining: true` nel front matter di `proposal.md`.
- Come ogni modifica, una Proposal `open` torna `draft`, con lo stesso messaggio delle altre modifiche.
- Rifiutato, senza cambiare nessun file e con un messaggio che dice perché, quando la Proposal non è `kind: change` (import, setup, risoluzioni), quando è allegata a un Drift aperto, o quando non è `draft` né `open`.

## Campo `refining`
- `refining: true` lo scrive solo il rebase; lo toglie una consegna riuscita (`trama proposal move <id> open`, ~996-999 in `proposals.ts`). Una consegna rifiutata lo lascia. È assente nelle altre Proposal e in quelle scritte prima; la sua assenza vale `false`.
- Non cambia validazione, approvazione, rifiuto né obsolescenza: serve solo a riconoscere una Draft rimasta a metà di un raffinamento.
- `trama proposal show` mostra la riga `Refining: rebased, not handed over yet` quando è presente; `--json` porta il campo `refining`. `trama proposal list` e `trama project show` aggiungono `(refining)` alla Proposal, accanto a dove oggi mostrano `stale` (`src/cli/work.ts`).
- Lo snapshot (`src/core/snapshot.ts`, `ProposalView`) costruisce una `ProposalView` anche per una Draft con `refining: true` (oggi solo per le Open, ~429), con il campo `refining`, così la Board può mostrarla.

## Approvazione
- Il core non cambia l'approvazione: Approve su una Proposal da raffinare o su una Draft rimasta a metà non approva e non cambia file, e la decisione di raffinare la prende l'estensione, non `approveProposal`. Una Draft resta rifiutata dall'approvazione del core come oggi.
- Alla fine di un raffinamento (`raffinamento.PROPOSAL_RAFFINATA` → Approved) l'approvazione usa la stessa operazione del core dell'approvazione dal pannello (`approveProposal`), con le stesse condizioni e conseguenze, Task compresi; un rifiuto lascia la Proposal Open con il motivo.

## Test e documentazione
- Test del core: il rebase registra di nuovo `base` così la Proposal non è più obsoleta; Open → Draft; `refining: true` scritto; rifiuti per non `change`, allegata a un Drift aperto, stato non draft/open; `refining` tolto da una consegna riuscita e lasciato da una rifiutata.
- `docs/cli.md` descrive `rebase` nell'input di `proposal edit` e il campo `refining` (riga di `show`, `--json`, `(refining)` in list e project show).
