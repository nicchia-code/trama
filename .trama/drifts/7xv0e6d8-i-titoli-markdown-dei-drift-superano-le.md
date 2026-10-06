---
status: resolved
resolution: fix-code
refs:
  - panel
  - requirements/ui#panel
proposal: null
task: qufoic83
origin: null
option: 1
note: null
created: 2026-10-06T20:36:16.366Z
---
# I titoli Markdown dei Drift superano le intestazioni del confronto

## What happens

Nel confronto di un Drift, un titolo scritto nel testo Markdown appare **più grande dell’intestazione che contiene quel testo**. Con il carattere predefinito del pannello, il titolo interno è di 13 px mentre «What happens» e «What should happen» sono di 11 px. La stessa gerarchia interessa i titoli interni dei dettagli sul codice e dei testi delle opzioni di correzione. Il contenuto del Drift può quindi competere visivamente con le intestazioni del pannello.

## What should happen

I titoli nei testi Markdown non devono mai essere più grandi del titolo dell’elemento che contiene il testo. Il confronto del Drift deve conservare la gerarchia visiva del pannello: i titoli del contenuto rimangono subordinati alle intestazioni delle due parti, delle opzioni di correzione e dei dettagli sul codice, seguendo il tema dell’editor.

## Fix options

### Limitare i titoli Markdown al contenitore

Mantenere le dimensioni attuali delle intestazioni del pannello e ridurre, dove necessario, i soli titoli presenti nei testi Markdown affinché non le superino. La prosa resta leggibile e conserva la sua dimensione; cambia soltanto la gerarchia dei titoli interni. Occorre applicare lo stesso limite a entrambe le viste che mostrano i Drift e alle loro opzioni e dettagli.

### Dare più rilievo alle intestazioni del confronto

Portare le intestazioni delle parti del Drift, delle opzioni e dei dettagli almeno alla dimensione dei titoli Markdown che contengono, mantenendo riconoscibili i livelli superiori del pannello. Il contenuto conserva la dimensione attuale; il confronto occupa più spazio e ha intestazioni più evidenti. Il rapporto deve rimanere valido anche con caratteri dell’editor diversi da quelli predefiniti.

## Where in the code

extension/src/webview/shell.css: dimensioni delle intestazioni del confronto e dei titoli Markdown. extension/src/webview/drift-compare.ts: contenitori dei due testi, delle opzioni e dei dettagli sul codice. extension/src/webview/markdown.ts: resa dei titoli.
