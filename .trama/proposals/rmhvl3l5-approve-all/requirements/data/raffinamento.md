---
description: "Usa quando tocchi i dati del raffinamento delle Proposal obsolete: il campo refining e la coda in memoria."
---
# Dati del raffinamento

## raffinamento
- Il front matter di `proposal.md` può avere `refining: true`: la Proposal è stata riallineata da un raffinamento e non è ancora stata consegnata di nuovo. Lo scrive solo il riallineamento (`rebase`) e lo toglie la consegna riuscita; è assente nelle altre Proposal e in quelle scritte prima che esistesse. Non cambia validazione, approvazione, rifiuto né obsolescenza: serve solo a riconoscere sulla Board una Draft rimasta a metà.
- Coda e raffinamenti in corso sono stato in memoria della finestra, come gli altri lavori (`data#drift-resolution`): identità delle Proposal in coda, in ordine, ognuna con il segno se è da raffinare o in attesa di approvazione (`rules#raffinamento`); per ogni raffinamento al lavoro l'identità della Proposal, i posti che tiene, il terminale del lavoro e se la Proposal è stata consegnata durante il lavoro; le Proposal in attesa della fine di un Run, raffinate o prese da `Approve All` senza raffinamento; e l'istante del clic su `Approve All` finché `Approve All` è in corso, assente altrimenti. Le catene non si salvano: si ricalcolano dai file delle Proposal. Niente di tutto questo si scrive sotto `.trama/` né in `workspaceState`.
