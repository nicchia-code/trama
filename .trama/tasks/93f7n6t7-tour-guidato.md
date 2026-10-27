---
column: done
technical: false
refs:
  - tour
  - visitor.START_CHAPTER
  - visitor.FOLLOW_STEP
  - visitor.ACT_OFF_STEP
  - visitor.RETURN_TO_STEP
  - visitor.SKIP_TOUR
  - requirements/ui#tour
  - requirements/tech#tour
drift: null
proposal: yr0jv31u
agent: false
created: 2026-10-26T19:01:22.096Z
finished: 2026-10-26T20:27:36.328Z
---
# Tour guidato

La demo del sito è una presentazione interattiva: frecce e fumetti indicano il prossimo passo, capitolo per capitolo, e dopo il tour (o saltandolo) tutto resta usabile.

Comportamento (Machine `tour`):
- Quando la demo è pronta o dopo un Reset (`demo.READY`) il tour parte dal primo capitolo. Quattro capitoli in ordine, ciascuno con i suoi passi sul negozio:
  - **Design and questions**: avviare una richiesta di design dalla Board; inviare la richiesta già scritta (codici sconto al checkout); guardare l'agente esplorare in omp Chat mentre il suo ghost attende sulla Board; rispondere al round di domande che si apre sopra il pannello e inviarlo; vedere la Proposal arrivare sulla Board.
  - **Running Tasks**: aprire la Proposal sul Diagramma e guardare cosa cambia; tornare alla Board e approvarla; vedere i suoi Task in To do; eseguirli tutti; guardare l'agente prenderli, portarli in Done e riferire in omp Chat; aprire la History.
  - **Scan and Drifts**: avviare Scan System dal menu laterale; guardare l'agente confrontare e creare un Drift; aprire il Drift e leggere cosa succede nel codice e cosa dovrebbe succedere; scegliere una Fix option; guardare l'agente correggere il codice; vedere il Drift lasciare la Board.
  - **Setup and import**: passare alla seconda cartella, dove il pannello mostra Get Started; scegliere Import from Code nel wizard e percorrerne i passi; guardare l'agente leggere il codice e scrivere la Proposal di import in omp Chat; approvarla sulla Board; vedere il nuovo Model sul Diagramma.
- Un passo è seguito (`visitor.FOLLOW_STEP`) quando il visitatore fa ciò che la freccia indica, oppure, per un passo che aspetta l'agente, quando il suo copione finisce (`scripted-agent.FINISHED`); la freccia passa al passo successivo e l'ultimo passo di un capitolo porta al capitolo seguente. L'ultimo passo dell'ultimo capitolo spegne il tour con un fumetto di chiusura che ringrazia e linka la guida e l'installazione dell'estensione.
- Un'azione fuori dal passo (`visitor.ACT_OFF_STEP`) avviene comunque: la freccia si nasconde e il fumetto offre Back to the step e Continue freely. Back to the step (`visitor.RETURN_TO_STEP`) riporta la freccia sul passo; se l'azione ha reso il passo impossibile, il capitolo riparte dal suo punto di partenza. Continue freely o Skip tour (`visitor.SKIP_TOUR`) spengono il tour lasciando la demo com'è.
- Dalla lista dei capitoli (`visitor.START_CHAPTER`), a tour acceso o spento, si avvia qualunque capitolo: le due cartelle della demo vengono portate al punto di partenza di quel capitolo, cioè il negozio come lo lasciano i capitoli precedenti seguiti in ordine, buttando via ciò che è stato fatto nel frattempo.

Interfaccia:
- Un passo mostra una freccia verso il suo bersaglio nella finestra demo e un fumetto accanto che non copre mai il bersaglio, con nome del capitolo, numero del passo sul totale del capitolo, una o due frasi brevi su cosa fare e perché, e Skip tour. Freccia e fumetto seguono il bersaglio quando la finestra si ridimensiona, scorre o cambia vista. Un passo che aspetta l'agente punta a omp Chat e dice cosa sta facendo l'agente, senza bersaglio da cliccare.
- La lista dei capitoli, aperta dalla toolbar, mostra i quattro capitoli in ordine con l'avanzamento (capitoli fatti spuntati, quello corrente evidenziato), permette di avviarne uno, avvisa che avviare un capitolo porta la demo al suo punto di partenza, e contiene Skip tour mentre il tour guida.
- Fumetti e lista sono raggiungibili e usabili da tastiera; i pulsanti del fumetto prendono il fuoco quando un passo si apre, senza toglierlo a un campo in cui il visitatore sta scrivendo.

Costruzione:
- Il tour è un dato in `site/src/demo/tour.ts`: capitoli e passi; un passo ha il bersaglio (attributo `data-tour` di un elemento della finestra demo o di una vista dell'estensione), il testo del fumetto e la condizione che lo segue (un messaggio `ToHost`/`ToMenuHost`/`ToChatHost` con i suoi argomenti, un'azione della finestra demo, o la fine di un copione con nome). Ogni altro messaggio o azione mentre un passo aspetta è un'azione fuori dal passo.
- Il punto di partenza di un capitolo è il seme con i copioni e i passi del visitatore dei capitoli precedenti applicati a velocità infinita, calcolato quando il capitolo viene scelto.
- Le viste dell'estensione ricevono attributi `data-tour` stabili sugli elementi a cui il tour punta, senza cambiare altro nell'estensione.
