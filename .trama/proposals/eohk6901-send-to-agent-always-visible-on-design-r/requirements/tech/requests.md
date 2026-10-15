---
description: "Usa quando lavori su richieste di design scritte."
---
# Tecnologia di design request

## design-request
- Design… scrive subito il file vuoto con l'ID nuovo, creando la cartella e il suo `.gitignore` se mancano, e lo apre con `vscode.window.showTextDocument` in una scheda non in anteprima. Non si usano documenti senza titolo.
- L'host salva da sé ogni documento aperto di un file in `.trama/requests/` del progetto al più 300 ms dopo l'ultima modifica (`workspace.onDidChangeTextDocument` seguito da `TextDocument.save()`), senza dipendere dall'impostazione `files.autoSave` dell'editor.
- La chiusura della scheda si riconosce con `window.tabGroups.onDidChangeTabs` (schede chiuse), solo quando nessun'altra scheda mostra più lo stesso file; il testo da inviare si legge dal file su disco. La chiusura della finestra non passa da lì e non invia nulla.
- L'elenco degli ID inviati sta in `ExtensionContext.workspaceState`. Un ID entra nell'elenco solo quando l'istruzione è davvero partita.
- Send to agent è il comando `trama.sendDesignRequest` con icona `$(send)` in `menus.editor/title`, visibile solo quando il documento attivo è un file in `.trama/requests/` del progetto mai inviato. Una chiave di contesto impostata dall'host decide la visibilità. Il comando salva il documento, manda l'istruzione e, solo se è partita, chiude la scheda senza che questa chiusura invii una seconda volta.
- La voce di menu ha gruppo `navigation@-100`. La barra delle azioni dell'editor mostra al massimo 9 azioni e manda le altre nel menu `…` cominciando dalle ultime; il gruppo `navigation` è ordinato per ordine crescente, con 0 per le voci senza ordine. Un ordine negativo mette Send to agent prima delle icone delle altre estensioni, così non esce mai dalla barra.
- La CodeLens è un `vscode.languages.registerCodeLensProvider` per i file Markdown sotto `.trama/requests/` del progetto. Restituisce una sola `CodeLens` con range sulla riga 0 e comando `trama.sendDesignRequest`, `title` `$(send) Send to agent` e come argomento l'URI del documento, solo per le richieste che offrono l'icona (mai inviate, non finite e con il file su disco); per le altre non restituisce nulla. Il provider emette `onDidChangeCodeLenses` quando una richiesta diventa inviata o finita, così la CodeLens sparisce subito.
- `trama proposal new` accetta `--request <id>` e lo scrive nel campo `request` della Proposal. `trama proposal submit` cancella `.trama/requests/<id>.md` della Proposal legata dopo che la consegna è riuscita e lo dice nel suo output. Né la riga di comando né l'estensione hanno altri comandi per le richieste.
- L'estensione si accorge della cancellazione del file (dalla consegna o da fuori) con l'osservatore dei file che già usa per `.trama/` e chiude la scheda del file solo se non ha modifiche non salvate.
- La skill `trama-design` (in `skills/trama-design/SKILL.md`) descrive la richiesta scritta: leggere il file nominato dall'istruzione, intervistare in modo completo, passare `--request <id>` solo alla prima `trama proposal new` del design.
