---
column: done
technical: false
refs:
  - panel
  - menu-laterale
  - requirements/ui#panel
  - requirements/ui#menu-laterale
drift: null
proposal: 8ymyjtvh
agent: false
created: 2026-10-24T16:04:42.882Z
finished: 2026-10-24T16:10:46.970Z
---
# Testo Scan disattivato

Con l'Advisor Scanner attivo, con qualunque agente, ogni pulsante Scan resta al suo posto disabilitato, con l'etichetta di sempre senza `· N` e la sua icona; il testo che spiega la disattivazione diventa `Scan is off during Runs.` al posto di `Scans are off: the Advisor Scanner checks the code during Runs.`, ovunque compaia:

- il tooltip di `Scan` nella barra del Diagramma a ogni livello (Sistema, Whole System, Actor o Feature);
- il nome accessibile di ogni pulsante Scan disabilitato, compreso `Scan System` nel menu laterale, che ripete etichetta e testo (`<etichetta>. Scan is off during Runs.`);
- la riga in testo secondario e piccolo sotto `Scan System` nel menu laterale, mostrata solo in modalità larga e collegata come descrizione accessibile del pulsante; in modalità solo icone la riga non si mostra e il menu laterale resta senza tooltip.

Il testo è in inglese e non segue `trama.language`. Con l'Advisor Scanner spento i pulsanti restano come oggi. Nel codice il testo sta in un'unica costante, `SCANS_OFF_TOOLTIP` in `extension/src/webview/scan-label.ts`, usata da `scanButtonLabel` e dalla riga del menu laterale (`extension/src/webview/menu/app.tsx`); i test che verificano il testo si aggiornano con il nuovo.
