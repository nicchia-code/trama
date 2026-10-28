---
created: 2026-10-27T09:54:55.410Z
updated: 2026-10-27T09:54:55.410Z
summary: "Corretto il codice per il Drift delle otto differenze: menu a sole icone sotto 56 px, avvisi di raffinamento in cima alla Board, riferimenti non intitolati fuori dai mancanti del Diagramma, General senza riga di sessione nuova dopo la ricarica."
tasks:
  - pyh0w5m7
---
# Codice allineato al Modello: menu, avvisi, diagramma e General

Delle otto differenze fra Modello e codice, quattro sono corrette nel codice (Task pyh0w5m7, Drift 2pdnq92f):

- Menu laterale: le sole icone compaiono sotto i 56 px, misurando la vista intera.
- Raffinamento: gli avvisi «non è partito» e «raffinata ma non approvata» stanno nella riga degli avvisi in cima alla Board, con il pulsante di chiusura.
- Diagramma: un riferimento a una sezione dei Requisiti non intitolata a un elemento del Modello non conta più fra i mancanti.
- General: dopo una ricarica con la sessione non riaperta riparte vuota senza la riga `New session: …`, che resta solo dopo un omp chiuso da solo.

Le altre quattro (History, Split, Issue, Copilot) sono contraddizioni fra Modello e Requisiti, chiuse adeguando Modello e Requisiti.
