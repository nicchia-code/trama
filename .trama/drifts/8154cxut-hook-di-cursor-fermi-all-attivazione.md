---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#editor-chat
proposal: null
task: cy8i66re
origin: null
critical: false
option: 1
note: null
resolvedBy: xerk21je
created: 2026-10-18T12:56:23.296Z
---
# Hook di Cursor fermi all'attivazione

## What happens

All'attivazione dell'estensione in Cursor non viene scritta nessuna voce di Trama in `~/.cursor/hooks.json`. `activate` chiama solo `installCopilotHooks`, che esce subito quando l'editor è Cursor; le voci di Cursor si scrivono solo a init e a Update skills. Dopo un aggiornamento dell'estensione le voci restano quelle della versione precedente, con il percorso del suo programma, finché il developer non lancia Update skills. Un file di hook che non è JSON valido non produce nessun messaggio all'attivazione.

## What should happen

Il Requisito `tech#editor-chat` dice che le voci di Cursor si scrivono anche a ogni attivazione dell'estensione in Cursor: il percorso del programma cambia a ogni aggiornamento e Cursor non eredita il PATH dell'estensione. All'attivazione il file si riscrive solo se le voci non sono già quelle di questa versione, e un file non valido dà l'errore a ogni attivazione. Il codice non lo fa, e né il Modello né i Requisiti impediscono di farlo: la differenza è solo nel codice.

## Fix options

### Scrivere le voci anche all'attivazione

L'attivazione in Cursor chiama la stessa scrittura di init e di Update skills (`installCursorHooks`), che riscrive il file solo se le voci cambiano, e mostra l'errore anche a ogni attivazione se il file non è valido. Costo: il file dell'utente viene letto a ogni attivazione in Cursor; il Modello e i Requisiti non cambiano.

### Riscrivere solo quando cambia la versione

L'attivazione confronta la versione dell'estensione con quella salvata nella sua memoria e riscrive `hooks.json` solo quando cambia. Costo: una modifica a mano o un file rovinato restano finché non cambia la versione o il developer lancia Update skills, quindi il controllo a ogni attivazione non c'è.

## Where in the code

`extension/src/host/main.ts` (`activate`, che chiama solo `installCopilotHooks`); `extension/src/host/project.ts` (`installCopilotHooks`, che esce subito con Cursor; `installCursorHooks`, chiamata solo da `installEditorHooks`); `src/core/cursor-chat.ts` (`writeCursorHooks`).
