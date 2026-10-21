---
column: done
technical: false
refs:
  - announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
  - requirements/ui#announcement
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:36:30.817Z
---
# Annunci ritirati dal controllo

Quando il controllo di esecuzione chiude un terminale di Trama o un lavoro della chat, gli annunci che appartengono a quel terminale o a quel lavoro sono ritirati come alla fine del comando: il ghost sparisce da System Activities e in cima alla Board compare, per ogni ghost, l'avviso `The agent finished without delivering <kind> <title>.` (per un controllo `The agent stopped before finishing <title>.`), con il pulsante di chiusura e la stessa durata degli altri avvisi. Un annuncio che è un lavoro (Al lavoro) invece è consegnato: sparisce senza avvisi propri e resta soltanto l'avviso del controllo in cima alla Board.

Se il lavoro della chat chiuso dal controllo non si è mai legato alla sua conversazione, è ritirato soltanto l'annuncio che Trama ha fatto al suo lancio, senza alcun avviso di mancata consegna, perché quel lavoro non è mai partito; gli annunci della chat del progetto fatti da altri restano. Gli annunci degli altri terminali e delle altre conversazioni non cambiano mai.

Non esiste nessuna quiete: nessun timer di inattività ritira un annuncio o un ghost, nessun hook manda segnali di vita, e un comando di `trama` di sola lettura non scrive i file degli annunci né il loro `touched` e non è riferito all'editor come attività. L'unico ritiro legato al tempo è quello del controllo di esecuzione, che guarda soltanto fatti certi. Resta l'estensione a possedere la fine del lavoro dell'agente: è lei che, quando il controllo chiude un lavoro, ritira i suoi annunci e tiene gli avvisi.
