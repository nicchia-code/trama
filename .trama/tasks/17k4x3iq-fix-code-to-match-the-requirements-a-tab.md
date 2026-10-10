---
column: done
technical: true
refs:
  - requirements/ui#panel
drift: vdz86b3w
proposal: null
agent: false
created: 2026-10-10T08:32:21.901Z
finished: 2026-10-10T08:33:28.580Z
---
# Fix code to match the Requirements: A table right after a line of text loses its rows in panel Markdown

## What happens

Il pannello mostra una **tabella** Markdown come scritta, riga per riga, solo quando la tabella apre un paragrafo (dopo una riga vuota). Se la tabella segue subito una riga di testo, per esempio «Colonne:» e poi l'intestazione, oppure la prima riga di un punto d'elenco, le sue righe vengono unite al testo in un solo paragrafo: `Colonne: | a | b | |---|---| | 1 | 2 |`. Gli a capo spariscono e la tabella diventa una riga illeggibile. Lo stesso testo appare quindi in due modi diversi a seconda di una riga vuota, in ogni scheda e nell'overlay delle domande.

## What should happen

I Requisiti del pannello dicono che le tabelle non sono supportate e che ciò che non è supportato **si mostra come è scritto**. Una tabella deve quindi apparire con le sue righe al loro posto, come quando apre un paragrafo, anche quando segue direttamente una riga di testo o la prima riga di un punto d'elenco o di una citazione. Il testo che la precede resta un paragrafo normale, con la sua formattazione, e nessuna parte del testo si perde o si fonde con la tabella.

## Chosen option

**Riconoscere la tabella anche a metà paragrafo**

Quando una riga con `|` è seguita da una riga separatrice, il renderer chiude il paragrafo prima di quella riga e mostra le righe della tabella come scritte, come fa già quando la tabella apre il paragrafo. Vale anche dentro i punti d'elenco e le citazioni. Costo: poche righe nel renderer e un test; nessun cambiamento visibile per le tabelle già precedute da una riga vuota.

## Where in the code

extension/src/webview/markdown.ts, `parseBlocks`: il controllo `TABLE_SEPARATOR` guarda solo le prime due righe del paragrafo.
