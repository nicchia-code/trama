---
status: resolved
resolution: proposal
refs:
  - requirements/rules#announcement
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 48s86zzo
created: 2026-10-09T08:47:41.902Z
---
# The scan of held Proposals announces its check with a title the Requirements do not list

## What happens

Quando parte la scansione in sospeso (spegnendo **Hold scan**, con più Proposal da scansionare insieme), l'agente annuncia un solo controllo intitolato `Scan of held Proposals`. Il ghost in In progress e l'eventuale avviso di ritiro mostrano quindi un titolo che non è fra quelli previsti.

## What should happen

Il Modello dice che anche la scansione in sospeso annuncia un controllo, ma l'elenco dei titoli di `rules#announcement` copre solo la corsa di un design, il Task chiesto per nome, Run all To do, la scansione dopo un'approvazione (`Scan of <titolo della Proposal>`) e lo scan chiesto a mano. Per la scansione di più Proposal in sospeso **non c'è alcun titolo**: il codice ne usa uno che i Requisiti non conoscono.

## Fix options

### Add the held scan title to the Requirement

Si aggiunge all'elenco dei titoli di `rules#announcement` il titolo `Scan of held Proposals` per la scansione in sospeso, un solo controllo per tutta la scansione. Il codice resta com'è; serve solo una piccola Proposal sui Requisiti.

### Title the held scan after its Proposals

Il controllo della scansione in sospeso usa un titolo già previsto, per esempio `Scan of <titolo della Proposal>` con l'ultima Proposal trattenuta. Si cambia solo la skill di scansione, ma con più Proposal il titolo descrive male il lavoro, perché ne nomina una sola.

## Where in the code

skills/trama-scan/SKILL.md, sezione Announcing the check
