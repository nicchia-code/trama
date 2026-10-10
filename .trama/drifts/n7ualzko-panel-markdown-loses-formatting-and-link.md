---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel
  - panel/Open
proposal: null
task: j2kqioss
origin: null
option: 1
note: null
resolvedBy: 207t8egb
created: 2026-10-09T19:24:13.287Z
---
# Panel Markdown loses formatting and links after an unclosed angle bracket

## What happens

Quando un testo mostrato nel pannello contiene un **`<` seguito da una lettera** che non chiude mai un tag (per esempio `x <n per ora`), oppure un `<!--` senza `-->`, tutto il resto del paragrafo, anche sulle righe seguenti, è mostrato come testo grezzo: grassetto, corsivo, codice e **link** dopo quel punto non sono resi e il link non si può aprire.

Vale in ogni scheda e nell'overlay delle domande, perché il renderer è uno solo.

## What should happen

Il Markdown leggibile è sempre reso: grassetto, corsivo, codice e link funzionano anche dopo un `<` isolato. Solo un frammento di HTML vero (un tag chiuso da `>`, un commento chiuso) resta testo così com'è; ciò che non si può leggere come Markdown si mostra com'è scritto **solo per quanto non si può leggere**, non per il resto del testo (requirements/ui#panel).

## Fix options

### Treat an unclosed tag as plain text

Un `<` che non trova il `>` (o un `<!--` senza `-->`) conta come un carattere normale e la lettura del Markdown continua subito dopo, come fa CommonMark. I tag chiusi restano testo opaco come oggi. Cambio piccolo nel riconoscimento dell'HTML, con un test per il caso.

### Limit the raw HTML fragment to its own line

Un tag o commento non chiuso si ferma alla fine della riga invece che a quella del paragrafo: le righe seguenti tornano a essere lette come Markdown. Cambio ancora più piccolo, ma la riga con il `<` perde comunque la formattazione che segue.

## Where in the code

extension/src/webview/markdown.ts: htmlEnd (usata da parseInline e closingDelimiter)
