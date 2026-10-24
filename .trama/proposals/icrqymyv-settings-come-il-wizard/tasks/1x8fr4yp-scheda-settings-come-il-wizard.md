---
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.SHOW_SETTINGS
  - requirements/ui#panel/Settings
  - requirements/tech#panel/Settings
  - requirements/ui#General
---
# Scheda Settings come il wizard

A lavoro finito la scheda Settings si legge come i passi del wizard di setup: una sola colonna centrata, larga al massimo circa 720 px (la stessa classe del wizard, `mx-auto w-full max-w-[720px] min-w-0 px-4`), a tutta larghezza meno i margini nei pannelli stretti, senza scorrimento laterale e senza nulla che esca dalla colonna, in entrambi i temi e da circa 300 px. La griglia di colonne affiancate larga 1100 px sparisce. Non ci sono indice né selettore dei gruppi: il developer scorre la pagina.

In cima, come intestazione di pagina, il titolo «Settings»; in un progetto, sulla stessa riga e allineato a destra, il pulsante «Guided setup», che apre il wizard senza percorso come oggi; sotto circa 480 px il pulsante va sotto il titolo, allineato a sinistra. Senza progetto il pulsante non c'è. Mentre il wizard è aperto la scheda mostra i suoi passi al posto del titolo e del modulo, come oggi; annullato o confermato, torna al modulo.

Sotto l'intestazione i gruppi del wizard, presi dalla stessa lista condivisa, nell'ordine: `omp` «omp is required: Trama runs every agent with omp.» (`trama.ompPath`, `trama.terminalLocation`, `trama.ignoreInstructionFiles`, `trama.autoExit`, `trama.language`); `Models` «Choose the model for each kind of work.»; `Project` «Choose where Trama installs the agent skills.»; `Advanced` «Theme and optional features.», diviso nei sottogruppi Appearance, Drifts, Agents e omp Chat, ciascuno con il suo sottotitolo, come il passo Advanced del wizard. Il gruppo Features non esiste più; Auto Exit e la lingua (disattivata, con la sua nota «Disabled for now: agents write in English.») restano nel gruppo omp. Ogni gruppo ha il titolo come intestazione di livello successivo a quello della pagina (i sottogruppi un livello sotto) e sotto, in testo secondario, la sua frase.

