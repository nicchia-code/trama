---
description: "Usa quando lavori sui round di domande."
---
# Tecnologia dei round di domande

## question-round
- Expose `trama ask`, reading the round as JSON from standard input and waiting until it can print the result as JSON to standard output. When no editor is connected for the project it prints explicit editor unavailability instead of an answer. Keep diagnostics off standard output so agents can consume the result. This command displays no terminal question interface.
- L'overlay fa parte del webview del pannello, nello stesso bundle delle schede, senza nuove librerie runtime e senza un secondo webview. La Quick Pick e l'input box nativi non si usano più per le domande; il loro codice sparisce.
- Lo stato del round (domande, posizione, risposte confermate, scelte e testo non confermati, riepilogo, riduzione a barra) vive nell'host dell'estensione, non nel webview. Il webview riceve lo stato e manda solo le azioni del developer; l'host le controlla e risponde con lo stato nuovo. Così un pannello chiuso e riaperto, o un webview ricreato, mostra il round esattamente come era. Il testo scritto arriva all'host mentre si scrive, con un breve ritardo, per non perderlo se il pannello si chiude.
- Quando un round entra in Asking, l'host crea il pannello se non c'è o lo porta in primo piano (`reveal` con focus), poi gli manda il round. Il comportamento è lo stesso in VS Code e in Cursor.
- La notifica dopo la chiusura del pannello è `vscode.window.showInformationMessage` con il pulsante `Reopen`; non si può ritirare, quindi `Reopen` controlla se il round esiste ancora.
- The extension accepts `trama ask` question requests over a user-local Unix-domain socket, or a named pipe on Windows, accessible only to the current OS user. Do not expose an HTTP port or remote service and do not add runtime libraries for this transport.
- Supply the launching window's endpoint in the environment of Trama agent terminals. `trama ask` without that address discovers a live endpoint for the same project through user-local runtime records outside the repository, using focus recency to select a window. Stale records are not a reachable editor.
- Preserve workspace/project routing independently of the process working directory, through `trama ask --root <project>`.
- Propagate the interruption of `trama ask` (SIGINT or SIGTERM) and its disconnection to the round's lifecycle. Close controls only for the affected round and release its queue position. Client-side timeouts that are not signalled to Trama cannot be detected; observable cancellation or disconnection is required to remove those rounds.
- Distinguish initial editor connection failure from loss of an established editor connection after sending a validated round. Connection failure before submission returns initial editor unavailability. Closure or failure of the editor connection after submission and before a complete result returns the shared `editor-interrupted` error without answers; do not wait for a response timeout or translate it into the fallback result.
- For `editor-interrupted`, `trama ask` prints the error with its code and message as JSON on stdout and exits with failure, keeping diagnostics on stderr. This ends the waiting operation, not external agent processes. The agent skills enforce stopping the workflow awaiting those decisions.
- Il sandbox di Cursor può nascondere i socket sotto `XDG_RUNTIME_DIR` (indizio nel suo programma `cursorsandbox`; non provato): se `trama ask` risponde che l'editor non è raggiungibile mentre il comando gira nel sandbox (`CURSOR_SANDBOX` impostato), le skill dicono all'agente di ripeterlo una volta fuori dal sandbox, chiedendo il permesso a Cursor, e solo dopo di usare le sue domande.
- `docs/cli.md` e le skill `trama-design` e `trama-import` descrivono i campi facoltativi `context` e `details` della richiesta di `trama ask`.
- Cursor sposta in background un comando che dura più di 30 secondi (documentato nel suo strumento di attesa). Le skill dicono all'agente di aspettare la fine di `trama ask` fino al risultato, senza considerarlo fallito né ripeterlo.

