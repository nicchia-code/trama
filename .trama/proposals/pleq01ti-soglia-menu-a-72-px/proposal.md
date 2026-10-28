---
status: discarded
base: {}
delete: []
created: 2026-10-27T07:17:34.084Z
label: Soglia 72 px
---
# Soglia menu a 72 px

# Soglia del menu a 72 px

Il codice mostra soltanto le icone sotto i 72 px di larghezza della vista del menu e il padding del contenitore è compreso in quella misura. Questa Proposal porta la soglia della Requirement al valore che il codice già usa, così che Model e Requirements dicano il comportamento attuale.

## Requirements

- `requirements/ui#menu-laterale`: nel punto sulla modalità solo icone, la soglia passa da 56 px a 72 px in entrambi i casi: «quando la vista è larga meno di 72 px» e «Da 72 px in su il menu torna come sopra». Il resto del punto resta com'è.
- `requirements/tech#menu-laterale`: nel punto sulla modalità solo icone, la variante `@max-[56px]:` diventa `@max-[72px]:`, così che l'implementazione descritta coincida con la soglia di `ui#menu-laterale`.

Nessun altro Requisito o riferimento del Model cambia.
