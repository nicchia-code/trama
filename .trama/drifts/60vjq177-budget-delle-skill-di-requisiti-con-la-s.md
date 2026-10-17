---
status: resolved
resolution: proposal
refs:
  - requirements/rules#project
  - requirements/tech#project
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: uw0a9dir
created: 2026-10-17T11:55:30.353Z
---
# Budget delle skill di Requisiti con la skill degli Specs

## What happens

Il budget delle skill di Requisiti conta anche la skill degli Specs, quando gli Specs sono validi: la sua descrizione entra nella somma che decide tra modalità per frammento e modalità indice.

## What should happen

Il budget è la somma, sui frammenti di Requisiti con almeno una sezione non vuota, dei caratteri del nome e della descrizione della loro skill; la skill degli Specs non vi entra.

## Fix options

### Allineare il calcolo del budget al Requisito

Il calcolo del budget smette di contare la skill degli Specs e somma solo i frammenti di Requisiti con contenuto, come dice il Requisito. Le modalità scelte per le stesse Aree possono cambiare in casi vicini alla soglia.

### Estendere il Requisito con la skill degli Specs

Il Requisito di regole del progetto include nel budget anche la skill degli Specs quando gli Specs sono validi, e il calcolo del codice resta com'è.

## Where in the code

src/core/requirement-skills.ts:37-42 (requirementSkillsBudget)
