---
column: done
technical: false
refs:
  - design-request/Writing
  - requirements/tech#design-request
  - requirements/ui#design-request
  - requirements/rules#design-request
drift: null
proposal: "0034"
agent: false
---
# Creare il file della richiesta con Design… e salvarlo da sé mentre il developer scrive

Design… (dai pulsanti del pannello o dalla palette) non apre più un documento senza titolo: crea subito il file vuoto della richiesta in `.trama/requests/` e lo apre in una scheda non in anteprima, che mostra il nome del file (data e ora). Il documento è completamente vuoto, senza segnaposto né modello.

Fatto quando:
- il developer non deve mai scegliere dove salvare la richiesta;
- ogni documento aperto di un file in `.trama/requests/` del progetto è salvato da Trama al più 300 ms dopo l'ultima modifica, a prescindere dall'impostazione di salvataggio automatico dell'editor, sia in Writing sia in Sent;
- il testo è salvato esattamente come scritto;
- una richiesta rimasta su disco mai inviata (per esempio dopo la chiusura della finestra) e riaperta, perché l'editor la ripristina o dall'esploratore dei file, si comporta come una richiesta in Writing.
