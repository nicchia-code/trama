---
technical: false
refs:
  - developer.INSTALL_OMP
  - requirements/rules#developer.INSTALL_OMP
  - requirements/ui#developer.INSTALL_OMP
---
# Install omp

Il developer preme Install omp quando omp manca, nel passo omp del wizard, nel gruppo omp della scheda Settings o nell'avviso di omp mancante, e Trama apre un terminale visibile con l'installer ufficiale di omp. Alla fine:

- `Install omp` c'è soltanto quando omp manca. A ogni clic l'host apre un terminale integrato nuovo con `vscode.window.createTerminal`, nome `Install omp`, nella cartella home dell'utente, con la shell dei terminali dell'agente (Windows PowerShell su Windows), nell'area dei terminali qualunque sia `trama.terminalLocation`; il terminale diventa visibile con il cursore dentro. Il comando si scrive quando la shell è pronta, come per i terminali dell'agente: su macOS e Linux `curl -fsSL https://omp.sh/install | sh`, su Windows `irm https://omp.sh/install.ps1 | iex`. Trama non installa omp in nessun altro modo: è lo script a scegliere bun o il binario.
- Il terminale non ha `TRAMA_AGENT`, `TRAMA_TERMINAL`, hook né ghost e non entra nel registro dei lavori. Resta aperto con l'uscita dell'installer finché il developer non lo chiude.
- Quando il comando finisce (o il terminale si chiude), Trama dimentica l'esito del controllo degli aggiornamenti e rifà la verifica di omp nel wizard e nella scheda Settings, se sono aperti, così il passo e la riga dello stato si aggiornano da soli. Un lavoro che non era partito perché omp mancava non riparte: il developer lo rilancia.
- Nel wizard e nella scheda Settings `Install omp` è un `Button` di shadcn/ui nella variante predefinita, con l'icona lucide `Download` a sinistra del testo e il tooltip `Open a terminal that installs omp with its official installer`; nell'avviso di omp mancante è un pulsante dell'avviso con lo stesso testo. Il webview manda `installOmp` senza dati, validato da `parseToHost`.

Test: un test dell'host, con il terminale finto, prova nome, cartella, comando per sistema e l'assenza delle variabili dell'agente, e che la fine del comando rifà la verifica e dimentica l'esito del controllo.
