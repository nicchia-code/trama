---
refs:
  - editor-panel
  - requirements/ui#General
---
# Tooltip brevi ovunque

Ogni tooltip del pannello (Board, Diagramma, Requirements, Specs, Settings, barra del focus, overlay delle domande) ha al massimo due frasi brevi, circa 160 caratteri: dice cosa fa il controllo o perché è disabilitato e, al più, come rimediare. Le spiegazioni lunghe stanno nei Requisiti, nella documentazione o nei dettagli che il pannello mostra al clic, mai in un tooltip.

Quando è finito:
- Nessun tooltip scritto nel codice del webview o dell'host supera il limite; quelli che lo superano sono accorciati, compresi i motivi di disabilitazione di Approve.
- Un tooltip che elenca elementi (badge `stale`, `invalid`, `unfixable`, `unregistered files`, Approve bloccato da Proposal richieste) tiene entro il limite la sua frase introduttiva, seguita dall'elenco breve di oggi con `and N more`; una frase finale oltre l'elenco conta nel limite.
- I tooltip che mostrano per intero un testo accorciato con i puntini, come il testo di una domanda nell'indice delle domande, restano come sono.
- I testi che altri Requisiti fissano parola per parola non cambiano per questo Task: le spiegazioni delle impostazioni sono di «Impostazioni concise e tendine», il riquadro del Diagramma di «Riquadro breve del Diagramma».
