---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel
proposal: null
task: ij0z60g4
origin: null
option: 1
note: null
resolvedBy: y52ae3pw
created: 2026-10-09T22:15:31.796Z
---
# Panel Markdown breaks bold inside italic

## What happens

Quando un testo in **corsivo con asterischi** contiene una parte in **grassetto** (per esempio `*Nota: il **pannello** resta aperto.*`), il pannello chiude il corsivo sul primo asterisco del grassetto.

- Si vede in corsivo «Nota: il **pannello*», poi « resta aperto.*» in testo normale, con asterischi sparsi; il primo asterisco sparisce.
- Un corsivo che comincia con un grassetto (`***a** b*`) resta tutto testo con gli asterischi.

Con il trattino basso (`_a **b** c_`) e con il corsivo dentro il grassetto il risultato è giusto. Succede in ogni scheda e nell'overlay delle domande.

## What should happen

`requirements/ui#panel` elenca **grassetto** e **corsivo** fra la formattazione supportata in tutta la prosa del pannello.

Un grassetto annidato in un corsivo scritto con asterischi è Markdown valido: va mostrato come corsivo che contiene il grassetto, senza asterischi visibili e senza perdere caratteri, come già accade con il trattino basso o con il corsivo dentro il grassetto.

## Fix options

### Close italic only on a matching run

Il corsivo aperto con un asterisco si chiude solo su un asterisco che non fa parte di una coppia di grassetto ancora aperta, come prevede la regola di CommonMark per i delimitatori. I casi `*a **b** c*` e `***a** b*` diventano corsivo con grassetto dentro. Costa riscrivere la ricerca del delimitatore di chiusura e aggiungere i casi ai test del renderer.

### Fix only the common nested case

Quando dentro un corsivo con asterischi si trova una coppia `**…**` completa, la si salta nella ricerca della chiusura del corsivo. Copre il caso frequente `*a **b** c*`; il caso raro `***a** b*` resta mostrato come scritto, che il Requisito accetta solo per il Markdown malformato. Modifica più piccola, con un caso limite che resta.

## Where in the code

extension/src/webview/markdown.ts (parseInline, closingDelimiter); test/markdown.test.ts
