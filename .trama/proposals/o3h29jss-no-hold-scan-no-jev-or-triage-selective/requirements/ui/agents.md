---
description: "Usa quando mostri richieste di design, terminale dell'agente, scelta dell'agente e dei modelli."
---
# Interfaccia del lavoro dell'agente

## design-request
- Le richieste di design hanno due pulsanti, uno accanto all'altro, in ogni barra che oggi ha «Design…» (Diagram, Board e Requirements): «Quick request…» apre la casella di una riga di oggi, con titolo «Quick Design Request», e «Design…» apre il documento Markdown della richiesta scritta. Il tooltip di «Quick request…» è «Ask an agent to design a change in one line»; quello di «Design…» è «Write a design request in Markdown and send it to an agent».
- Nella palette i comandi sono «Trama: Quick Design Request…» (la casella) e «Trama: Design…» (il documento). Il comando «Trama: Design with Agent…» non esiste più.
- Il pulsante della scheda si chiama «Send to agent», con l'icona `send` del tema dell'editor, e compare solo sulle schede delle richieste mai inviate. Il suo tooltip è «Send to agent (closing the tab sends it too)».
- Il documento nuovo è completamente vuoto: nessun testo segnaposto, nessun commento, nessun modello. La scheda mostra il nome del file, cioè data e ora.
- Dopo l'invio non compare nessun messaggio di conferma oltre a quelli della consegna; la scheda è chiusa. Chiudere una richiesta vuota non mostra nessun messaggio.

## agent-terminal
- La descrizione di `trama.agent`, in inglese, elenca i valori: `chat` (the editor's chat: Copilot in VS Code, Cursor in Cursor; the default), `omp` (omp in the editor's integrated terminal) e `claude` (Claude Code in the editor's integrated terminal). Quella di `trama.terminalLocation`: `panel` (the terminal area; the default) e `editor` (a terminal tab beside the active editor); vale solo per `omp` e `claude`. Quella di `trama.autoExit`: close the agent's terminal as soon as the agent is idle or its command ends (default on); with it off, idle terminals stay open and every instruction still opens a new one.
- Con `panel` Trama non mostra il terminale dell'agente quando lo apre: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Il terminale compare nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Vale per ogni avvio: pulsanti, scansione automatica dopo un'approvazione e «Scan now».
- Con `editor` la scheda del terminale si apre in un gruppo accanto a quello attivo, così il pannello Trama resta visibile; se la scheda precedente dell'agente è ancora aperta, una scheda nuova si apre nel gruppo in cui Trama aveva aperto quella, senza creare un altro gruppo. Quando Trama apre la scheda, la porta in primo piano nel suo gruppo ma non le dà il focus: il cursore e la tastiera restano nell'editor o nel pannello in cui erano. Il titolo della scheda è il nome del terminale: il numero breve del Task o l'identità permanente della Proposal (per esempio `T3`, `a1b2c3d4`), oppure `Design`, `Scan`, `All tasks`, `Drifts` o `Import` (vedi `rules`).
- Con `trama.autoExit` acceso il terminale, nell'area o in scheda, sparisce da solo appena l'agente ha finito, senza avvisi: ciò che l'agente ha archiviato è sulla Board. Nessun messaggio sostituisce il resoconto dell'agente.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## agent-launching
- Non c'è nessuna scelta dell'agente alla prima corsa: senza un valore in `trama.agent` vale `chat`.
- Le descrizioni delle impostazioni, in inglese: `trama.analysis`, `trama.scan` e `trama.execution` dicono quali lavori usano quel modello (`trama.scan` anche i sotto-agenti che confrontano le Machine), che il nome va scritto come lo accetta l'agente (omp o Claude Code), che vuoto lascia il modello predefinito dell'agente e che in chat non vale; `trama.maxParallelAgents` dice: how many sub-agents the agent may run at once, in a scan, in the exploration of a design and in a run of Tasks (default 20; agents without sub-agents ignore it).
- Non ci sono più i comandi `Trama: Set System 1 API Key` e `Trama: Clear System 1 API Key`, né l'impostazione `trama.system1`.
- L'avviso dei ruoli in chat è un messaggio informativo senza pulsanti: `Trama: model roles (trama.analysis, trama.scan, trama.execution) apply only to terminal agents. The chat uses the model chosen in the chat.`
- Tutti questi testi sono in inglese e non seguono `trama.language`.
