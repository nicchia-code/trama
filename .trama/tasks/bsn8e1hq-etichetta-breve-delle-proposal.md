---
column: done
technical: false
refs:
  - proposal/Draft/agent.SUBMIT_PROPOSAL
  - proposal/Draft/agent.EDIT_PROPOSAL
  - requirements/data#proposal
  - requirements/rules#proposal
  - requirements/tech#proposal
drift: null
proposal: dk0grfyg
agent: false
created: 2026-10-17T10:26:29.439Z
finished: 2026-10-17T10:41:22.760Z
---
# Etichetta breve delle Proposal e Resolve di un singolo Drift

Una Proposal ha nel front matter di `proposal.md` il campo facoltativo `label`: l'etichetta breve, una stringa di 1–30 caratteri dopo aver tolto gli spazi attorno, su una sola riga, conservata così come l'agente la dà. Le Proposal scritte prima non vengono riscritte.

Comandi:
- `trama proposal new … --label <testo>` scrive l'etichetta alla creazione.
- `trama proposal label <id> <testo>` la scrive o la cambia dopo; è una modifica come ogni altra (`agent.EDIT_PROPOSAL`): riporta a Draft una Proposal aperta e lo dice.
- Un'etichetta vuota, su più righe o più lunga di 30 caratteri è rifiutata subito, sia da `--label` sia da `proposal label`, con un'uscita di errore che dice perché.
- `trama proposal show` stampa `Label: <etichetta>` sotto il titolo quando c'è; con `--json` il campo `label`.

Validazione e consegna (`agent.SUBMIT_PROPOSAL`): una Proposal che porta Task (`kind` `change` o `setup` con almeno un Task in `tasks/`) è invalida senza un'etichetta valida; `trama validate --proposal <id>` e `trama proposal submit` la rifiutano con `Proposal <id> needs a label of at most 30 characters for its Tasks`, insieme agli altri problemi; la Proposal resta Draft. Per le Proposal senza Task l'etichetta è facoltativa. Una Proposal aperta consegnata prima che le etichette esistessero non diventa bloccata per l'etichetta mancante.

Le skill `trama-design` e `trama-setup` (in `skills/`) scrivono l'etichetta quando aprono una Proposal che porterà Task, con `--label`, o con `trama proposal label` prima di consegnarla.

Il messaggio di lancio `resolveDrifts` del protocollo fra pannello e host accetta l'identità facoltativa di un Drift: senza, l'host raccoglie i Drift aperti fuori da ogni risoluzione (`Resolve all`); con, l'host ricontrolla che quel Drift sia aperto e fuori da ogni risoluzione e raccoglie soltanto lui (`Resolve`). In entrambi i casi controlla le condizioni della risoluzione dei Drift e costruisce l'istruzione con le identità raccolte.

Aggiornare i test di CLI, validazione e protocollo e la documentazione dei comandi in `docs/`.
