---
column: done
technical: false
refs:
  - task/Done
  - requirements/data#task
  - requirements/tech#task
  - announcement/Checking/agent.FINISH_CHECK
  - requirements/rules#announcement
  - requirements/tech#announcement
drift: null
proposal: o3h29jss
agent: false
created: 2026-10-10T12:55:47.067Z
finished: 2026-10-10T14:49:43.282Z
---
# Ricordare lo scan globale consegnato e contare i Task conclusi dopo il suo avvio

La copia di lavoro deve ricordare l’inizio dell’ultimo scan di tutto il Sistema avviato dal pulsante Scan e dichiarato finito dall’agente. Il ricordo è `.trama/last-scan/system`, una data e ora con al più un a capo finale; la cartella ha un `.gitignore` contenente `*` e non è versionata. Un ricordo assente o non interpretabile si inizializza all’istante corrente alla prima lettura. L’estensione riconosce la consegna del controllo `Scan of the System` appartenente al terminale dello scan, oppure alla chat mentre quello scan è in corso, e salva l’istante di avvio tramite file provvisorio e rinomina; una scrittura fallita avvisa il developer e conserva il conteggio. Nella Snapshot, `tasksSinceScan` conta soltanto i Task ora in Done il cui `finished` è successivo al ricordo: i Task conclusi durante lo scan contano ancora, quelli rifatti contano una volta, quelli usciti da Done o senza istante non contano. Il ricordo sopravvive alla chiusura dell’editor e non cambia per scan interrotti, di Feature, dopo approvazione o di fine corsa. Il conteggio è calcolato nel nucleo e non è mostrato dalla CLI. La presentazione e l’aggiornamento dei pulsanti del pannello restano lavoro distinto.

Al momento dell’invio effettivo da Scan System della Board o da Scan del Diagramma a livello Sistema, l’estensione deve ricordare in memoria l’istante di avvio e il terminale destinatario, oppure che lo scan è nella chat. Soltanto la consegna del controllo pertinente aggiorna il ricordo persistito con quell’istante, mai con quello della consegna; il lancio è poi dimenticato. Anche la fine del lavoro senza consegnare il controllo dimentica il lancio, senza aggiornare il ricordo persistito. Un controllo ritirato, un controllo di un altro terminale, ogni altro controllo e uno scan richiesto manualmente senza i pulsanti non cambiano il ricordo. La consegna conserva la scomparsa del ghost senza avviso.
