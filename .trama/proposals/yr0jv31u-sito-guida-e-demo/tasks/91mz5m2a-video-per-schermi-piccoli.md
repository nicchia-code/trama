---
refs:
  - demo/Recording
  - requirements/ui#demo/Recording
  - requirements/tech#demo/Recording
---
# Video per schermi piccoli

Chi apre la demo con una finestra più stretta della larghezza minima (1024 px CSS) vede una registrazione del tour al posto della finestra interattiva.

Quando il Task è finito:
- Nello stato Recording della demo la pagina riproduce `site/public/demo/recording.mp4` muto e in loop, con `site/public/demo/recording-poster.png` mentre carica, e sotto una riga che invita ad aprire il sito da un computer per provare la demo. Allargando la finestra oltre la larghezza minima parte la demo interattiva. Landing e guida restano usabili a qualunque larghezza.
- `scripts/record-demo.ts` (script `site:record` della radice) builda il sito, lo serve in locale, percorre il tour con Playwright a 1280×800 seguendo ogni passo e scrive `site/public/demo/recording.mp4` (H.264) e il poster. Si lancia a mano quando la demo cambia e i file prodotti si committano; il video resta sotto 10 MB.
- Lo stesso video, o un suo estratto, è l'anteprima animata della landing.
- Le Specs riportano Playwright come già scritto nella Proposal.
