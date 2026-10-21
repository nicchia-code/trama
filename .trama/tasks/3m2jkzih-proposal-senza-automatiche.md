---
column: done
technical: false
refs:
  - proposal
  - requirements/rules#proposal
  - requirements/tech#proposal
  - requirements/data#proposal
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:46:43.844Z
---
# Proposal senza risoluzioni automatiche

Quando il Task è fatto, una Proposal non è mai una risoluzione automatica e non viene mai approvata in automatico: resta Open finché il developer non la approva o la rifiuta. `trama proposal new` non scrive più il campo `automatic` e non lo accetta più (né `job`): passarlo è un errore d'uso. Una Proposal vecchia con `automatic: true` si legge senza errori e il campo viene ignorato, senza migrazione e senza badge: il badge `delegated` non esiste più.

`nonBlocking` è valido solo con kind `resolution`, senza alcun controllo su `automatic`; il kind `setup` non rifiuta più `automatic` in modo specifico. Il messaggio `resolveDrifts` porta sempre l'id di un Drift (non esiste più la forma senza id). La scansione leggera dopo il design non nomina più la barriera di scansione dell'autopilot.

Indizi: `src/cli/commands/proposal.ts`, `src/core/proposals.ts`, `src/core/snapshot.ts`, `extension/src/protocol.ts`, `skills/trama-design/SKILL.md`, `docs/cli.md`.
