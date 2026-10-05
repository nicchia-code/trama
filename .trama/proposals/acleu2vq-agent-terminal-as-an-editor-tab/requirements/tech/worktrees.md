---
description: "Usa quando lavori su richieste di design, worktree e multi-branch."
---
# Tecnologia di design request e worktree

## design-request
- Design… scrive subito il file vuoto con l'ID nuovo, creando la cartella e il suo `.gitignore` se mancano, e lo apre con `vscode.window.showTextDocument` in una scheda non in anteprima. Non si usano documenti senza titolo.
- L'host salva da sé ogni documento aperto di un file in `.trama/requests/` del progetto al più 300 ms dopo l'ultima modifica (`workspace.onDidChangeTextDocument` seguito da `TextDocument.save()`), senza dipendere dall'impostazione `files.autoSave` dell'editor.
- La chiusura della scheda si riconosce con `window.tabGroups.onDidChangeTabs` (schede chiuse), solo quando nessun'altra scheda mostra più lo stesso file; il testo da inviare si legge dal file su disco. La chiusura della finestra non passa da lì e non invia nulla.
- L'elenco degli ID inviati sta in `ExtensionContext.workspaceState`. Un ID entra nell'elenco solo quando il launcher ha davvero mandato l'istruzione.
- Send to agent è un comando dell'estensione con un'icona nella barra del titolo dell'editor (`menus.editor/title`, gruppo `navigation`), visibile solo quando il documento attivo è un file in `.trama/requests/` del progetto mai inviato. Una chiave di contesto impostata dall'host decide la visibilità. Il comando salva il documento, manda l'istruzione e, solo se è partita, chiude la scheda senza che questa chiusura invii una seconda volta.
- `trama proposal new` accetta `--request <id>` e lo scrive nel campo `request` della Proposal. `trama proposal submit` cancella `.trama/requests/<id>.md` della Proposal legata dopo che la consegna è riuscita e lo dice nel suo output. Né la riga di comando né l'estensione hanno altri comandi per le richieste.
- L'estensione si accorge della cancellazione del file (dalla consegna o da fuori) con l'osservatore dei file che già usa per `.trama/` e chiude la scheda del file solo se non ha modifiche non salvate.
- La skill `trama-design` (in `skills/trama-design/SKILL.md`) descrive la richiesta scritta: leggere il file nominato dall'istruzione, intervistare in modo completo, passare `--request <id>` solo alla prima `trama proposal new` del design.

## worktree-round
- `trama.worktreeAgent` è una stringa, scope solo utente, default vuoto, come `trama.agentCommand`: `{prompt}` è sostituito dal prompt quotato per la shell, oppure il prompt è accodato se manca. Se la chiave non c'è nel file delle impostazioni utente, Trama la scrive vuota, senza sovrascrivere un valore già presente.
- Il terminale del worktree nasce nella cartella del worktree, si chiama «Trama agent», con `TRAMA_AGENT=1`, ed esegue `trama.worktreeAgent`. Non usa il launcher della chat e sta sempre nell'area dei terminali, anche con il launcher «terminal-tab». La cartella è sorella del repository: `<cartella padre>/<nome del repository>.trama-worktrees/<id>`, e per il merge `.../merge`.
- Il worktree si crea con git dal commit in testa al branch corrente (`git worktree add -b`). Se il branch `trama/<id>` o `trama/merge` esiste già, l'accettazione o l'unione è rifiutata e il motivo è detto.
- `terminal.COMMAND_ENDED` di un terminale di worktree rilascia solo i Task presi in quel worktree. La fine del terminale ordinario non li rilascia.
- La Board del progetto aperto legge Proposal, Task e Drift dei worktree del giro, e scrive lì la decisione su un Drift. `trama task next` nella cartella aperta non vede quei Task.

## multi-branch
- L'estensione non dichiara `trama.multiBranch`. Una chiave già presente in un file di impostazioni resta dov'è: non è letta e non è cancellata.
- Il pannello e `trama proposal approve` leggono `.trama/multi-branch/state`. L'interruttore è acceso solo se, tolto al più un a capo finale, il testo è `on`.
- Accendere scrive `on` solo se `trama.worktreeAgent`, tolti gli spazi agli estremi, non è vuoto, creando la cartella e il `.gitignore` se mancano. Spegnere scrive `off`, creando cartella e `.gitignore` allo stesso modo. Un'accensione rifiutata non scrive.
- Il pannello osserva quel file. Un cambio, anche da un'altra finestra sullo stesso progetto, aggiorna l'interruttore su tutte le schede, anche quelle nascoste.
- Gli avvisi del pannello sono messaggi di avviso dell'editor. `trama proposal approve` stampa lo stesso testo. Acceso, il comando segue la stessa strada del pannello verso il worktree; spento o illeggibile, applica la Proposal nella cartella aperta.
