---
status: approved
kind: resolution
drifts:
  - drift: wy5t4wn7
    decision: proposal
  - drift: fk5j37ks
    decision: fix-code
    option: 1
  - drift: onoa6rvg
    decision: fix-code
    option: 1
  - drift: zy2058mf
    decision: fix-code
    option: 1
  - drift: 3yxry7wd
    decision: fix-code
    option: 1
  - drift: blsyyq0k
    decision: fix-code
    option: 1
  - drift: q0ah0ztc
    decision: fix-code
    option: 1
  - drift: gbqxvyb2
    decision: fix-code
    option: 1
  - drift: 7b80em4a
    decision: fix-code
    option: 1
  - drift: shyhsxy9
    decision: fix-code
    option: 1
  - drift: ky450y5x
    decision: fix-code
    option: 1
  - drift: cz5qn6ny
    decision: fix-code
    option: 1
  - drift: 5t9nf0cd
    decision: fix-code
    option: 1
  - drift: w1955qcf
    decision: fix-code
    option: 1
  - drift: y6gszl94
    decision: fix-code
    option: 1
  - drift: 6zoficqr
    decision: fix-code
    option: 1
  - drift: 6utvs096
    decision: fix-code
    option: 2
  - drift: rt8al47z
    decision: fix-code
    option: 1
  - drift: g6v367uk
    decision: fix-code
    option: 1
  - drift: u016lvxg
    decision: fix-code
    option: 1
  - drift: 8pj5f53f
    decision: fix-code
    option: 1
  - drift: ond2ib1i
    decision: fix-code
    option: 1
  - drift: e9w8a4ie
    decision: fix-code
    option: 1
  - drift: 1r18brn3
    decision: fix-code
    option: 1
  - drift: 3qcc348f
    decision: fix-code
    option: 1
  - drift: k0nezhma
    decision: fix-code
    option: 1
  - drift: lmk7whpj
    decision: fix-code
    option: 1
base:
  actors/developer.md: 08250654b192a9f154ac25a47f27ae2e26885b0787ca3626dfc23deacc3db688
  agent-questions/question-round.md: 26006a89252b3a1b6fb074d49ee51f91b7cfbcdced33c0c002d877232732d486
delete: []
created: 2026-10-10T14:11:53.374Z
---
# Resolve panel, agent lifecycle and scan Drifts

