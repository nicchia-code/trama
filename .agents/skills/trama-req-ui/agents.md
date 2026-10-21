# Requirements: Interfaccia, Interfaccia del lavoro dell'agente

Usa quando mostri richieste di design, terminale dell'agente, agente e modelli, e gli avvisi dell'Advisor della chat.

## design-request

- Una richiesta di design si apre con un solo pulsante, «+ Add Work Item», in fondo alla colonna Backlog della Board (vedi `panel/Board`), che apre il documento Markdown della richiesta scritta; il suo tooltip è «Write a work item in Markdown and send it to an agent». Non c'è più «Quick request…», né la sua casella di una riga «Quick Design Request», né «Add Work Item…» nella barra; il Diagramma e la scheda Requirements non hanno pulsanti per progettare una modifica.
- Il pulsante della scheda si chiama «Send to agent», con l'icona `send` del tema dell'editor, e compare solo sulle schede delle richieste mai inviate. Il suo tooltip è «Send to agent (closing the tab sends it too)».
- Il file nuovo è completamente vuoto: nessun testo segnaposto, nessun commento, nessun modello. La scheda mostra il nome del file, cioè data e ora; questo vale anche per la richiesta di setup di Start from Scratch.
- Testo fantasma, solo visivo e mai nel file, all'inizio della prima riga, grigio (il colore del testo disattivato del tema dell'editor), su una sola riga:
  - richiesta di design (+ Add Work Item): «Describe the change to design: behaviour, edge cases, requirements. Paste or drop images for context. Close this tab or press Send to agent when you are done.»
  - richiesta di setup: «Describe the application to build: what it does and who it is for. Paste or drop images for context. Close this tab or press Send to agent when you are done.»
- Il testo fantasma si vede solo sulle schede delle richieste mai inviate e solo finché il documento non ha nessun carattere (nemmeno uno spazio o un a capo). Sparisce alla prima battuta e torna se il developer cancella tutto; non si vede mai su una richiesta inviata. È in inglese e non segue `trama.language`.
- Dopo l'invio non compare nessun messaggio di conferma oltre a quelli della consegna; la scheda è chiusa. Chiudere una richiesta vuota non mostra nessun messaggio.

## agent-terminal

- La descrizione di `trama.agent`, in inglese, elenca i valori: `cursor` (Cursor's chat, only in Cursor; the default) e `omp` (omp in the editor's integrated terminal, in any editor). Quella di `trama.terminalLocation`: `panel` (the terminal area; the default) e `editor` (a terminal tab in the active editor group); vale solo per `omp`. Quella di `trama.autoExit`: close the agent's terminal as soon as the agent is idle or its command ends (default on); with it off, idle terminals stay open and every instruction still opens a new one. La scheda Settings mostra un valore rimasto che non è fra quelli ammessi (`chat`, `claude`) come `cursor`, il valore che vale.
- `trama.submitWhileRunning` è un interruttore, spento per impostazione predefinita. La sua descrizione, in inglese, è «Let a run start while another run started by Trama is in progress. Off (the default): Run and Run all are unavailable while a run started by Trama is in progress. On: a run can start while another one is in progress.»
- Con `panel` Trama non mostra il terminale dell'agente quando lo apre: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Il terminale compare nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Vale per ogni avvio dai pulsanti e dai comandi.
- Con `editor` la scheda del terminale si apre nel gruppo attivo, come ultima scheda accanto a quelle già aperte; Trama non crea mai un gruppo nuovo e non sposta le altre schede. Ogni scheda nuova va nel gruppo attivo del momento in cui Trama la apre, anche se una scheda precedente dell'agente è ancora aperta in un altro gruppo. Quando Trama apre la scheda, la porta in primo piano nel gruppo, anche sopra il pannello Trama se il pannello sta in quel gruppo, ma non le dà il focus: il cursore e la tastiera restano nell'editor o nel pannello in cui erano. Il titolo della scheda è il nome del terminale: il numero breve del Task (per esempio `T3`), oppure `Design`, `Scan`, `All tasks`, `Drifts` o `Import` (vedi `rules`).
- Con `trama.autoExit` acceso il terminale, nell'area o in scheda, sparisce da solo appena l'agente ha finito, senza avvisi: ciò che l'agente ha archiviato è sulla Board. Nessun messaggio sostituisce il resoconto dell'agente.
- L'avviso della shell sostituita su Windows è un messaggio informativo senza pulsanti: `Trama: the default terminal shell (<shell>) is not supported for agents on Windows; the agent runs in Windows PowerShell.`, con `<shell>` il nome del programma della shell predefinita (per esempio `cmd.exe` o `wsl.exe`).
- L'avviso della chat di Cursor fuori da Cursor è un messaggio informativo con un pulsante: `Trama: Cursor's chat is only available in Cursor. The prompt is on the clipboard; choose omp in Trama's Settings to run the agent in a terminal.`, con il pulsante `Open Settings`, che apre il pannello di Trama sulla scheda Settings. Compare al posto dell'avviso degli appunti di Cursor, mai insieme a lui.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## agent-launching

