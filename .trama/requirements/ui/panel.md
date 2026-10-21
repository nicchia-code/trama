---
description: "Usa sempre quando lavori sull'interfaccia: regole generali, pannello, Board e Requisiti."
---
# Interfaccia generale e pannello

## General
- Il pannello ha il suo tema, non quello dell'editor: la palette di shadcn/ui con colore di base zinc e primario blu, in una versione chiara e una scura, scelte con `Theme` in Settings (`panel/Settings`). I colori con un significato (tag dei Task, pallini di stato, schede rosse dei Drift, schede gialle delle risoluzioni, bordo animato del Task preso) vengono dalla palette di Tailwind, con una tonalità per il chiaro e una per lo scuro, e restano leggibili in entrambi.
- Ogni controllo è un componente di shadcn/ui: pulsanti `Button`, schede `Card`, badge e chip `Badge`, barra delle schede del pannello `Tabs`, modali e overlay `Dialog`, tendine `Select`, caselle `Checkbox`, tooltip `Tooltip`, fumetti `Popover`, campi con suggerimenti `Combobox`. Testi, tooltip, nomi accessibili, motivi di disabilitazione e comportamenti descritti negli altri Requisiti restano gli stessi.
- Un tooltip è un `Tooltip` di shadcn/ui: compare al passaggio del puntatore e al fuoco da tastiera, si chiude con `Esc`, e il suo testo è anche nella descrizione accessibile del controllo. Un controllo disabilitato mostra il suo tooltip lo stesso.
- Forme, spaziature, stati, movimento e profondità sono uguali in tutto il pannello: raggi e spaziature del tema di shadcn/ui; hover, fuoco (con l'anello `ring` sempre visibile da tastiera), disabilitato e selezionato con gli stili dei componenti; modali, tendine, fumetti e dettagli che si aprono e si chiudono con transizioni brevi, tolte quando il sistema chiede movimento ridotto; ombre leggere sulle schede e più marcate su modali, menu e fumetti.
- Dove il pannello o la riga di comando nominano una Proposal, un Task o un Drift con il suo ID (schede della Board e righe dei Task dentro le altre schede, badge `blocked` e `waiting`, dettagli nel Diagramma, `trama project show`, i comandi `list` e `show`, i messaggi dei comandi e i testi dei pulsanti, per esempio «Proposal P3 resolving Drifts awaits a decision»), mostrano il numero breve (`P3`, `T3`, `D3`) se la scheda ne ha uno e, solo se non ne ha (scheda chiusa, o Task Done senza numero, vedi `rules`), la sua identità permanente di otto caratteri. Mai tutti e due insieme. Il titolo resta accanto, come prima.
- Nel pannello il numero breve e l'identità permanente stanno nello stesso punto, con lo stesso carattere a spaziatura fissa; li distinguono il tooltip e il nome accessibile, «Short number (temporary)» o «Permanent ID», così il modo in cui sono scritti non è l'unico segnale.

## panel
- Il titolo della scheda del pannello (`WebviewPanel.title`) è il nome del Sistema: il testo dell'H1 di `system.md`, senza spazi attorno. Quando il Modello manca, non si legge o l'H1 è vuoto, il titolo è il nome della cartella del progetto. Il titolo si aggiorna a ogni nuovo quadro del pannello, così segue il Modello. Il nome dell'estensione e dei comandi nella palette resta `Trama`.
- Il pulsante che scansiona tutto il Sistema (`Scan System` nella barra della Board; `Scan` nella barra del Diagramma quando scansiona tutto, cioè alla radice, a Whole System e al livello di un Actor) porta, con N > 0 Task finiti dall'ultimo scan globale, l'etichetta `Scan System · N` o `Scan · N`; con N = 0 l'etichetta è quella di sempre. Il tooltip è `N Tasks finished since the last scan of the System` (`1 Task finished…` al singolare) e il nome accessibile ripete etichetta e tooltip. Nel Diagramma, quando `Scan` scansiona una Feature, il numero non compare. Non c'è più nessuno switch `Hold scan` in nessuna barra.
- Con l'Advisor Scanner attivo (`rules#work`) ogni pulsante Scan, quello del Sistema nella barra della Board e `Scan` nella barra del Diagramma a ogni livello (Sistema, Whole System, Actor o Feature), resta al suo posto ma è disabilitato, con l'etichetta di sempre senza `· N`, la sua icona e il tooltip `Scans are off: the Advisor Scanner checks the code during Runs.`; il nome accessibile ripete etichetta e tooltip. Il pulsante torna come sopra appena l'Advisor Scanner non è più attivo, per l'impostazione spenta o per un agente diverso da omp, al quadro successivo.
- L'icona Open Trama sta nella barra delle azioni dell'editor, in alto a destra di ogni gruppo di schede, in ogni finestra con almeno una cartella aperta, anche senza progetto Trama e anche quando la scheda attiva è il pannello. In una finestra senza cartelle non compare. Sulle schede di una richiesta di design mai inviata sta a destra di Send to agent.
- L'icona è il logo di Trama (le barre intrecciate di `trama-icon.png`) in un solo colore: scuro con i temi chiari, chiaro con i temi scuri. Tooltip e nome accessibile: `Open Trama`.
- La scheda del pannello mostra lo stesso logo accanto al titolo, con la stessa regola per i temi chiari e scuri.
- Nell'elenco delle estensioni l'icona di Trama è il logo nero su fondo bianco.
- Nella barra di stato in basso a sinistra c'è il pulsante `Trama`, solo testo, con tooltip e nome accessibile `Open Trama`. Il clic fa la stessa apertura ordinaria dell'icona nella barra dell'editor e del comando Open Trama: apre il pannello o lo porta in primo piano tenendo la sua scheda. L'icona nella barra dell'editor resta.
- All prose the panel shows is rendered as Markdown, in every tab: the descriptions of the System, Features, Machines, States, Actors and Events in the Diagram's details, the body of a Proposal, the introduction of an Area, la descrizione di un frammento and the text of every Requirement section (also the earlier text of a changed section), the texts of a Drift and the body of a Task. Titles, IDs, labels and button texts stay plain. Where an Event description sits in a one-line list entry, only inline formatting is rendered.
- Supported: paragraphs, headings, bold, italic, inline code, fenced code blocks, bulleted and numbered lists (nested too), block quotes and links. Not supported: tables and images; what is not supported shows as written. Raw HTML is never interpreted: it shows as text.
- A link opens in the system browser through the editor only when it is an http or https address, and its tooltip shows the address. Any other link shows its label as plain text.
- Headings inside a rendered text are never larger than the heading of the element that holds the text, so a text cannot compete with the panel's own headings. Colours follow the panel's theme; text uses the editor's UI font and code the editor's monospace font.
- Rendered text never makes the panel scroll sideways: long words wrap and a long line of a code block scrolls inside its own block. Text stays selectable.
- Malformed Markdown never prevents a text from showing: it is shown as written, as far as it cannot be read as Markdown.
- L'overlay delle domande segue le stesse regole: il testo della domanda, il contesto, la descrizione e i dettagli di ogni opzione sono resi come Markdown; le etichette delle opzioni, i pulsanti e la risposta libera mostrata nel riepilogo restano testo semplice.
- Ogni pulsante con testo della Board ha, oltre al testo, un'icona a sinistra del testo: il pulsante della barra, quelli in fondo alle colonne, quelli delle schede (anche dentro una scheda di risoluzione) e `Close` degli avvisi. I chip dei riferimenti, i tag dei Task, i badge `blocked`, `waiting` e `Resolving`, le righe dei Drift di una scheda di risoluzione, le righe dei Task dentro le altre schede e il menu del periodo di Done restano senza icona, salvo l'icona `link` dei Task bloccati da più Drift (vedi `panel/Board`).
- Le stesse azioni hanno la stessa icona anche nel Diagramma: `Scan` nella sua barra, `Approve`, `Reject` e `Dismiss Drift` nei dettagli. Gli altri controlli del Diagramma e le altre schede del pannello non cambiano.
- Le icone sono icone lucide, una per azione:
  - `Run all` e `Run` di un Task: `Play`.
  - `+ Add Work Item`: `Plus`.
  - `Resolve all` e `Resolve` di un Drift: `WandSparkles`.
  - `Scan System` nella Board e `Scan` nel Diagramma: `Search`.
  - `View on diagram`: `Network`.
  - `View requirements` e `View requirement`: `ListChecks`.
  - `Approve`: `Check`. `Reject`: `X`.
  - `Dismiss Drift`: `Ban`.
  - `Open` di un Task: `FileInput`.
  - `Show details`: `ChevronDown`; `Hide details`: `ChevronUp`.
  - `Close` di un avviso, della modale di una voce di History e della modale del corpo di una Proposal: `X`.
  - La «i» di una voce di History: `Info`, a sola icona.
- L'icona è grande 16 px, come quelle in fondo alle colonne, e resta a sinistra del testo anche quando lo spazio è poco: il testo non sparisce mai e il pulsante va a capo o si stringe come senza icona. Quando l'etichetta cambia (`Scan System · N`, `Show details` che diventa `Hide details`) l'icona resta, e cambia solo dove la mappa dà un'icona diversa.
- L'icona ha il colore del testo del pulsante, anche nei pulsanti primari e in quelli disabilitati; nessuna icona ha un colore proprio.
- L'icona è decorativa: testo, tooltip, nome accessibile e motivi di disabilitazione di ogni pulsante restano quelli di prima.
- La chevron della colonna History è l'icona lucide `ChevronRight` quando la colonna è aperta e `ChevronLeft` quando è collassata, a 16 px come le altre icone, al posto dei caratteri `›` e `‹`. Resta un pulsante a sola icona, con gli stessi tooltip e nome accessibile.

## panel/Requirements
- Ogni Area mostra titolo, descrizione e introduzione, poi i suoi frammenti nell'ordine dei nomi dei file; ogni frammento è un gruppo con il titolo, il nome del file (`<frammento>.md`) in testo secondario, la descrizione e sotto le sue sezioni. La sezione General, in qualunque frammento stia, compare per prima nel suo frammento.
- Un'Area senza frammenti mostra, sotto la descrizione, la riga `No fragments.`
- Con una Proposal selezionata, i frammenti seguono le stesse etichette delle Aree: `new fragment` per uno nuovo, `fragment removed` per uno cancellato, nessuna per uno cambiato; le sezioni dentro tengono le loro (`added`, `removed`, `changed`). Una sezione spostata da un frammento a un altro compare solo nel frammento di arrivo, con l'etichetta `moved from <frammento>`, seguita da `changed` e dal testo di prima se anche il testo cambia.
