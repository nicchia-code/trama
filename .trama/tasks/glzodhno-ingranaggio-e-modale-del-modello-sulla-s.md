---
column: done
technical: false
refs:
  - panel/Board
  - panel/Open/developer.SHOW_BOARD
  - requirements/ui#proposal
  - requirements/tech#proposal
drift: null
proposal: znzyo6iv
agent: false
created: 2026-10-17T17:38:35.278Z
finished: 2026-10-17T18:08:02.244Z
---
# Ingranaggio e modale del modello sulla scheda della Proposal

Quando il Task è finito, la scheda in Backlog di ogni Proposal che porta Task ha in testa, all'estremità destra della riga del numero breve e dei badge, un pulsante a sola icona: il glifo codicon `settings-gear`, 16 px, nel colore del testo, con tooltip e nome accessibile `Choose the model for <numero breve>`. L'ingranaggio non è mai disabilitato, neanche mentre `Approve` e `Reject` dicono `The agent is still finishing`. Le schede gialle delle risoluzioni, le Proposal di import e i dettagli del Diagramma non lo hanno.

Il quadro della Board che l'host manda al webview porta, per ogni Proposal in Backlog che porta Task, `model` (`{ name, agent, applies }` oppure nulla), con `applies` vero quando `agent` è uguale a `trama.agent`; il quadro si rimanda quando il modello salvato cambia o cambia `trama.agent`. Solo l'estensione legge e scrive il modello; `src/core` e la riga di comando non lo conoscono.

Con un modello scelto, la scheda ha subito a sinistra dell'ingranaggio un badge testuale con il nome intero del modello, con tooltip e nome accessibile `Model for this Proposal's work: <modello>`. Se il modello è stato scelto per un altro agente il badge usa il colore attenuato del tema, ha il testo barrato e tooltip e nome accessibile `Chosen for <agente>: the Settings roles apply`, con `<agente>` uguale a `omp`, `Claude Code` o `the editor chat`. Senza modello non c'è badge.

L'ingranaggio apre sopra il pannello una finestra modale, un elemento `<dialog>` aperto con `showModal()` come quella delle voci di History (`board/history-entry.ts`), intitolata `Model for <numero breve> <titolo>`. Contiene un solo campo, con etichetta `Model`, uguale a quello dei ruoli nella scheda Settings: il campo è un componente condiviso estratto da `webview/settings/index.ts` (`<input list>` con `<datalist>`, invio immediato di una voce scelta, nota di omp) e usato sia dalla scheda Settings sia dalla modale, senza librerie nuove. Accetta testo libero, offre la stessa tendina dei modelli suggeriti per l'agente scelto, mostra la stessa nota sotto il campo quando omp non li elenca, e un modello suggerito scelto vale subito. All'apertura la modale chiede `modelSuggestionsWanted` e l'host manda `modelSuggestions` sia alla scheda Settings sia alla modale. Vuoto, il campo mostra come segnaposto `Settings roles (trama.analysis, trama.execution)`. Sotto il campo, in testo attenuato: `Used by the Runs of this Proposal's Tasks and by Resolve on a Drift filed from one of them. Scans always use trama.scan. Leave empty to use the Settings roles.` Con un modello scelto per un altro agente il campo lo mostra e sopra compare `Chosen for <agente>: the Settings roles apply. Confirm a model to use it with <agente di adesso>.`

Confermare il campo (perdita del fuoco, Invio o scelta di un suggerimento) salva subito, senza pulsante di conferma: il webview manda `setProposalModel { proposal, model }`; `host/messages.ts` lo accetta solo con l'identità di una Proposal in Backlog che porta Task e una stringa, e l'host scrive il valore senza spazi attorno insieme al `trama.agent` di quel momento, oppure toglie la voce per una stringa vuota, così la Proposal torna al default dei Settings. Il messaggio non passa dall'attesa della fine del turno: l'host non lo rifiuta per una scheda in attesa.

La modale si chiude con il pulsante `Close` (icona `close`), con Esc e cliccando fuori; all'apertura il focus va al campo, resta dentro la modale finché è aperta e alla chiusura torna all'ingranaggio, così il developer ritrova la Board dov'era. Ha il ruolo di dialogo modale con il nome del suo titolo, e si chiude da sola quando il pannello si chiude o quando la Proposal non è più in Backlog. Tutti questi testi sono in inglese e non seguono `trama.language`.

L'host dimentica le voci del modello a ogni nuovo quadro della Board e all'attivazione sul progetto, con le Proposal e i Task di quel quadro: quando la Proposal è rifiutata o scartata, o quando è approvata e nessun suo Task resta da fare.

Una sequenza di Run per modello lanciata da `Run all` o dal Run automatico conta come un solo Run lanciato da Trama, dal lancio fino alla fine del suo ultimo Run o al suo arresto, anche nell'istante fra un Run e il successivo: per tutto quel tempo `Run all` e ogni `Run` restano disabilitati e dicono perché, come per un solo Run lanciato da Trama, salvo che il developer abbia attivato `trama.submitWhileRunning`; scan, design e import restano avviabili.