- Non c'è nessuna scelta dell'agente alla prima corsa: senza un valore in `trama.agent` vale `cursor`.
- Le descrizioni delle impostazioni, in inglese: `trama.analysis`, `trama.scan` e `trama.execution` dicono quali lavori usano quel modello (`trama.scan` anche i sotto-agenti che confrontano le Machine, compresi quelli del pre-flight dei Run, e, con l'Advisor Scanner, gli advisor di omp che guardano i Run; nessuna descrizione nomina una scansione dopo l'approvazione), che il nome va scritto come lo accetta l'agente scelto in `trama.agent` (omp o la chat di Cursor), che vuoto lascia il modello predefinito dell'agente e che al sotto-agente della chat di Cursor `trama.scan` arriva con Update skills; `trama.maxParallelAgents` dice: how many sub-agents the agent may run at once, in a scan, in the exploration of a design or of a Drift resolution and in a run of Tasks (default 20; agents without sub-agents ignore it). La descrizione di `trama.skillsDir` non nomina altre cartelle oltre al predefinito `.agents/skills`.
- `trama.experimentalContextSharing` ha il titolo `Experimental Context Sharing`, una `Checkbox` nel gruppo `Experimental` (`ui#panel/Settings`), e la descrizione: «Experimental. Only with an agent that has sub-agents. On: when the agent hands work to its sub-agents, it passes each one the part of what it has already read that concerns that work (Trama's texts quoted as they are, and where the code is), so sub-agents do not read it again; they still read the code themselves. Off (the default): each sub-agent reads what it needs on its own. Only agents started by Trama follow it.»
- L'impostazione `trama.driftAutoPilot` non c'è più: né nelle impostazioni dell'editor né nella scheda Settings.
- Non ci sono più i comandi `Trama: Set System 1 API Key` e `Trama: Clear System 1 API Key`, né l'impostazione `trama.system1`.
- Non c'è più l'avviso del modello non trovato di Copilot né l'avviso dei ruoli in chat.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## chat-advisor

- Un Run della chat finito senza l'esito della revisione finale (`rules#chat-advisor`) mostra in cima alla Board, con gli avvisi dei ghost e nello stesso stile, `The Run finished without the Advisor's final review: <motivo>.`, con il motivo in inglese di `rules#chat-advisor`, e il pulsante `Close` con l'icona `X`. Un avviso per Run; resta fino alla chiusura manuale o del pannello, come gli avvisi dei ghost. Il testo non segue `trama.language`.
- Le revisioni dell'Advisor della chat non hanno ghost, badge né altri segni sulla Board: si vedono solo nella conversazione dell'agente.
- I testi che Trama aggiunge alla conversazione (`rules#chat-advisor`) sono per l'agente e restano in inglese, qualunque sia `trama.language`.
