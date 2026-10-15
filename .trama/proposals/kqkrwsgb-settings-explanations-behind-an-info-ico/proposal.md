---
status: approved
base:
  editor-panel/panel.md: ff0ce0b4a7a549fbf90686be7377fb65c4600de6eb0e0ddb3e218e32283315c9
  requirements/ui/panel.md: 5e14bd45515e7ca47fdc22fb80d8297d5e1c421b4ec56cc44ca687d38f6db227
delete: []
created: 2026-10-15T05:07:02.404Z
---
# Settings explanations behind an info icon

Nella scheda Settings le spiegazioni occupano molto spazio: il developer vuole vederle solo quando le chiede, passando su una «i» informativa.

Decisioni:
- Sono nascoste sia la spiegazione dell'impostazione sia quella dei valori dei menu a tendina; la riga sotto il menu sparisce.
- La «i» sta accanto al titolo dell'impostazione; la spiegazione compare in un fumetto al passaggio del mouse o quando la «i» riceve il fuoco.
- Il fumetto resta aperto mentre il puntatore è sulla «i» o sul fumetto: il testo si seleziona e i link si aprono; si chiude poco dopo che il puntatore li lascia, quando la «i» perde il fuoco o con Esc.
- Un solo fumetto alla volta: aprirne uno chiude l'altro.
- Nei menu a tendina il fumetto elenca la spiegazione di ogni valore, con quello scelto evidenziato.
- Da tastiera la «i» è una fermata del Tab.
- Uno screen reader legge ancora, al fuoco del controllo, la spiegazione dell'impostazione e quella del valore scelto, anche se nascoste.

Ipotesi da verificare:
- Il nome accessibile e il tooltip della «i» sono `About <titolo>`, in inglese come gli altri testi della scheda.
- Nel fumetto il valore scelto è evidenziato dallo sfondo e anche dal testo `(current)`, così non conta solo il colore.
- Il fumetto ha l'aspetto dei fumetti dell'editor; la pausa prima della chiusura è breve e non fissata in millisecondi.
- Un nuovo valore delle impostazioni aggiorna il valore evidenziato in un fumetto aperto senza chiuderlo.
- La chiave, l'avviso del workspace e i messaggi di errore restano sempre visibili: non sono spiegazioni.

## Already present
- `panel/Open/developer.SHOW_SETTINGS` — `extension/src/webview/main.ts` (tab `Settings` della barra del pannello)
