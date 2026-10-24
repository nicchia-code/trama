# Requirements: Interfaccia, Interfaccia del lavoro dell'agente

Usa quando mostri richieste di design, terminale dell'agente, agente e modelli e gli avvisi del controllo di esecuzione.

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

- Le descrizioni, in inglese, seguono la regola dei tooltip di `ui#General`. `trama.ompPath`: «Path of the `omp` program Trama runs for every agent, the model list and the checks. Empty looks for `omp` in the editor's PATH, then in `~/.bun/bin` and `~/.local/bin`.». `trama.terminalLocation`: «Where `omp` terminals open: `panel` (the terminal area; the default) or `editor` (a tab in the active editor group).». `trama.ignoreInstructionFiles`, titolo `Ignore Instruction Files`: «Trama's jobs ignore agent instruction files (AGENTS.md, CLAUDE.md, Cursor rules, .omp/RULES.md) in the project, the folders above it and your user folders. Off by default.». `trama.autoExit`: «Close the agent's terminal as soon as the agent is idle or its command ends, and ask the agent to skip its final summary (default on).».
- Con `panel` Trama non mostra il terminale dell'agente quando lo apre: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Il terminale compare nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Vale per ogni avvio dai pulsanti e dai comandi.
- Con `editor` la scheda del terminale si apre nel gruppo attivo, come ultima scheda accanto a quelle già aperte; Trama non crea mai un gruppo nuovo e non sposta le altre schede. Ogni scheda nuova va nel gruppo attivo del momento in cui Trama la apre, anche se una scheda precedente dell'agente è ancora aperta in un altro gruppo. Quando Trama apre la scheda, la porta in primo piano nel gruppo, anche sopra il pannello Trama se il pannello sta in quel gruppo, ma non le dà il focus: il cursore e la tastiera restano nell'editor o nel pannello in cui erano. Il titolo della scheda è il nome del terminale: il numero breve del Task (per esempio `T3`), oppure `Design`, `Scan`, `All tasks`, `Drifts` o `Import` (vedi `rules`).
- Con `trama.autoExit` acceso il terminale, nell'area o in scheda, sparisce da solo appena l'agente ha finito, senza avvisi: ciò che l'agente ha archiviato è sulla Board. L'agente, istruito a non scrivere un resoconto (`rules#agent-terminal`), finisce con al più una riga, e nessun messaggio di Trama la sostituisce.
- L'avviso della shell sostituita su Windows è un messaggio informativo senza pulsanti: `Trama: the default terminal shell (<shell>) is not supported for agents on Windows; the agent runs in Windows PowerShell.`, con `<shell>` il nome del programma della shell predefinita (per esempio `cmd.exe` o `wsl.exe`).
- Tutti questi testi sono in inglese e non seguono `trama.language`.
- L'avviso di omp mancante è un messaggio di avviso dell'editor, non modale: `Trama: omp is not installed. Trama runs every agent with omp.`, con i pulsanti `Install omp` (`rules#developer.INSTALL_OMP`) e `Open Settings`, che apre il pannello di Trama sulla scheda Settings, anche se il pannello era chiuso. Compare a ogni lancio rifiutato.
- L'aggiornamento di omp prima di un lancio mostra una notifica di avanzamento dell'editor, senza annulla, con il testo `Updating omp to <versione>…`, dove `<versione>` è quella che il controllo ha annunciato; sparisce quando l'aggiornamento finisce, riuscito o fallito.
- L'avviso dell'aggiornamento fallito è un messaggio informativo senza pulsanti: `Trama: could not update omp (<motivo>). The agent runs with omp <versione>.`, con `<motivo>` uno di quelli di `tech#agent-terminal` e `<versione>` la versione attuale, o `the installed version` quando non è nota.

## agent-launching

- Non c'è nessuna scelta dell'agente, né alla prima corsa né nelle impostazioni: l'agente è sempre omp, e `trama.agent` non esiste più.
- Le descrizioni delle impostazioni, in inglese, seguono la regola dei tooltip di `ui#General` e dicono solo quali lavori usano l'impostazione e che cosa vale vuota o predefinita; nessuna nomina una scansione dopo l'approvazione. `trama.analysis`: «Model for design work: design requests, Resolve Drifts and import. Empty (the default) keeps the agent's default model.». `trama.scan`: «Model for scans and the sub-agents that compare Machines, also in each Run's pre-flight. Empty (the default) keeps the agent's default model.». `trama.execution`: «Model for implementing Tasks, in single runs and Run all. Empty (the default) keeps the agent's default model.». `trama.maxParallelAgents`: «How many sub-agents the agent may run at once (default 20). Agents without sub-agents ignore it.». `trama.skillsDir`: «Folder, relative to the project root, where Trama installs the agent skills.». `trama.language`: «Disabled for now: agents write in English. Later: the language the agent writes in, for example `Italian`; code stays in English.».
- `trama.subagentsContextSharing` ha il titolo `Sub-agents Context Sharing`, una `Checkbox` nel sottogruppo `Agents` del gruppo `Advanced` (`ui#panel/Settings`), e la descrizione: «On: the agent passes its sub-agents what it has already read about their work, so they do not read it again.»
- L'impostazione `trama.driftAutoPilot` non c'è più: né nelle impostazioni dell'editor né nella scheda Settings.
- Non ci sono più i comandi `Trama: Set System 1 API Key` e `Trama: Clear System 1 API Key`, né l'impostazione `trama.system1`.
- Non c'è più l'avviso del modello non trovato di Copilot né l'avviso dei ruoli in chat.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## time

- Ogni lavoro che il controllo di esecuzione smette di seguire (`rules#time`) mostra in cima alla Board, con gli avvisi dei ghost e nel loro stesso stile, `Trama stopped following <lavoro>: <motivo>.`, con il pulsante `Close` con l'icona `X`. `<lavoro>` è il nome del terminale (`rules#agent-terminal`: per esempio `T3`, `All tasks`, `Design`, `Scan`). `<motivo>` è `the agent's process is gone` quando il processo di omp, o senza di lui la shell del terminale, non esiste più; `the terminal is gone` quando il terminale non esiste più.
- Un Task liberato perché nessuna finestra segue chi lo teneva, dal controllo o da `trama task check`, mostra `Trama stopped following <numero breve> <titolo>: no window follows its agent.`, con lo stesso pulsante.
- Un avviso per lavoro o per Task, nella sola finestra che ha fatto il controllo; resta fino alla chiusura manuale o del pannello e si disegna anche mentre è aperta un'altra scheda del pannello. Questi avvisi restano accesi anche mentre gli avvisi dei ghost ritirati sono spenti (`ui#announcement`): sono gli unici avvisi in cima alla Board. Il testo non segue `trama.language`.

## developer.INSTALL_OMP

- `Install omp`, nel passo `omp` del wizard e nella riga di omp della scheda Settings, è un `Button` di shadcn/ui nella variante predefinita, con l'icona lucide `Download` a sinistra del testo; tooltip `Open a terminal that installs omp with its official installer`. Nell'avviso di omp mancante è un pulsante dell'avviso con lo stesso testo.
- Il terminale di installazione si chiama `Install omp`, si apre nell'area dei terminali qualunque sia `trama.terminalLocation`, diventa il terminale visibile con il cursore dentro e non ha ghost. I testi sono in inglese e non seguono `trama.language`.
