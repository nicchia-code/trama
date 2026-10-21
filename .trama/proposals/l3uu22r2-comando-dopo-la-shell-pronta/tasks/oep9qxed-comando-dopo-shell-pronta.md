---
refs:
  - agent-terminal
  - requirements/tech#agent-terminal
  - requirements/quality#agent-terminal
---
# Comando dopo la shell pronta

In `launchAgent` (`extension/src/host/agent.ts`) il comando di omp oggi si scrive con `terminal.sendText(line)` subito dopo `createTerminal`, prima che la shell sia pronta: una riga oltre 1024 byte su macOS (4096 su Linux) perde la coda e l'Invio e resta scritta al prompt, come è successo con Run all.

Quando il Task è fatto:

- Un terminale nasce in Agent running quando Trama manda un'istruzione a omp; il comando si scrive solo quando la shell del terminale è pronta a riceverlo, così parte intero e da solo qualunque sia la lunghezza dell'istruzione, senza restare scritto al prompt in attesa dell'Invio del developer. Se la shell non dice mai di essere pronta, Trama lo scrive comunque dopo un'attesa massima.
- Pronta vuol dire: la shell integration del terminale è attiva (`terminal.shellIntegration` già presente, oppure `vscode.window.onDidChangeTerminalShellIntegration` per quel terminale). Allora la riga si scrive con `terminal.shellIntegration.executeCommand(riga)`. Se non si attiva entro 10 secondi dalla creazione, la riga si scrive con `terminal.sendText(riga)`. La riga si scrive una volta sola, e mai in un terminale già chiuso.
- Il lavoro affidato comincia già all'apertura del terminale: `startJob`, l'annuncio e `onSent` partono subito dopo `createTerminal`, così annuncio, Run e pulsanti indisponibili valgono subito dopo il clic. Se il terminale si chiude prima che il comando sia scritto, il comando non si scrive più e il lavoro finisce con `terminal.CLOSED` come per ogni terminale chiuso (una sequenza di Run all si ferma).
- Nello stato Agent running Trama aspetta la shell oppure il comando scritto non è finito; le Transition su `agent-hook.IDLE`, `terminal.COMMAND_ENDED` e `terminal.CLOSED` restano quelle di oggi. La fine del comando si riconosce come prima, confrontando la riga riferita da `onDidEndTerminalShellExecution` con quella scritta.
- Con `trama.terminalLocation` su `panel` né `executeCommand` né `sendText` mostrano l'area dei terminali o spostano il focus.
- Affidabilità: il comando parte intero qualunque impostazione aggiunga frasi all'istruzione (Advisor Scanner, esecuzione parallela, Drift blocker, Async Drift Resolver, Context Sharing, lingua); fa eccezione solo una shell senza shell integration che impiega più di 10 secondi ad avviarsi.
- Un test dell'host in `test/host-agent-terminals.test.ts`, con il terminale finto, prova che la riga non è scritta prima che la shell integration si attivi e poi lo è, intera, una volta, con `executeCommand`; che senza shell integration è scritta con `sendText` solo dopo i 10 secondi; che un terminale chiuso prima non riceve nulla e il suo lavoro finisce; e che il lavoro e l'annuncio partono all'apertura. I test che oggi leggono la riga dal `sendText` del terminale finto si adattano.
- `CHANGELOG.md` registra la correzione.
