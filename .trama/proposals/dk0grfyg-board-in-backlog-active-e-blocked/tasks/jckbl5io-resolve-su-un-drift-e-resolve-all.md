---
technical: false
refs:
  - drift-resolution
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/In attesa delle scansioni/developer.ASK_AGENT
  - requirements/tech#drift-resolution
---
# Resolve Drifts su tutti i Drift aperti o su un solo Drift

Resolve Drifts si può lanciare con due ambiti: su tutti i Drift aperti (`Resolve all`) o su un solo Drift (`Resolve` sulla scheda del Drift). Il messaggio del webview all'host `resolveDrifts` in `extension/src/protocol.ts` accetta un'identità di Drift facoltativa; senza identità raccoglie tutti i Drift aperti. Sono la stessa Resolve Drifts: stesse regole, stessa delega, stesse esclusioni e una sola risoluzione per volta sul progetto.

Quando arriva un'identità, l'host la ricontrolla al momento del lancio: il Drift deve essere ancora aperto e fuori da ogni risoluzione (né raccolto da una Proposal di risoluzione in scrittura o aperta, né raccolto dal lavoro di risoluzione in corso); devono esserci Drift da raccogliere e nessuna risoluzione da decidere, altrimenti non parte nulla e il motivo arriva come messaggio. Da Free la partenza porta a Resolving e rende operativa la delega che aspettava la ripresa dopo l'apertura dell'editor; la modalità corrente si applica ai soli Drift raccolti e, con casi misti, si prepara prima il gruppo manuale. Una parte automatica aspetta comunque gli scan già in corso: in attesa delle scansioni, Resolve o Resolve all possono affrontare soltanto i casi manuali tra i Drift raccolti, e i casi automatici restano in attesa.

I gruppi manuali usano `trama ask` con le regole attuali (skip, interruzione editor); il prompt e la skill `trama-resolve-drifts` ricevono l'ambito, così che un lancio su un solo Drift non raccolga altri Drift. Nessuna istruzione alla chat che aggiri il round.

Il lavoro di risoluzione ricorda in memoria nell'host, in ogni modalità (manuale e automatica), le identità dei Drift che ha raccolto, e le dimentica quando il lavoro finisce. Aggiornare i test dell'host sul lancio di Resolve Drifts (con e senza identità, Drift non più valido) e la documentazione dei comandi/accettazione che descrive Resolve Drifts.
