---
description: "Usa quando implementi Install omp e il terminale che installa omp."
---
# Installazione di omp

## developer.INSTALL_OMP
- `Install omp` c'è soltanto quando omp manca: nel passo `omp` del wizard, nella riga di omp del gruppo `omp` della scheda Settings e nell'avviso di omp mancante.
- A ogni clic Trama apre un terminale integrato nuovo e visibile che esegue l'installer ufficiale di omp per il sistema del developer: su macOS e su Linux `curl -fsSL https://omp.sh/install | sh`, su Windows `irm https://omp.sh/install.ps1 | iex` in Windows PowerShell. Trama non installa omp in nessun altro modo e non sceglie fra bun, Homebrew o altri gestori: lo fa lo script.
- Quando il comando del terminale finisce, Trama dimentica l'esito del controllo degli aggiornamenti e rifà la verifica di omp del wizard e della scheda Settings, se sono aperti. Il terminale resta aperto, con l'uscita dell'installer, finché il developer non lo chiude. Il developer rilancia da sé il lavoro che non era partito.
- Con `trama.ompPath` vuota, dopo l'installazione omp si trova anche quando l'installer lo ha messo fuori dal PATH dell'editor, nelle cartelle che `tech#agent-launching` cerca; Trama non scrive `trama.ompPath`.
