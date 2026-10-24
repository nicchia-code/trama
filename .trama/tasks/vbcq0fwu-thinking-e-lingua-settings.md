---
column: done
technical: false
refs:
  - panel/Settings
  - setup-wizard
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/rules#agent-launching
  - requirements/tech#agent-launching
  - requirements/rules#setup-wizard
  - requirements/tech#setup-wizard
  - requirements/tech#proposal
  - requirements/ui#agent-launching
drift: null
proposal: srkyrbvl
agent: false
created: 2026-10-24T10:27:31.669Z
finished: 2026-10-24T11:15:19.056Z
---
# Thinking e lingua nei Settings

Ogni ruolo dei modelli (`trama.analysis`, `trama.scan`, `trama.execution`) e il modello di una Proposal possono portare un livello di thinking, salvato come suffisso del valore nella forma di omp, `<modello>:<livello>` (per esempio `anthropic/claude-opus-5-5:high`); senza suffisso il livello è `Default` e lo sceglie omp. Il campo della lingua nei Settings è disattivato.

Quando è fatto:

- **Suggerimenti con i livelli.** `parseOmpModels` in `extension/src/host/model-lists.ts`, che oggi tiene solo `selector` e `name`, legge anche `models[].thinking` dall'output di `omp models --json`: un elenco non vuoto di testi diventa `thinking`; `null` (modello senza reasoning), assente o non valido non dà livelli. Il messaggio host → webview diventa `modelSuggestions { models: { value, label?, thinking?: string[] }[], error? }`, con i livelli nell'ordine e coi nomi di omp; resta fuori dallo schema del messaggio `settings`. La risposta a `modelSuggestionsWanted` del wizard (con `ompPath` facoltativo) porta gli stessi livelli, calcolati con l'omp scelto nel passo `omp` anche se non ancora salvato.
- **Funzione pura di divisione/composizione.** In `extension/src/webview/settings/` una funzione pura condivisa divide il valore di un ruolo in modello e livello: il livello è il testo dopo l'ultimo `:` solo quando è uno dei livelli che omp dichiara per il modello prima dei `:` nell'elenco dei suggerimenti; altrimenti tutto il valore è il modello, senza livello (un nome di modello con `:` non si rompe). Compone `<modello>:<livello>`, o `<modello>` per `Default`. Provata con `bun:test`.
- **Select del livello (componente condiviso).** Accanto alla `Combobox` del modello (`ComboboxInput` in `extension/src/webview/settings/field.tsx`), a destra sulla stessa riga, un `Select` piccolo di shadcn/ui, largo quanto il contenuto, con nome accessibile `<titolo> thinking level` (es. `Analysis thinking level`). Voci: `Default`, poi i livelli che omp dichiara per il modello del campo. Il `Select` c'è solo quando il modello è nell'elenco di omp e omp gli dichiara livelli; con modello senza livelli, nome scritto a mano non elencato, campo vuoto o elenco mancante non c'è e la `Combobox` occupa tutta la riga. La `Combobox` mostra e modifica solo il modello, mai il suffisso. Il `Select` ricompone il valore e lo invia con lo stesso messaggio di oggi del ruolo (invio immediato della voce scelta). Cambiare il modello porta con sé il livello solo se il nuovo modello lo dichiara; altrimenti torna a `Default`. Lo stesso componente serve la scheda Settings, il passo `Models` del wizard e la modale del modello della Proposal.
- **Wizard.** Nel passo `Models` (`extension/src/webview/wizard/logic.ts` e la vista del passo) ogni ruolo ha il suo livello nel suo stesso valore; `confirmSetup` manda in `values` il valore già composto. Il riepilogo mostra ogni ruolo come `<modello> · <livello>`, o il solo modello con `Default`. `trama.language` non è nel wizard.
- **Proposal.** La modale del modello della Proposal (`extension/src/webview/board/dialogs.tsx`, `Dialog` di shadcn/ui) usa il componente condiviso e chiede `modelSuggestionsWanted` all'apertura; il modello salvato della Proposal porta il livello nel nome, come un ruolo. La scheda della Proposal sulla Board lo mostra come `<modello> · <livello>` (solo il modello con `Default`).
- **Il livello viaggia col modello.** Nessuna impostazione a sé e nessun `--thinking`: l'host passa il valore intero, senza separarlo, a `--model`, a `--slow` e a `modelRoles.advisor` dell'overlay dell'Advisor Scanner (`configuredModels` in `extension/src/host/agent.ts`, `ompOptions`/`askMoreOptions` in `extension/src/host/terminal-agent.ts`), al sotto-agente `trama-implementer`, ai Run di una sequenza per modello e alle conversazioni di omp Chat, General compresa (`setModel` in `extension/src/host/omp-chat/client.ts`, `omp --model <m>:high acp`). Due Task con lo stesso modello e livelli diversi finiscono in gruppi diversi della sequenza per modello (confronto a testo uguale). Va verificato con omp 18.12.6 che il suffisso `:<livello>` sia accettato in ciascuno di questi posti (`--model`, `--slow`, `modelRoles.advisor`, omp Chat); dove non lo è, l'host lo toglie da quel solo argomento e lo passa con l'opzione che omp offre lì, se c'è. L'esito di ogni posto va annotato in `docs/uat.md`.
- **Lingua disattivata.** `trama.language` (`extension/package.json`, `extension/src/host/settings-schema.ts`) resta nel gruppo `omp` dei Settings con titolo e «i», ma il suo `Input` è disabilitato e segnato come tale per le tecnologie assistive; sotto, in testo secondario collegato con `aria-describedby`, `Disabled for now: agents write in English.`. Un valore già salvato si vede nel campo ma non vale. Il campo non mostra l'avviso `The workspace setting overrides this: …`. La descrizione dell'impostazione nel manifest diventa: «Disabled for now: agents write in English. Later: the language the agent writes in, for example `Italian`; code stays in English.». La soppressione lato host della frase della lingua nelle istruzioni non è parte di questo Task: la fa il Task `Frasi dell'istruzione`.
