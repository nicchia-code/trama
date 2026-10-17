---
status: approved
base:
  editor-panel/panel.md: 6318abed1eba5e3817077c536226a10d7874216c5b76fa1a355505dde9154c93
  agent-launching/feature.md: 1038d7c9408e84e659adbc6d3f675f1c1fdd18bb48549387ff70e0a8b58c2b1f
  requirements/ui/settings-specs.md: 37b43b981f21acad656c443cdfe00775ef0f633ceec1de8bb3e1225da9afa1d4
  requirements/tech/project-panel.md: 49215375b545433e43274b856b273285cbc63d312fcc43bb660850ba8f9127a6
  requirements/quality/main.md: 4744d44c8b9b4f70f9d4aaf60d76eccf5d4de2f1135409dd297b517b52795f99
  requirements/tech/settings.md: new
delete: []
request: 2026-10-16T11-33-16
created: 2026-10-16T10:01:32.734Z
---
# Modelli suggeriti nei ruoli di Settings

Nella scheda Settings i tre ruoli dei modelli (Analysis, Scan, Execution) sono campi di testo liberi: il developer deve sapere a memoria il nome esatto che l'agente accetta. Con questa Proposal il campo resta libero ma suggerisce, nello stesso componente, i modelli che l'agente scelto offre.

## Decisioni
- Controllo: campo di testo con suggerimenti nativi (`<input list>` + `<datalist>`); il testo libero resta valido come oggi.
- Si suggeriscono solo i modelli dell'agente scelto in `trama.agent`; cambiando agente l'elenco cambia.
- Copilot: `vscode.lm.selectChatModels()`, valore `<name>` per il vendor `copilot` e `<name> (<vendor>)` per gli altri; l'elenco si aggiorna quando cambiano i modelli dell'editor.
- omp: `omp models --json`, valore `selector`, `name` come etichetta; si chiede all'apertura della scheda Settings e al cambio di agente.
- Claude Code: nessun suggerimento (non ha un comando per elencare i modelli).
- Chat di Cursor: si legge l'elenco che Cursor tiene in locale nel suo database di stato (voce `availableDefaultModels2`), tutti i modelli, all'apertura di Settings e al cambio di agente; un test copre la lettura. Sostituisce la strada discussa prima (`cursor-agent models` in CI, elenco nel pacchetto e aggiornato da GitHub), scartata dopo la verifica: `cursor-agent` richiede login e usa nomi diversi da quelli della chat.
- Se l'elenco non si può ottenere, il developer vede solo il campo di testo, senza messaggi.
- I suggerimenti sono nell'ordine della fonte; la tendina mostra anche il nome leggibile quando è diverso dal valore.

## Assunzioni da controllare
- Scegliere un suggerimento dalla tendina salva subito, senza aspettare la perdita del fuoco (non chiesto nell'intervista).
- La verifica dei nomi di Cursor è parziale: `cursor-agent` non ha il login, quindi non si è usato; i `name` dell'elenco locale hanno la forma dei modelli abilitati nelle impostazioni di Cursor (`claude-opus-5-5`), ma che `modelConfig.modelName` li accetti lo conferma lo smoke test di accettazione.
- Nessun canale di log nuovo: gli errori della preparazione dell'elenco si ignorano in silenzio.
- Il frammento `requirements/tech/project-panel.md` superava i 12 KB: la sezione `panel/Settings` passa, senza cambi di testo oltre a quelli di questa Proposal, nel nuovo frammento `requirements/tech/settings.md`.
