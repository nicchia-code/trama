---
column: done
technical: false
refs:
  - project
  - requirements/rules#project
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/tech#project
  - requirements/ui#project
drift: null
proposal: hqa1sggh
agent: false
created: 2026-10-21T04:09:12.799Z
finished: 2026-10-21T04:14:04.363Z
---
# Controllo skill all'apertura

Quando il lavoro è finito, in un progetto Trama ogni apertura ordinaria di Trama dall'editor controlla in sottofondo le skill: il pulsante `Trama` nella barra di stato, l'icona Open Trama, il comando Open Trama e il Reopen dell'avviso delle domande. Il controllo parte anche quando il pannello è già aperto e torna solo in primo piano. Il controllo guarda se ciò che Trama installa per l'agente è diverso da questa versione:

- le skill dell'agente nella cartella configurata;
- la skill dell'azione Fix e il sotto-agente di smistamento che le versioni precedenti installavano;
- la definizione del sotto-agente di omp e le istruzioni dell'advisor di omp;
- le skill di Requisiti;
- la definizione utente del sotto-agente di confronto per la chat di quell'editor, con il modello di scansione attuale.

Il pannello si apre subito, senza aspettare il controllo. Se qualcosa è diverso, il controllo lo porta in pari come Update skills: scrive solo i file il cui contenuto cambia e sostituisce senza chiedere anche le copie modificate a mano. Poi compare l'avviso informativo «Trama: updated the agent skills to this version.».

Se è tutto in pari non compare nulla. Le righe del resoconto che ricorrono a ogni corsa non contano come aggiornamento: la modalità e il budget delle skill di Requisiti, le Aree lasciate com'erano e la skill degli Specs non aggiornata.

Il controllo non porta al formato a frammenti le Aree scritte come file unico e non crea le Aree di partenza: queste restano solo a Update skills. Gli hook delle chat restano dove sono, all'avvio dell'estensione.

Se il controllo o l'aggiornamento fallisce, compare l'errore «Trama: could not update the agent skills: <motivo>.». Il controllo non ritenta da solo: ricontrolla alla prossima apertura e rimostra l'errore finché il problema resta. Mentre un controllo è in corso, un'altra apertura non ne avvia un secondo.

Il controllo non parte in questi casi:

- quando il pannello si apre da solo per un round di domande;
- in una finestra senza cartelle;
- su Get Started.

Riguarda il progetto che il pannello apre.

Il controllo usa lo stesso codice di `trama project edit` e ne legge il risultato strutturato. Anche la scrittura dei file di omp dice quali file ha davvero cambiato. La definizione utente della chat si scrive solo se il contenuto è diverso, mentre l'inizializzazione e Update skills continuano a riscriverla sempre. Un cambio di `trama.scan` arriva così ai sotto-agenti della chat alla prossima apertura di Trama.

Il comando `Trama: Update Agent Skills` resta invariato, con il suo resoconto completo anche quando non cambia nulla.
