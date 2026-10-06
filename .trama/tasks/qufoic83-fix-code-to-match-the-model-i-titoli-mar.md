---
column: done
technical: false
refs:
  - panel
  - requirements/ui#panel
drift: 7xv0e6d8
proposal: null
agent: false
created: 2026-10-06T20:46:49.665Z
finished: 2026-10-06T20:49:06.800Z
---
# Fix code to match the Model: I titoli Markdown dei Drift superano le intestazioni del confronto

## What happens

Nel confronto di un Drift, un titolo scritto nel testo Markdown appare **più grande dell’intestazione che contiene quel testo**. Con il carattere predefinito del pannello, il titolo interno è di 13 px mentre «What happens» e «What should happen» sono di 11 px. La stessa gerarchia interessa i titoli interni dei dettagli sul codice e dei testi delle opzioni di correzione. Il contenuto del Drift può quindi competere visivamente con le intestazioni del pannello.

## What should happen

I titoli nei testi Markdown non devono mai essere più grandi del titolo dell’elemento che contiene il testo. Il confronto del Drift deve conservare la gerarchia visiva del pannello: i titoli del contenuto rimangono subordinati alle intestazioni delle due parti, delle opzioni di correzione e dei dettagli sul codice, seguendo il tema dell’editor.

## Chosen option

**Limitare i titoli Markdown al contenitore**

Mantenere le dimensioni attuali delle intestazioni del pannello e ridurre, dove necessario, i soli titoli presenti nei testi Markdown affinché non le superino. La prosa resta leggibile e conserva la sua dimensione; cambia soltanto la gerarchia dei titoli interni. Occorre applicare lo stesso limite a entrambe le viste che mostrano i Drift e alle loro opzioni e dettagli.

## Where in the code

extension/src/webview/shell.css: dimensioni delle intestazioni del confronto e dei titoli Markdown. extension/src/webview/drift-compare.ts: contenitori dei due testi, delle opzioni e dei dettagli sul codice. extension/src/webview/markdown.ts: resa dei titoli.
