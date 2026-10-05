---
status: approved
base:
  agent-launching/design-request.md: new
  agent-launching/feature.md: e61cd9ab0171105a225c7b87783f0e7ca7b6e9cf49f1d9bd659250d7eaddd598
  model-changes/proposal.md: c61c725586e47b9e556ea0fa50f3c0e59e037d9ac1b038cb30b88d82aeb0f13d
  actors/developer.md: 320ad31156ad80e38893b6e2beee09c445ee4ded97e4bbddd492eb650229eee5
  actors/workspace.md: 347f2a75d3996dcc8b50c708c59ce54b95764a033a8a5a6bbd788abcaf7af2f2
  requirements/rules.md: ef49a5d29d00fd480fb4efb3940d32f77627a1edf1f099daa169ad9c8fc0dd48
  requirements/data.md: 6d202b656aea7116c06658845943b49664241b3bfb2c487357392ee09015661e
  requirements/tech.md: 2e79b90c0a49ae99a4513dbbc3e8995b6cd1fe2b6ec45beb532694b61f5165f0
  requirements/ui.md: 613393089599328d98644fd9cc620f577a47ae3769e64f5323ce741776c9b98f
delete: []
created: 1970-01-01T00:00:00.031Z
---
# Write design requests as Markdown documents

Oggi una richiesta di design è una sola riga scritta in un input box: non basta per descrivere bene un cambiamento, i suoi casi limite e i Requisiti che il developer ha già in mente. Il developer scrive invece la richiesta in un documento Markdown in una scheda dell'editor e la invia all'agente con un pulsante; la richiesta rapida di una riga resta disponibile come Quick request. La richiesta inviata è salvata in `.trama/requests/`, l'istruzione all'agente la nomina e resta di una riga, e il file sparisce quando la prima Proposal che ne nasce è consegnata.

Dettagli scelti dall'agente, da verificare:
- il testo dell'avviso per una richiesta vuota, i tooltip dei due pulsanti e l'icona `send` di Send to agent;
- nell'intervista completa la skill propone come raccomandazione quello che la richiesta già indica;
- se il file della richiesta non esiste più quando l'agente lo cerca, la skill lo dice e si ferma senza aprire Proposal;
- il comando «Trama: Design with Agent…» sparisce, sostituito da «Trama: Quick Design Request…» e «Trama: Design…».
