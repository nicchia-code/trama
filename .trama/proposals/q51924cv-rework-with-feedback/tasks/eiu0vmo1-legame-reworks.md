---
technical: false
refs:
  - proposal
  - requirements/data#proposal
---
# Legame reworks delle Proposal

Una Proposal rifiutata con Rework with feedback viene rifatta da un agente; la prima Proposal che quell'agente apre ne prende il posto tramite il nuovo campo `reworks` del front matter di `proposal.md`. Il campo è assente nelle altre Proposal e in quelle scritte prima che esistesse (nessuna migrazione) e resta come storia dopo la decisione.

A Task concluso deve valere:

- `trama proposal new` accetta `reworks` (identità o numero breve della Proposal rifiutata) in `{ title, body?, kind?, label?, requires?, nonBlocking?, announcement?, request?, reworks? }`. `reworks` insieme a `request` è rifiutato con un errore, senza creare nulla.
- Il legame si fa solo quando la Proposal nominata esiste, è `rejected` e nessun'altra Proposal ha già `reworks` uguale (una Proposal rifiutata è rifatta al più una volta). Altrimenti la Proposal è creata senza legame e il risultato dice perché, come oggi per una richiesta non trovata o già legata (`requestNote`): in `--json` il campo `reworksNote` con il motivo; `reworks` vale l'identità legata oppure `null`.
- Nello stesso passo della creazione, il legame: scrive `reworks`; dà alla Proposal nuova il `created` della rifiutata (assente se quella non lo ha), così prende il suo posto nell'ordine di creazione e nella Board (a istante uguale decide l'identità); sostituisce l'identità della rifiutata con quella nuova in `requires` di ogni Proposal `draft` o `open`, togliendo i doppioni, senza cambiare il loro `status`, il loro `base` né i loro file. Oggi `newProposal` non prende lock e `withProposalLock` è un lock per Proposal: ogni Proposal di cui si riscrive `requires` è riletta e riscritta sotto il proprio lock. `reworks` e `reworkRequested` vanno aggiunti ai dati della Proposal letti e salvati (il salvataggio oggi scrive solo i campi noti). Il risultato del comando elenca le Proposal così cambiate; possono risultare obsolete, perché ora sono applicate sopra la Proposal nuova, ed è un motivo di blocco come gli altri. Una Proposal con `reworks` non ha `request`.
- Finché la Proposal nuova non nasce, le Proposal che richiedono la rifiutata restano bloccate dicendo che è stata rifiutata, come oggi.
- `trama proposal show` stampa sotto il titolo la riga `Reworks: <identità> <titolo>` quando il campo c'è; `--json` ha il campo `reworks`.
- La descrizione di `reworks` entra nell'aiuto di `trama proposal new`; la validazione di `proposal.md` accetta il campo.

Codice coinvolto: `newProposal` in `src/core/proposals.ts` (creazione, lock, lettura e scrittura del front matter, validazione), `src/cli/commands/proposal.ts` (comando `new` con il suo schema di input e output accanto a `request`/`requestNote`, comando `show`).
