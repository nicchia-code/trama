---
technical: false
refs:
  - panel/Settings
  - panel/Open/developer.SHOW_SETTINGS
  - agent-launching
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/quality#panel/Settings
---
# Suggerire i modelli nei ruoli della scheda Settings

Quando il Task è finito, nella scheda Settings i tre ruoli dei modelli (`trama.analysis`, `trama.scan`, `trama.execution`) sono campi di testo che suggeriscono anche, in una tendina nativa dello stesso campo, i modelli dell'agente scelto, così il developer può scriverne il nome o sceglierlo.

- Fonti, secondo l'agente effettivo: per la chat di Copilot i modelli che l'editor mette a disposizione della chat (`vscode.lm.selectChatModels()`, nella forma che la ricerca del ruolo già accetta); per la chat di Cursor l'elenco che Cursor tiene in locale nel suo database di stato (`availableDefaultModels2`, letto in sola lettura con `node:sqlite`); per omp quelli di `omp models --json` (`selector` come valore, `name` come etichetta). Per Claude Code il campo resta un semplice testo.
- `developer.SHOW_SETTINGS` → Settings: aprire la scheda prepara l'elenco; lo prepara anche un cambio di `trama.agent` e, per Copilot, un cambio dei modelli dell'editor (`vscode.lm.onDidChangeChatModels`). Un risultato vecchio arrivato dopo uno più recente si scarta.
- `developer.CHANGE_SETTING` → Settings: il campo di testo conferma quando perde il fuoco o con Invio, e scegliere uno dei modelli suggeriti conferma subito. Un nome che non è fra i suggerimenti resta valido come prima; un nuovo elenco non cambia il testo del campo.
- Quando l'elenco non si può avere (programma assente, errore, nessun modello, voce di Cursor mancante o di forma diversa) il campo resta un semplice testo, senza avvisi. La scheda resta usabile mentre l'elenco si prepara; omp ha al massimo 15 s.
- Le voci compaiono nell'ordine della fonte, una sola volta per valore, con il nome leggibile come etichetta solo quando è diverso dal valore.
- Il messaggio `modelSuggestions` è separato da `settings` e il webview lo chiede con `modelSuggestionsWanted` quando la vista Settings diventa visibile, come in `requirements/tech#panel/Settings`.
- Test `bun:test` per la lettura del database di Cursor (un `state.vscdb` temporaneo: valori, etichette, ordine, e l'elenco vuoto con file assente, voce assente, JSON non valido, forma diversa) e per la lettura dell'uscita di omp (valida e non valida).
- Il `CHANGELOG.md` registra i suggerimenti dei modelli nella scheda Settings.
