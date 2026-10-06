---
column: done
technical: false
refs:
  - panel
  - requirements/ui#panel
  - requirements/tech#panel
drift: e8gvl0p6
proposal: null
agent: false
created: 2026-10-06T18:57:30.141Z
finished: 2026-10-06T19:07:34.058Z
---
# Fix code to match the Model: Markdown del pannello altera link con titolo e HTML letterale

## What happens

Il testo del pannello non conserva alcuni contenuti Markdown. Un link valido con una parentesi chiusa nel titolo fra virgolette, per esempio `[Manuale](https://example.com "Capitolo ) finale")`, lascia comparire `finale")` dopo il link. Inoltre HTML scritto come testo, per esempio `<span title="**testo**">valore</span>`, perde gli asterischi e rende in grassetto una parte dell attributo. Non viene eseguito HTML, ma il contenuto mostrato è diverso da quello scritto.

## What should happen

I link Markdown supportati devono essere riconosciuti per intero, anche quando il titolo fra virgolette contiene parentesi. L HTML non supportato deve comparire **come testo, così come è scritto**, senza reinterpretare il contenuto dei suoi attributi. Il comportamento deve essere comune alle tre schede e all overlay delle domande, conservando il rendering tramite DOM e l apertura dei soli indirizzi HTTP e HTTPS tramite editor.

## Chosen option

**Conservare correttamente i confini del testo**

Riconoscere i titoli fra virgolette dei link senza trattare le loro parentesi come delimitatori, e conservare come testo i frammenti HTML non supportati prima di applicare la formattazione inline. Si mantiene il renderer condiviso, senza librerie runtime nuove. Richiede correggere due confini del riconoscimento e verificare che il testo resti fedele senza introdurre markup eseguibile.

## Where in the code

extension/src/webview/markdown.ts: linkTarget e parseInline