Ogni impostazione è resa da `SettingField` nella modalità pagina del wizard: titolo in grassetto (la Checkbox a sinistra del titolo), spiegazione Markdown in testo secondario sotto il titolo, controllo, per un enum la descrizione del valore scelto, poi solo i messaggi presenti (validità, workspace che prevale, errore dell'elenco dei modelli, nota della lingua) senza spazio per quelli assenti; spiegazione, descrizione del valore e messaggi sono collegati al controllo con `aria-describedby`. Non c'è più la «i» né il fumetto: la modalità a fumetto sparisce dal codice (prop `explain`, `InfoBubble`, `openKey`/`setOpenKey`, `CLOSE_DELAY_MS`), insieme ai test che la fissano. Le spiegazioni restano entro due frasi brevi, circa 160 caratteri, come vuole `ui#General`. Sotto il titolo dei tre ruoli, prima della spiegazione e in grassetto, il consiglio del wizard: Analysis «Your most capable model.», Execution «A mid-range model.», Scan «A fast, light model.»; la scheda non sceglie né ordina i modelli in base al consiglio.

Nel gruppo omp, sotto la frase e prima delle impostazioni, lo stato di omp sta nello stesso riquadro con bordo del passo omp del wizard (stessi testi, icone, colori e Install omp dentro quando omp manca), reso dal componente presentazionale condiviso alimentato da `ompStatus`. Il messaggio `ompStatus` guadagna `models?: number`, il numero di modelli preso dalla stessa chiamata `ompModels` che prepara `modelSuggestions`, senza una seconda chiamata; `state` resta `checking` finché l'host non ha versione e numero, oppure un errore. La scheda non aggiorna mai omp: niente «Updating omp to…» né «Could not update omp…», lo stato dice solo la versione che risponde e con quanti modelli. Lo stato si verifica quando la vista diventa visibile, a ogni cambio di `trama.ompPath` e alla fine del terminale di installazione.

In un progetto Trama, dopo le impostazioni del gruppo omp, c'è lo stesso riquadro dei file di istruzioni del passo omp del wizard, con gli stessi testi e i link «Open <percorso>». Il webview lo chiede con `instructionFilesWanted` (senza `root`) ogni volta che la vista diventa visibile; la ricerca è quella del wizard sulla cartella del progetto aperto, e un link si apre con `openInstructionFile`, lasciando la scheda dov'è. La riga «Trama's omp jobs ignore these files.» segue il valore salvato di `trama.ignoreInstructionFiles` e compare o sparisce appena cambia. Senza file, durante la ricerca, fuori da un progetto Trama o senza cartelle, il riquadro non c'è.

Il salvataggio resta immediato e invariato (`setSetting`, impostazioni utente, nessuna conferma). Tutti i testi della scheda sono in inglese.

La pagina si appoggia alla lista condivisa dei gruppi e ai componenti condivisi (riquadro di stato di omp, riquadro dei file di istruzioni, corpo dei gruppi) che crea il Task `bmdmtuvu` «Gruppi e componenti condivisi»: questo Task si realizza dopo di lui. Se `bmdmtuvu` non è ancora fatto, l'agente lo realizza prima, come quel Task dice, e solo poi questo.

Vanno aggiornati i test: si tolgono quelli sulla «i», sul fumetto e sulla griglia, si adattano quelli sui gruppi come h2, su Guided setup e sulla riga di stato di omp, e se ne aggiungono per frasi dei gruppi, consigli dei ruoli, riquadro di stato con numero di modelli e riquadro dei file di istruzioni. `README.md` ed `extension/README.md` nominano i gruppi omp, Models, Project e Advanced con i sottogruppi al posto di Features e Agent; `CHANGELOG.md` registra la scheda ridisegnata; i passi Settings di `docs/uat.md` descrivono la nuova pagina.

Dove nel codice:
- `panel/Settings` — `extension/src/webview/settings/index.tsx` (`SettingsPage` 59-106, `OmpStatusRow` 109-122, `mountSettings` 125-186)
- `panel/Settings` — `extension/src/webview/settings/logic.ts` (`groupSettings`, `ompStatusLine`)
- `requirements/ui#panel/Settings` — `extension/src/webview/settings/field.tsx` (`InfoBubble` 47-170, `FieldProps` 163-199, page mode 376-402, bubble mode 405-440)
- `requirements/tech#panel/Settings` — `extension/src/host/settings-schema.ts:51-113` (`SETTING_GROUPS`)
- `requirements/tech#panel/Settings` — `extension/src/protocol.ts:113-117` (`instructionFilesWanted`, `openInstructionFile`, `ompStatus`)
- `requirements/tech#panel/Settings` — `extension/src/host/controller.ts:121-124,407-411,757-772` (instruction files, omp status, `ompModels`)
- `panel/Settings` — `extension/src/webview/wizard/index.tsx:213-304` (`OmpStatus`, `InstructionFiles`, `SettingsBody`) e `extension/src/webview/wizard/logic.ts` (`ROLE_ADVICE`, `STEP_SENTENCES`, `ADVANCED_GROUPS`)
- `panel/Settings` — `extension/src/webview/main.tsx:131-133` (instradamento dei messaggi)
- `panel/Open/developer.OPEN_GUIDED_SETUP` — `extension/src/webview/settings/index.tsx:66-79` (pulsante Guided setup)
- `panel/Settings` — `test/webview-settings.test.tsx`, `test/settings-schema.test.ts:43-133`, `test/panel-wizard-entries.test.tsx:89-122`
- `requirements/tech#panel/Settings` — `README.md:52`, `extension/README.md:7,9,13`, `CHANGELOG.md`, `docs/uat.md`
