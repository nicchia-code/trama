---
column: done
technical: true
refs:
  - requirements/ui#drift
drift: nw8485i2
proposal: null
agent: false
created: 2026-10-09T20:34:35.236Z
finished: 2026-10-09T20:36:59.714Z
---
# Fix code to match the Requirements: Diagram details mark a Drift's Requirement references as no longer resolving

## What happens

Nei dettagli di un Drift nel Diagramma, la sezione **Points at** confronta ogni riferimento solo con gli elementi del Modello disegnato. Un riferimento a un Requisito che esiste (per esempio `requirements/rules#drift`) non è mai un elemento disegnato, quindi compare sempre come testo con la nota **no longer resolves**.

Ogni Drift che punta anche o solo a Requisiti sembra così puntare a qualcosa che non c'è più, anche appena creato.

## What should happen

`ui#drift` riserva la nota `no longer resolves` ai riferimenti che **non si risolvono più**: un riferimento valido è un link all'elemento, uno sparito è testo con la nota.

Un riferimento a una sezione di Requisito che esiste si risolve (è la stessa regola per cui un Drift si può creare solo con riferimenti che si risolvono) e non deve essere segnato come sparito. Sulla Board, la riga di chip tratta già i Requisiti a parte e li porta alla scheda Requirements.

## Chosen option

**Link existing Requirements to the Requirements tab**

In **Points at**, un riferimento a un Requisito che esiste diventa un link alla scheda Requirements, come il chip della Board; solo un Requisito o un elemento davvero sparito tiene la nota `no longer resolves`. Il developer arriva al Requisito con un clic. Costa leggere le Aree nei dettagli del Diagramma e un tipo di link in più.

## Where in the code

extension/src/webview/diagram/details.ts (`detailOfDrift` usa `resolveElement`, che conosce solo il Modello disegnato); extension/src/webview/board/render.ts per il trattamento dei Requisiti nei chip
