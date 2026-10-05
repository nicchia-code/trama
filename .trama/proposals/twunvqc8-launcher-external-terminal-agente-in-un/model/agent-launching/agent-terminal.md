# Agent terminal

The terminal in which Trama runs the developer's agent command. Trama remembers only the last terminal it started. Typing a new command into a terminal where an agent is still running would send the command line to the agent as a message, so a busy terminal is never reused.

Questa Machine si muove solo con i launcher del terminale: «terminal», il terminale integrato dell'editor, e «external-terminal», una finestra del terminale di sistema del developer. Con il launcher della chat l'istruzione va invece alla chat dell'editor, in una nuova conversazione dell'agente, e qui non cambia nulla. Il launcher «auto», che è la scelta predefinita, usa la chat in Cursor e il terminale integrato in ogni altro editor; scegliere «terminal», «external-terminal» o «chat» a mano vince sempre.

Con «external-terminal» Trama apre una finestra del terminale predefinito del developer, fuori dall'editor, nella cartella del progetto, con lo stesso contrassegno dell'agente e la stessa identità del terminale integrato, e vi scrive il comando dell'agente avvolto in modo che, quando finisce, avvisi l'editor con il suo esito: così la fine del comando arriva a questa Machine come dal terminale integrato. A comando finito la finestra resta aperta con una shell, perché il developer possa leggere il resoconto dell'agente. Chiudere a mano la finestra non è rilevato, e `terminal.CLOSED` non arriva mai da una finestra esterna: se l'agente stava ancora lavorando, nessuna fine arriva, il ghost sulla Board è ritirato dai quindici minuti di quiete e un Task preso resta preso finché l'agente non lo sposta o il developer non lo riprende.

Una finestra esterna libera si riusa solo se il terminale è Terminal.app, kitty o WezTerm e il developer non ha scelto un comando di terminale di suo; con ogni altro terminale ogni istruzione apre una finestra nuova. Se il riuso fallisce (per esempio la finestra è stata chiusa a mano) si apre una finestra nuova e il developer è avvisato del perché. Se la finestra esterna non si può aprire (nessun terminale trovato, comando di terminale non valido, cartella di lavoro remota) non parte nulla: il developer è avvisato del motivo, l'istruzione va negli appunti e questa Machine non cambia State. Non c'è mai un fallimento silenzioso e non si ripiega sul terminale integrato.

In Cursor la chat riceve l'istruzione e la invia da sola, senza che il developer debba fare altro. Se Cursor non lo permette, l'istruzione resta pronta nella chat e aspetta la conferma e l'Invio del developer, oppure, se nemmeno questo è possibile (per esempio il testo è rifiutato da Cursor), va negli appunti e il developer è avvisato di incollarla. Non c'è mai un fallimento silenzioso. Cursor ha anche un'altra interfaccia per gli agenti, la finestra degli agenti: Trama non la usa, perché il pannello vive nell'editor.

Nella chat di Cursor l'agente non trova da solo il programma `trama`: l'istruzione gli dice dove si trova. Anche la scansione automatica dopo l'approvazione di una Proposal parte da sola solo se la chat invia da sola; se la consegna ripiega sulla conferma o sugli appunti, non resta aperta nessuna chat in attesa, e il developer riceve invece un avviso con un pulsante per lanciare la scansione quando vuole.

Only the command Trama typed into a terminal counts as the agent's command: its start and end are what move this Machine. Another command that starts or ends in the same terminal, such as a shell start-up command or one the developer types, does not. Every terminal Trama starts has an identity of its own, so that what the agent announces from it is known to belong to it.

When the developer has chosen a language in the editor settings, every instruction Trama sends to the agent, with either launcher and whether it comes from a button, an automatic scan or the rework of a stale Proposal, also asks the agent to write in that language everything it generates, except code, which is always English. With no language chosen the instruction asks nothing about language. The choice only reaches agents that Trama starts; it changes nothing in text that already exists.