- wy5t4wn7 – Reopen on the waiting-questions notice opens the panel without a Panel Transition: adeguare il Modello: Reopen usa l’apertura ordinaria del pannello e ripristina il round; RESTORE_QUESTIONS resta alla barra interna.
- fk5j37ks – Missing fix option message names the Drift as typed instead of by its short number: correggere il codice: l’errore per opzione mancante nomina il Drift con il numero breve.
- onoa6rvg – Il titolo del pannello resta Trama invece del nome del Sistema: correggere il codice: il titolo segue il nome del Sistema a ogni quadro, con il nome della cartella come ripiego.
- zy2058mf – I Task presi vengono rilasciati dopo quindici minuti di quiete senza un evento di fine: correggere il codice: nessun rilascio dei Task per quiete; restano gli eventi previsti e la ripresa esplicita.
- 3yxry7wd – Gli annunci scadono per quiete senza un segnale di fine lavoro: correggere il codice: ritirare gli annunci soltanto alla consegna o agli eventi conclusivi previsti, senza scadenze per quiete.
- blsyyq0k – La chiusura del terminale senza hook lascia i Task presi in In progress: correggere il codice: ogni terminale seguito rilascia alla chiusura i propri Task e quelli senza origine riconosciuta, anche senza hook.
- q0ah0ztc – L'inattività conclude Run e risoluzioni senza un evento di fine: correggere il codice: Run e Resolve Drifts finiscono soltanto con gli eventi di fine previsti, non per inattività.
- gbqxvyb2 – La fine del comando di un agente con hook non conclude il lavoro: correggere il codice: la fine del comando inviato da Trama conclude il lavoro anche nei terminali con hook.
- 7b80em4a – La scelta dell'agente dipende ancora dai launcher e dai comandi precedenti: correggere il codice: ogni invio usa trama.agent e trama.terminalLocation; le impostazioni precedenti sono ignorate senza riscriverle.
- shyhsxy9 – Il ghost di un Drift non segue titolo e fase della Draft: correggere il codice: ogni quadro usa il titolo corrente della Draft per il ghost e la fase Writing, con precedenza alle domande.
- ky450y5x – Una Draft prende l’annuncio di una richiesta destinata a un altro terminale: correggere il codice: l’associazione automatica della Draft considera soltanto richieste del medesimo terminale.
- cz5qn6ny – Le istruzioni possono ancora avviare un terminale esterno: correggere il codice: eliminare il terminale esterno e le sue risorse; restano soltanto terminali integrati.
- 5t9nf0cd – Una nuova istruzione può riusare il terminale precedente: correggere il codice: ogni istruzione apre un terminale integrato nuovo, senza riusare quello a riposo.
- w1955qcf – La fine della chat durante l'invio lascia il lavoro in corso: correggere il codice: conservare il primo prompt e la fine della sua conversazione fino all’esito dell’invio, senza scadenza del candidato.
- y6gszl94 – Il terminale a riposo continua a essere seguito: correggere il codice: smettere di seguire la corsa al primo segnale di fine e ignorare i segnali successivi.
- 6zoficqr – L'hook di omp continua a inviare segnali di vita: correggere il codice: l’hook omp riferisce soltanto la fine della sessione principale, senza segnali di vita né comando alive.
- 6utvs096 – Send to agent compare anche sulle schede che non possono inviare una richiesta: correggere il codice con l’opzione 2: Send to agent compare soltanto nel gruppo a fuoco quando mostra una richiesta mai inviata.
- rt8al47z – Il titolo del fantasma può provenire da un esempio di codice dentro un elenco: correggere il codice: il titolo del fantasma esclude gli esempi di codice anche dentro elenchi e citazioni.
- g6v367uk – Il pannello mostra ancora gli interruttori Hold scan: correggere il codice: rimuovere Hold scan dalle tre barre, conservando le altre azioni.
- u016lvxg – Il confronto delle Machine richiede ancora smistamento e modello di analisi: correggere il codice: ogni Machine va direttamente a trama-analysis con il ruolo trama.scan, senza smistamento preliminare.
- 8pj5f53f – Approved Proposals still wait behind Hold scan: correggere il codice: l’approvazione ordinaria non consulta alcun sospeso; le vecchie memorie Hold scan sono ignorate senza migrazione.
- ond2ib1i – I gruppi paralleli di Task restano limitati a quattro: correggere il codice: propagare N ai gruppi di Task; --max usa 20 se assente e rifiuta valori non interi o inferiori a uno.
- e9w8a4ie – La fine corsa scansiona ancora tutto il Sistema: correggere il codice: dopo la verifica finale calcolare l’ambito dei Task conclusi e scansionare solo quello; nessuno scan con ambito vuoto.
- 1r18brn3 – Design exploration still caps sub-agents at four: correggere il codice: l’esplorazione del design usa N dell’istruzione, oppure venti, senza tetto fisso di quattro.
- 3qcc348f – Scan instructions still triage Machines before comparison: correggere il codice: assegnare direttamente ogni Machine al confronto, usare N e togliere triage e risultati del classificatore.
- k0nezhma – La Board separa ancora la risoluzione dai suoi Drift: correggere il codice: una risoluzione consegnata e i suoi Drift formano una sola scheda gialla, contata una volta e identificata come risoluzione.
- lmk7whpj – La ripresa di un Task è rifiutata quando il comando è eseguito dall’agente: correggere il codice: task take-back è eseguibile anche dall’agente, soltanto su richiesta esplicita dello sviluppatore; il Task resta In progress.
