---
description: "Usa quando mostri richieste di design, terminale dell'agente, scelta dell'agente e dei modelli e Hold scan."
---
# Interfaccia del lavoro dell'agente

## design-request
- Le richieste di design hanno due pulsanti, uno accanto all'altro, in ogni barra che oggi ha «Design…» (Diagram, Board e Requirements): «Quick request…» apre la casella di una riga di oggi, con titolo «Quick Design Request», e «Design…» apre il documento Markdown della richiesta scritta. Il tooltip di «Quick request…» è «Ask an agent to design a change in one line»; quello di «Design…» è «Write a design request in Markdown and send it to an agent».
- Nella palette i comandi sono «Trama: Quick Design Request…» (la casella) e «Trama: Design…» (il documento). Il comando «Trama: Design with Agent…» non esiste più.
- Il pulsante della scheda si chiama «Send to agent», con l'icona `send` del tema dell'editor, e compare solo sulle schede delle richieste mai inviate. Il suo tooltip è «Send to agent (closing the tab sends it too)».
- Il documento nuovo è completamente vuoto: nessun testo segnaposto, nessun commento, nessun modello. La scheda mostra il nome del file, cioè data e ora.
- Dopo l'invio non compare nessun messaggio di conferma oltre a quelli del launcher; la scheda è chiusa. Chiudere una richiesta vuota non mostra nessun messaggio.

## agent-terminal
- La descrizione di `trama.agentLauncher`, in inglese, elenca i valori: `auto` (chat in Cursor, terminale integrato negli altri editor), `terminal` (il terminale integrato dell'editor), `terminal-tab` (il terminale integrato dell'editor, aperto come scheda dell'editor accanto a quella attiva), `external-terminal` (una finestra del terminale predefinito del sistema, fuori dall'editor; solo Linux e macOS) e `chat` (la chat dell'editor).
- Con `terminal` (e con `auto` fuori da Cursor) Trama non mostra il terminale dell'agente quando lo apre o lo riusa: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Il terminale compare nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Vale per ogni avvio: pulsanti, scansione automatica dopo un'approvazione, «Scan now» e Hold scan spento.
- Con `terminal-tab` la scheda del terminale si apre in un gruppo accanto a quello attivo, così il pannello Trama resta visibile; se la scheda precedente dell'agente è ancora aperta, una scheda nuova si apre nel gruppo in cui Trama aveva aperto quella, senza creare un altro gruppo. Quando Trama apre o riusa la scheda, la porta in primo piano nel suo gruppo ma non le dà il focus: il cursore e la tastiera restano nell'editor o nel pannello in cui erano. Il titolo della scheda è il nome del terminale: il numero breve del Task o della Proposal (per esempio `T3`, `P2`), oppure `Design`, `Scan`, `All tasks` o `Import` (vedi `rules`).
- La descrizione di `trama.externalTerminalCommand`, in inglese, dice: comando che apre il terminale esterno con `external-terminal` al posto di quello rilevato; `{command}` è sostituito dalla riga di comando dell'agente, aggiunta in fondo se manca; per esempio `alacritty -e {command}`; vuota (il default) rileva il terminale di sistema; con un valore non vuoto si apre sempre una finestra nuova; vale solo nelle impostazioni utente.
- Se la finestra esterna non si può aprire: messaggio di errore `Trama could not open an external terminal: <reason>. The instruction was copied to the clipboard.` con `<reason>` uno tra `external terminals are not supported on this platform`, `external terminals are not available in a remote workspace`, `no terminal was found; set trama.externalTerminalCommand`, `the terminal could not be started` e il messaggio dell'errore del sistema. Senza pulsanti.
- Se il riuso di una finestra esterna fallisce: messaggio di avviso (warning) `Trama could not reuse the external terminal window: <reason>. A new window was opened.` con `<reason>` il messaggio dell'errore dello scripting del terminale, senza pulsanti.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## agent-launching
- La scelta dell'agente alla prima corsa è un elenco con titolo `Choose the agent Trama starts in the terminal` e le voci, in quest'ordine, `omp`, `Claude Code`, `Codex`, `Copilot CLI`, `Cursor CLI` e `Other command…`; ogni agente noto ha come descrizione il comando che Trama avvia (`omp`, `claude`, `codex`, `copilot -i`, `agent`). Esc annulla.
- Le descrizioni delle impostazioni, in inglese: `trama.terminalAgent` elenca i cinque agenti e `custom` (usa `trama.agentCommand`); `trama.analysis`, `trama.scan` e `trama.execution` dicono quali lavori usano quel modello, che il nome va scritto come lo accetta l'agente, che vuoto lascia il modello predefinito dell'agente e che in chat non vale; `trama.system1` dice che `jev` manda all'API di TypeSafe, per ogni Machine scansionata, il Modello, i Requisiti e gli estratti di codice scelti dall'agente, e che la chiave si salva con `Trama: Set System 1 API Key`.
- Nella palette i comandi sono `Trama: Set System 1 API Key` e `Trama: Clear System 1 API Key`. Il primo apre una casella con il testo nascosto (`password: true`), titolo `Jev API key`, e salva solo un valore non vuoto; Esc non cambia nulla. Dopo il salvataggio compare `Trama: the Jev API key is saved.`; dopo la cancellazione `Trama: the Jev API key is cleared.`.
- L'avviso dei ruoli in chat è un messaggio informativo senza pulsanti: `Trama: model roles (trama.analysis, trama.scan, trama.execution) apply only to terminal agents. The chat uses the model chosen in the chat.`
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## scan-hold
- I testi sono in inglese e non seguono `trama.language`. In ogni barra che ha `Design…` (Diagramma, Board e Requirements), subito dopo quel pulsante, c'è uno switch con etichetta `Hold scan`; con N Proposal in sospeso, N > 0, l'etichetta è `Hold scan · N`. Nel Diagramma lo switch sta prima di `Scan`.
- Il tooltip è `When on, approvals wait and one scan runs when you turn it off.`
- Il nome accessibile è `Hold scan`, seguito da `, N held` quando N > 0, e lo stato, acceso o spento, è annunciato. Il controllo è uno switch.
- Un click cambia subito, senza conferma. Le tre schede mostrano lo stesso stato e lo stesso numero, anche quella nascosta.
- Spegnere quando nessuna Proposal in sospeso tocca più una Feature: avviso `Hold scan is off. The held Proposals no longer affect any Feature, so there was nothing to scan.`
- Spegnere quando l'istruzione non è consegnata: lo switch resta acceso e compare l'avviso `The held scan was not started, so Hold scan stays on.`, oltre all'eventuale messaggio del launcher.
- Un file illeggibile mostra lo switch spento e l'avviso `Trama could not read the Hold scan switch, so it is off.`
- Una scrittura fallita lascia lo switch com'era e mostra l'avviso `Trama could not save the Hold scan switch.`
