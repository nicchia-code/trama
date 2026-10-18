---
technical: false
refs:
  - question-round
  - requirements/rules#question-round
  - requirements/tech#question-round
---
# Domande dalla sandbox di Cursor

A Task finito, un round chiesto dall'agente della chat di Cursor arriva all'overlay del pannello Trama anche quando il comando gira nella sandbox di Cursor, e il tool di domande di Cursor resta l'ultima risorsa.

- Nella sandbox di Cursor su Linux (`CURSOR_SANDBOX` impostato, `CURSOR_ORIG_UID` intero) la riga di comando usa `CURSOR_ORIG_UID` al posto di `process.getuid()` nel nome della cartella dei record di discovery (`runtimeDirectory` in `src/core/question-channel.ts`), così `trama ask`, le segnalazioni di attività, gli annunci e `trama drift autopilot` trovano l'editor. I controlli di proprietario e permessi restano quelli di oggi; fuori dalla sandbox e su macOS nulla cambia (`tech#question-round`).
- `question-round/Not asked` → Unanswered si divide in due casi: se l'editor non è raggiungibile e la richiesta non viene dalla sandbox di Cursor, il `reason` resta «Editor not available for this project. Use the agent's own question tool instead.»; se viene dalla sandbox (`CURSOR_SANDBOX` impostato), il `reason` è «Editor not reachable from Cursor's sandbox. Run the same trama ask once more outside the sandbox before using your own question tool.». `docs/cli.md` riporta i due testi.
- In `question-round/Unanswered`, se la richiesta veniva dalla sandbox di Cursor, l'agente chiede lo stesso round una volta fuori dalla sandbox, chiedendo il permesso a Cursor, e solo se anche lì l'editor non è raggiungibile usa le sue domande.
- Skill `trama-design` e `trama-import` (in `skills/`): l'intervista nomina `trama ask` al posto di «your question tool»; l'elenco dei ripieghi per agente ha una voce per Cursor che nomina `AskQuestion` e dice che è permesso solo dopo un `status: "unavailable"` ottenuto fuori dalla sandbox di Cursor. `trama-resolve-drifts` dice lo stesso nel suo ripiego. `trama-setup` continua a rimandare a `trama-design`; `trama-scan` non cambia (`rules#question-round`).
- Il riferimento al vecchio Requisito «il sandbox può nascondere i socket sotto `XDG_RUNTIME_DIR`, non provato» sparisce da codice, skill e documentazione dove compare.
- Verifica: con `unshare --user --map-root-user` e `CURSOR_SANDBOX=native CURSOR_ORIG_UID=<uid vero>`, `trama ask --root .` con un round valido apre l'overlay in una finestra Trama aperta sul progetto; senza `CURSOR_ORIG_UID`, o senza finestre, risponde `unavailable` con il `reason` della sandbox.
