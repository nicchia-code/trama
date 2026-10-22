---
column: done
technical: true
refs:
  - requirements/rules#General
  - requirements/tech#General
drift: null
proposal: jez36zj7
agent: false
created: 2026-10-22T05:44:23.475Z
finished: 2026-10-22T05:46:34.183Z
---
# Regole di scrittura nelle skill

Quando il task è finito, le skill distribuite insegnano all'agente due regole per ogni testo che scrive per Trama e che il developer legge.

- Nessuna prima persona. Nella sezione `## Language` di `trama-design`, `trama-setup`, `trama-scan`, `trama-compare`, `trama-implement`, `trama-import` e `trama-resolve-drifts` (in `skills/`; `trama-setup` e `trama-compare` ricevono la sezione se non l'hanno) c'è la regola: nei testi scritti per Trama (domande, contesti e opzioni dei round, titoli e corpi di Proposal, Task e Drift, voci di History) Trama si chiama sempre «Trama» e l'agente «l'agente» o «the agent»; niente «I», «me», «my», «we», «our», né «io», «noi» o verbi alla prima persona in italiano. Le risposte dell'agente nella sua conversazione non cambiano. I testi già scritti non si riscrivono.
- Task autoconclusivi. Le skill che scrivono Task (`trama-design`, `trama-setup`, `trama-scan`, `trama-compare`, `trama-implement`) dicono che il corpo di un Task si capisce senza la conversazione che l'ha prodotto: dice che cosa deve valere alla fine, con le condizioni e le conseguenze come le dice il Modello, e ogni decisione dell'intervista che lo riguarda, perché chi lo realizzerà non vede quella conversazione.
- Ogni testo nuovo dell'interfaccia e della riga di comando di Trama segue la stessa regola della prima persona; i testi esistenti dell'estensione e di `src/` non ne hanno e restano come sono.
- La regola delle domande autoconclusive nella sezione «Asking» e nell'aiuto di `trama question new` è di un altro Task di questa Proposal.
