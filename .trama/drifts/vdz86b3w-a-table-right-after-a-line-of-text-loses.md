---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel
proposal: null
task: 17k4x3iq
origin: null
option: 1
note: null
resolvedBy: vylr6oj1
created: 2026-10-10T08:09:47.119Z
---
# A table right after a line of text loses its rows in panel Markdown

## What happens

Il pannello mostra una **tabella** Markdown come scritta, riga per riga, solo quando la tabella apre un paragrafo (dopo una riga vuota). Se la tabella segue subito una riga di testo, per esempio «Colonne:» e poi l'intestazione, oppure la prima riga di un punto d'elenco, le sue righe vengono unite al testo in un solo paragrafo: `Colonne: | a | b | |---|---| | 1 | 2 |`. Gli a capo spariscono e la tabella diventa una riga illeggibile. Lo stesso testo appare quindi in due modi diversi a seconda di una riga vuota, in ogni scheda e nell'overlay delle domande.

## What should happen

I Requisiti del pannello dicono che le tabelle non sono supportate e che ciò che non è supportato **si mostra come è scritto**. Una tabella deve quindi apparire con le sue righe al loro posto, come quando apre un paragrafo, anche quando segue direttamente una riga di testo o la prima riga di un punto d'elenco o di una citazione. Il testo che la precede resta un paragrafo normale, con la sua formattazione, e nessuna parte del testo si perde o si fonde con la tabella.

## Fix options

### Riconoscere la tabella anche a metà paragrafo

Quando una riga con `|` è seguita da una riga separatrice, il renderer chiude il paragrafo prima di quella riga e mostra le righe della tabella come scritte, come fa già quando la tabella apre il paragrafo. Vale anche dentro i punti d'elenco e le citazioni. Costo: poche righe nel renderer e un test; nessun cambiamento visibile per le tabelle già precedute da una riga vuota.

### Mostrare ogni tabella come testo con i suoi a capo

Le righe di una tabella restano nel paragrafo ma con un a capo forzato fra l'una e l'altra, ovunque si trovino, senza il blocco a spaziatura fissa. Comportamento uniforme e più semplice da spiegare, ma le colonne non restano allineate e cambia l'aspetto delle tabelle che oggi appaiono come blocco.

## Where in the code

extension/src/webview/markdown.ts, `parseBlocks`: il controllo `TABLE_SEPARATOR` guarda solo le prime due righe del paragrafo.
