---
technical: false
refs:
  - drift-resolution
  - requirements/rules#drift-resolution
  - requirements/data#drift-resolution
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
---
# Fine lavori dal controllo

Il registro dei lavori di ogni finestra tiene, per ogni lavoro (Run, scan, risoluzione), anche l'istante in cui è partito, in memoria soltanto: niente sotto `.trama/` né in `workspaceState`, e nessuna finestra conosce i lavori delle altre se non tramite la domanda del controllo di esecuzione su chi segue un Task.

La fine di un lavoro segue il suo terminale o la sua conversazione, oppure il controllo di esecuzione quando trova un fatto certo; mai una quiete o un timer di inattività, e i segnali ripetuti restano idempotenti. Quando il controllo chiude l'ultimo Run (l'agente di omp del suo terminale non c'è più, oppure nella chat il Run non si è legato a nessuna conversazione entro il primo controllo fatto almeno un minuto dopo l'invio) il registro torna libero e la fine è anomala: una sequenza di Run all si ferma senza lanciare altri Run, come per un'interruzione, e in cima alla Board un avviso dice che Trama ha smesso di seguire quel Run e perché. Il Run della chat chiuso così finisce come se non fosse mai partito e non può più legarsi a una conversazione che arrivi dopo.

Alle stesse condizioni il controllo chiude il lavoro di una risoluzione: il registro torna libero, nessun Run parte da questa fine e l'avviso compare come per un Run.

Il processo dell'agente di omp di ogni terminale di Trama, comunicato dall'hook all'avvio, è registrato fuori dal repository, nella cartella privata dell'utente delle registrazioni locali degli editor, nel file `agents-<identità del progetto>.json`: un oggetto che a ogni identità di terminale associa `{ pid, started }` (`pid` intero positivo, `started` istante UTC ISO 8601). Lo scrive la finestra che segue il terminale, tramite un file provvisorio poi rinominato; una voce si toglie al primo controllo che vede che nessun Task ha più quel terminale come `agent` e nessuna finestra lo segue più. Un file che esiste ma non si legge non dice nulla: finché non torna leggibile, nessun Task di un terminale viene liberato perché nessuna finestra lo segue.
