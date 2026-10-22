---
column: done
technical: false
refs:
  - task
  - requirements/data#task
drift: null
proposal: drdvf0p2
agent: false
created: 2026-10-22T05:44:21.487Z
finished: 2026-10-22T05:46:15.253Z
---
# Immagini dei Task salvate

Un Task di una Proposal può portare delle immagini per il modello che lo realizza: copie delle immagini locali di una richiesta scritta di design o di setup che l'agente di design ha legato a quel Task, quando il developer ha scelto di mandarle all'esecuzione. Non fanno parte del testo del Task, non vanno nel controllo di versione e restano solo sulla macchina dove sono state legate.

Quando il Task è fatto vale quanto segue:

- Le immagini di un Task non sono nel file del Task. Stanno in `.trama/task-images/<identità del Task>/`, locale alla copia di lavoro. In `.trama/task-images/` c'è un `.gitignore` con il testo `*`, scritto insieme alla prima immagine.
- La cartella contiene solo le copie, ciascuna con il nome del file originale; se il nome è già presente la copia prende un suffisso `-2`, `-3`, … prima dell'estensione.
- L'ordine delle immagini di un Task è quello della loro copia: data di modifica, poi nome. Nessuna cartella vuol dire nessuna immagine.
- La cartella è la stessa prima e dopo l'approvazione della Proposal: l'approvazione crea il Task con la stessa identità che aveva nella Proposal, quindi le immagini restano legate senza essere spostate.
- La lettura del progetto (`src/core/`, per esempio `src/core/snapshot.ts` e il codice che legge i Task) sa trovare, per ogni Task, la lista ordinata delle sue immagini che esistono (nome e percorso assoluto), così che la Snapshot, `trama task show`, `trama proposal show` e l'estensione possano usarla. Un'immagine che non c'è più non compare.

Chi realizza il Task riceve le immagini insieme a lui; un'immagine che il modello non riesce a vedere è ignorata in silenzio. Il comando con cui l'agente lega le immagini, le cancellazioni (Done, Proposal rifiutata o scartata, Task tolto, pulizia all'attivazione) e le skill sono coperti da un altro Task; questo Task riguarda dove e come le immagini sono conservate e lette.
