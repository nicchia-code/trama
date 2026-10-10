---
column: done
technical: true
refs:
  - requirements/ui#panel
drift: 7ippui07
proposal: null
agent: false
created: 2026-10-09T23:06:16.958Z
finished: 2026-10-09T23:10:32.378Z
---
# Fix code to match the Requirements: Panel Markdown breaks bold inside italic

## What happens

Quando un testo in **corsivo con asterischi** contiene una parte in **grassetto** (per esempio `*Nota: il **pannello** resta aperto.*`), il pannello chiude il corsivo sul primo asterisco del grassetto.

- Si vede in corsivo «Nota: il **pannello*», poi « resta aperto.*» in testo normale, con asterischi sparsi; il primo asterisco sparisce.
- Un corsivo che comincia con un grassetto (`***a** b*`) resta tutto testo con gli asterischi.

Con il trattino basso (`_a **b** c_`) e con il corsivo dentro il grassetto il risultato è giusto. Succede in ogni scheda e nell'overlay delle domande.

## What should happen

`requirements/ui#panel` elenca **grassetto** e **corsivo** fra la formattazione supportata in tutta la prosa del pannello.

Un grassetto annidato in un corsivo scritto con asterischi è Markdown valido: va mostrato come corsivo che contiene il grassetto, senza asterischi visibili e senza perdere caratteri, come già accade con il trattino basso o con il corsivo dentro il grassetto.

## Chosen option

**Close italic only on a matching run**

Il corsivo aperto con un asterisco si chiude solo su un asterisco che non fa parte di una coppia di grassetto ancora aperta, come prevede la regola di CommonMark per i delimitatori. I casi `*a **b** c*` e `***a** b*` diventano corsivo con grassetto dentro. Costa riscrivere la ricerca del delimitatore di chiusura e aggiungere i casi ai test del renderer.

## Where in the code

extension/src/webview/markdown.ts (parseInline, closingDelimiter); test/markdown.test.ts
