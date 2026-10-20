---
technical: true
refs:
  - requirements/tech#proposal
  - requirements/rules#proposal
  - requirements/rules#proposal/Approved
  - requirements/ui#proposal
  - requirements/tech#design-request
  - requirements/tech#panel/Board
---
# Comandi delle Proposal

Si fa dopo il Task del registro dei comandi.

- Comandi: `proposal new` (`{ title, body?, kind?, label?, requires?, automatic?, nonBlocking?, job?, announcement?, request? }`), `proposal show <id>`, `proposal list` (`{ all? }`), `proposal edit <id>` e `proposal move <id> open|approved|rejected|discarded`. Valgono le regole di `cli#General` e di `tech#proposal`.
- `proposal edit` sostituisce `label`, `delete` e `resolve-drift`, oltre al vecchio `edit`:
  - prende più percorsi in `edit` e in `delete` e stampa il percorso da scrivere per ciascuno di `edit`;
  - registra le decisioni di una risoluzione con `drifts` e le toglie con `removeDrifts`;
  - senza `--input` riporta in Draft una Proposal aperta senza toccare file.
- `proposal move` sostituisce `submit`, `approve`, `reject` e `discard`. `approved`, e `open` per una Proposal di setup, accettano `skillsDir`; `rejected` accetta `feedback`. I rifiuti di una Proposal allegata a un Drift aperto restano come prima.
- I vincoli fra i campi danno errori d'uso prima di scrivere: `automatic` e `nonBlocking` solo con `kind: resolution`, `job` solo con `automatic`, una Proposal di setup solo su un Modello vuoto. `validate --proposal` non esiste più: la consegna e `proposal show` fanno gli stessi controlli.
- Le uscite della consegna, dell'approvazione e di `project show` per Proposal di risoluzione, allegate o in scrittura dicono le stesse cose di prima. La consegna riuscita manda all'editor la stessa notizia di prima.
- Le skill `trama-design`, `trama-setup`, `trama-import`, `trama-scan`, `trama-implement` e `trama-resolve-drifts` usano solo questi comandi, con l'input passato con `--input -` e un heredoc. Scrivono `label` quando aprono una Proposal che porterà Task. Riaprono una Proposal con `trama proposal edit <id>` senza input.
- Test: la riapertura senza input, più file in una sola `proposal edit` e i rifiuti dei campi incompatibili.
