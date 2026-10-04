---
column: done
technical: false
refs:
  - panel/Closed/developer.OPEN_PANEL
drift: "0009"
proposal: null
agent: false
---
# Fix code to match the Model: Il pannello può aprirsi due volte mentre si offre l'inizializzazione del progetto

## What happens

In una cartella senza **.trama/**, l'apertura del pannello mostra l'offerta di inizializzare il progetto e **non** blocca altre aperture mentre il developer decide. Se in quel momento arriva un secondo comando di apertura (o l'inizializzazione, che apre a sua volta il pannello), ognuno crea il proprio pannello: ne esistono due e il primo non è più raggiungibile da Trama, che ricorda solo l'ultimo.

## What should happen

Esiste **al massimo un pannello**: aprirlo di nuovo lo porta davanti invece di crearne un altro, anche quando la prima apertura è ancora in attesa della risposta del developer.

## Chosen option

**Controllare di nuovo prima di creare**

Dopo l'offerta e l'inizializzazione, se nel frattempo un pannello esiste già, lo si porta davanti e non se ne crea un altro. Costa poco e cambia solo il caso di due aperture ravvicinate; il secondo messaggio di offerta resta visibile.

## Where in the code

extension/src/host/controller.ts, apertura del pannello nel Controller
