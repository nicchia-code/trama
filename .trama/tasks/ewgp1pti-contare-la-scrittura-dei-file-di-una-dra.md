---
column: done
technical: false
refs:
  - announcement/Announced/time.QUIET_PERIOD_ELAPSED
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: null
agent: false
created: 2026-10-06T15:29:14.807Z
finished: 2026-10-06T15:33:52.836Z
---
# Contare la scrittura dei file di una Draft annunciata come attività nei quindici minuti di quiete

I quindici minuti di quiete devono ripartire ogni volta che l'agente **cambia una Draft che ha annunciato**, non solo quando la registra con `trama proposal edit` o `trama proposal delete`.

Oggi il tempo riparte solo per quei comandi, per un annuncio, per l'archiviazione di una carta e per la consegna: mentre l'agente scrive a lungo i file di una Draft già registrati, senza altri comandi, dopo quindici minuti il ghost sparisce e il developer è avvisato che l'agente ha finito senza consegnare, anche se l'agente sta ancora lavorando.

Fatto quando: modificare, creare o cancellare un file dentro una Draft legata a un annuncio conta come attività dell'agente, e il ritiro per quiete (con l'avviso) avviene solo dopo quindici minuti senza annunci, senza cambiamenti a una Draft annunciata e senza carte archiviate, sempre fermando il conteggio mentre è aperto un round di domande. Resta vero che solo la riga di comando scrive i file degli annunci; l'estensione li cancella soltanto.
