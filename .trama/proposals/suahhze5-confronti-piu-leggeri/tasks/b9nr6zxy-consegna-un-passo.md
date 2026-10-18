---
technical: true
refs:
  - requirements/rules#proposal
---
# Consegna in un passo

`trama proposal submit <id>` diventa l'unico comando della consegna per gli agenti: valida e mostra le modifiche.

Fatto quando:
- la consegna fa tutti i controlli di `trama validate --proposal <id>`, compreso il blocco delle risoluzioni con un Drift `fix-code` non più correggibile, e rifiuta come oggi nominando ogni problema;
- una consegna riuscita stampa, dopo l'esito, gli avvisi di `validate` e lo stesso testo di `trama proposal show <id>`; con `--json` il testo è nel campo `show`;
- la consegna della Proposal di setup che si approva da sola stampa lo stesso testo dopo l'esito dell'approvazione;
- `trama validate` e `trama proposal show` non cambiano;
- `docs/cli.md` descrive la nuova uscita di `proposal submit`.
