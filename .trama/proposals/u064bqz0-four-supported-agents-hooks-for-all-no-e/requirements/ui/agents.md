---
description: "Usa quando mostri richieste di design, terminale dell'agente, scelta dell'agente e dei modelli e Hold scan."
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
- Con `panel` Trama non mostra il terminale dell'agente quando lo apre: l'area dei terminali non si apre se è chiusa, il terminale visibile al suo interno resta quello che era, e cursore e tastiera restano nell'editor o nel pannello in cui erano. Il terminale compare nell'elenco dei terminali con il suo nome, da dove il developer lo apre a mano. Vale per ogni avvio: pulsanti, scansione automatica dopo un'approvazione, «Scan now» e Hold scan spento.
- Con `editor` la scheda del terminale si apre in un gruppo accanto a quello attivo, così il pannello Trama resta visibile; se la scheda precedente dell'agente è ancora aperta, una scheda nuova si apre nel gruppo in cui Trama aveva aperto quella, senza creare un altro gruppo. Quando Trama apre la scheda, la porta in primo piano nel suo gruppo ma non le dà il focus: il cursore e la tastiera restano nell'editor o nel pannello in cui erano. Il titolo della scheda è il nome del terminale: il numero breve del Task o l'identità permanente della Proposal (per esempio `T3`, `a1b2c3d4`), oppure `Design`, `Scan`, `All tasks`, `Drifts` o `Import` (vedi `rules`).
- Con `trama.autoExit` acceso il terminale, nell'area o in scheda, sparisce da solo appena l'agente ha finito, senza avvisi: ciò che l'agente ha archiviato è sulla Board. Nessun messaggio sostituisce il resoconto dell'agente.
- Tutti questi testi sono in inglese e non seguono `trama.language`.

## agent-launching
- Non c'è nessuna scelta dell'agente alla prima corsa: senza un valore in `trama.agent` vale `chat`.
- Le descrizioni delle impostazioni, in inglese: `trama.analysis`, `trama.scan` e `trama.execution` dicono quali lavori usano quel modello, che il nome va scritto come lo accetta l'agente (omp o Claude Code), che vuoto lascia il modello predefinito dell'agente e che in chat non vale; `trama.system1` dice che `jev` manda all'API di TypeSafe, per ogni Machine scansionata, il Modello, i Requisiti e gli estratti di codice scelti dall'agente, e che la chiave si salva con `Trama: Set System 1 API Key`.
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
