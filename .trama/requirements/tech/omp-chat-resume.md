---
description: "Usa quando costruisci o cambi il salvataggio e la ripresa delle conversazioni di omp Chat dopo una ricarica o una riapertura della finestra."
---
# Conversazioni di omp Chat: ripresa

## omp-chat-conversation/Waiting for the window
- Persistenza per la ripresa (`data#omp-chat-conversation`): l'host scrive le conversazioni aperte di una finestra in `ExtensionContext.workspaceState` a ogni cambio di stato e alla chiusura. All'attivazione dell'estensione le legge e, per ognuna, avvia un processo nuovo con gli stessi argomenti e lo stesso ambiente (la stessa `TRAMA_TERMINAL`), poi riapre la sessione salvata con il metodo che omp 18.12.6 dichiara (`tech#omp-acp`). Riuscita → `omp-acp.SESSION_RESUMED`; fallimento di avvio, di `initialize` o del caricamento, o il limite di tempo dell'apertura superato → `omp-acp.SESSION_NOT_RESUMED`, e la voce si cancella. Il lavoro salvato rientra nel registro dei lavori con la sua identità prima che parta il controllo di esecuzione e prima che la finestra ritiri gli annunci orfani (`tech#announcement`), così i Task presi e gli annunci di quella conversazione non vengono rilasciati né ritirati alla riapertura.
- Ripresa di Ask more: una conversazione senza hook salvata come `running` riprende in Agent idle, senza il messaggio fisso della ripresa e senza `work`, e la sua voce torna `idle`.