A design request, which includes asking the agent to rework the stale Proposal of a Drift, announces a Proposal (see the Announcement) as soon as it is sent, because the agent will create one. This holds only with the terminal launchers, integrated or external: with the chat launcher nothing here changes, and the Board shows a ghost from the moment the agent starts the Proposal's Draft.

Se il developer ha indicato un argomento ntfy nelle impostazioni dell'editor, la fine del comando che Trama ha scritto nel terminale fa nascere un avviso (vedi il Notice) per far sapere al developer lontano dal computer che l'agente si è fermato. Ogni istruzione che Trama scrive davvero in un terminale per l'agente annulla gli avvisi sulla fine del comando ancora in attesa.

Lo stesso vale per la chat di Cursor: ogni fine di turno dell'agente di una conversazione di Trama fa nascere un avviso, e un nuovo prompt inviato a quella conversazione annulla gli avvisi sulla fine ancora in attesa (vedi l'Actor cursor-chat).

Un terminale aperto per un worktree non è questo terminale: non lo si riusa, la sua fine non muove questa Machine e non rilascia i Task della cartella aperta. La fine del comando che Trama vi ha scritto fa nascere lo stesso avviso di fine comando.

## States

### No agent terminal (initial)
Trama has no terminal of its own to reuse: none was started yet, or the last one was closed.
- `developer.ASK_AGENT` → Agent running: only with a terminal launcher (integrated or external) and only if an instruction is actually sent. Asks once for the agent command if none is configured and remembers the answer for all projects; cancelling that prompt, or a design request left empty, sends nothing. Opens a new terminal named "Trama agent" in the project folder, marked so that the command line refuses the developer-only decisions to the agent, and types the command with the instruction into it; with the external launcher the terminal is a new window of the system terminal. A design request also announces a Proposal, so that the Board shows its ghost at once.
- `proposal.APPROVED` → Agent running: only for an ordinary change (never an import), only if the approval is not the landing of a worktree round, only if automatic scanning is on, an agent can be started without asking the developer anything (the chat launcher, or an agent command is configured) and the approval affects at least one Feature that still exists. One agent run scans all those Features and is told which Proposal the Tasks it files come from. With the chat launcher the instruction goes to the chat and nothing changes here.

### Agent running
The agent command typed into the terminal has not ended, or the terminal cannot tell whether it did.
- `developer.ASK_AGENT` → Agent running: a new terminal (with the external launcher, a new window) is opened, because a running agent must not receive the instruction as a message; the old terminal is left alone and no longer tracked. A design request announces a Proposal, as from the first State.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State; a new terminal is opened. An approval that lands from a worktree round does not start it.
- `terminal.COMMAND_ENDED` → Agent idle: se il developer ha indicato un argomento ntfy, nasce anche un avviso sulla fine del comando (vedi il Notice); la fine di un altro comando non conta.
- `terminal.CLOSED` → No agent terminal: only for the editor's terminal; a window of the external launcher never reports it.

### Agent idle
The terminal is open and its command has ended, so it is free for the next instruction.
- `developer.ASK_AGENT` → Agent running: the terminal is reused only if its process is still alive and it reports command start and end; otherwise a new one is opened. With the external launcher the window is reused as described above; if it cannot be reused, a new one is opened and the developer is told. A design request announces a Proposal, as from the first State.
- `proposal.APPROVED` → Agent running: same as an automatic scan from the first State, reusing the terminal under the same condition. An approval that lands from a worktree round does not start it.
- `terminal.CLOSED` → No agent terminal: only for the editor's terminal; a window of the external launcher never reports it.

## Events

### INSTRUCTION_SENT
Emessa ogni volta che Trama scrive davvero un'istruzione in un terminale per l'agente, integrato o esterno, che nasca da un bottone, da una scansione automatica o dal rifacimento di una Proposal obsoleta. Non è emessa con il launcher della chat, né se l'istruzione non viene inviata (richiesta vuota, comando dell'agente non scelto, richiesta rifiutata, finestra esterna che non si apre). Annulla gli avvisi sulla fine del comando ancora in attesa.
