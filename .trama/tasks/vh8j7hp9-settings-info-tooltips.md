---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#panel/Settings
drift: null
proposal: kqkrwsgb
agent: false
created: 2026-10-15T05:08:27.752Z
finished: 2026-10-15T05:13:24.618Z
---
# Settings explanations in an info tooltip

Nella scheda Settings ogni impostazione mostra il titolo leggibile con accanto una «i» informativa, poi la chiave e il controllo; la spiegazione dell'impostazione e quella del valore scelto sotto i menu a tendina non compaiono più nella pagina.

Quando il developer passa sulla «i» o le dà il fuoco da tastiera compare un fumetto con la spiegazione dell'impostazione, la stessa delle impostazioni dell'editor; per una scelta fra valori fissi il fumetto spiega anche ogni valore, con quello scelto evidenziato. Il fumetto resta aperto finché il puntatore è sulla «i» o sul fumetto, così i suoi link si possono aprire, e si chiude quando il puntatore li lascia, quando la «i» perde il fuoco o con Esc; un solo fumetto è aperto alla volta.

Valgono tutti i Requisiti di `requirements/ui#panel/Settings`, in particolare l'aspetto e il nome accessibile della «i», il contenuto e la chiusura del fumetto, e il collegamento `aria-describedby` delle spiegazioni anche a fumetto chiuso.
