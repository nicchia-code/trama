---
description: "Usa quando tocchi i dati del raffinamento delle Proposal obsolete: il campo refining e la coda in memoria."
---
# Dati del raffinamento

## raffinamento
- Il front matter di `proposal.md` può avere `refining: true`: la Proposal è stata riallineata da un raffinamento e non è ancora stata consegnata di nuovo. Lo scrive solo il riallineamento (`rebase`) e lo toglie la consegna riuscita; è assente nelle altre Proposal e in quelle scritte prima che esistesse. Non cambia validazione, approvazione, rifiuto né obsolescenza: serve solo a riconoscere sulla Board una Draft rimasta a metà.
- Coda e raffinamento in corso sono stato in memoria della finestra, come gli altri lavori (`data#drift-resolution`): identità delle Proposal in coda, identità della Proposal in raffinamento, terminale del lavoro e se la Proposal è stata consegnata durante il lavoro. Non si scrivono sotto `.trama/` né in `workspaceState`.
