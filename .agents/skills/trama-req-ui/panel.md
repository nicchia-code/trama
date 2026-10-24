# Requirements: Interfaccia, Interfaccia del pannello

Usa quando costruisci o cambi il pannello, gli ingressi di Trama nell'editor, il Markdown reso e i Requisiti.

## panel

- Il titolo della scheda del pannello (`WebviewPanel.title`) è il nome del Sistema: il testo dell'H1 di `system.md`, senza spazi attorno. Quando il Modello manca, non si legge o l'H1 è vuoto, il titolo è il nome della cartella del progetto. Il titolo si aggiorna a ogni nuovo quadro del pannello, così segue il Modello. Il nome dell'estensione e dei comandi nella palette resta `Trama`.
- `Scan System` nel menu laterale (`ui#menu-laterale`) è l'unico pulsante che scansiona, e scansiona sempre tutto il Sistema. Con N > 0 Task finiti dall'ultimo scan globale porta l'etichetta `Scan System · N`; con N = 0 l'etichetta è `Scan System`. Non ha tooltip; il nome accessibile ripete l'etichetta e la frase `N Tasks finished since the last scan of the System` (`1 Task finished…` al singolare). Il numero c'è con l'Advisor Scanner acceso o spento. Il Diagramma non ha più il pulsante `Scan`, a nessun livello (radice, Whole System, Actor, Feature), e la palette dei comandi non ha più `Trama: Scan System`. Non c'è più nessuno switch `Hold scan` in nessuna barra.
- `Scan System` non è mai disabilitato dall'Advisor Scanner (`rules#work`): il testo `Scan is off during Runs.` non esiste più, né come tooltip né come riga sotto il pulsante.
- Conferma dello scan di tutto il Sistema: prima di lanciarlo da `Scan System` nel menu laterale, con l'Advisor Scanner acceso o spento, l'host apre un dialogo modale dell'editor (`vscode.window.showWarningMessage` con `modal: true`): «Scan the whole System?», dettaglio «The agent compares every Machine with the code: this can take a long time.», pulsante `Scan`. `Cancel`, Esc o la chiusura del dialogo non fanno nulla: nessuno scan, nessun ricordo dello scan, il numero `· N` resta. I testi sono in inglese e non seguono `trama.language`.
- La scheda del pannello mostra il logo accanto al titolo, in un solo colore: scuro con i temi chiari, chiaro con i temi scuri.
- Nell'elenco delle estensioni l'icona di Trama è il logo nero su fondo bianco.
- Nella barra di stato non c'è un pulsante con il logo di Trama: l'icona di Trama sta nella barra delle attività (`ui#menu-laterale`) e nella barra di stato resta solo l'elemento dei ghost (`ui#announcement`).
- Nella barra delle azioni dell'editor, in alto a destra dei gruppi di schede, non c'è nessuna icona per aprire Trama. Send to agent delle richieste di design resta com'è.
- All prose the panel shows is rendered as Markdown, in every tab: the descriptions of the System, Features, Machines, States, Actors and Events in the Diagram's details, the body of a Proposal, the introduction of an Area, la descrizione di un frammento and the text of every Requirement section (also the earlier text of a changed section), the texts of a Drift and the body of a Task. Titles, IDs, labels and button texts stay plain. Where an Event description sits in a one-line list entry, only inline formatting is rendered.
- Supported: paragraphs, headings, bold, italic, inline code, fenced code blocks, bulleted and numbered lists (nested too), block quotes, links and tables. Not supported: images; what is not supported shows as written. Raw HTML is never interpreted: it shows as text.
- A table is a GitHub-style pipe table: a header row, a separator row of dashes and the body rows. Cells render inline Markdown (bold, italic, inline code, links); the colons of the separator row align a column left (`:--`), centre (`:-:`) or right (`--:`), and a column without colons is left-aligned. A row with fewer cells than the header gets empty cells, one with more drops the extra ones. The header row is bold, on a slightly darker background; rows are separated by thin lines in the border colour of the theme; cells have a small padding.
- A link opens in the system browser through the editor only when it is an http or https address, and its tooltip shows the address. Any other link shows its label as plain text.
- Headings inside a rendered text are never larger than the heading of the element that holds the text, so a text cannot compete with the panel's own headings. Colours follow the panel's theme; text uses the editor's UI font and code the editor's monospace font.
- Rendered text never makes the panel scroll sideways: long words wrap, a long line of a code block scrolls inside its own block and a table that does not fit scrolls sideways inside its own box. In a table a cell is at most about 320 px wide and wraps its text inside that width; the columns narrow to fit the available width, wrapping more, and only when they cannot narrow further does the table scroll inside its box. The table follows every change of width of the panel, the chat or a side bar, also after it has been rendered: it narrows and wraps, or widens again, without leaving stale widths or scroll bars. Text stays selectable.
- Malformed Markdown never prevents a text from showing: it is shown as written, as far as it cannot be read as Markdown.
- L'overlay delle domande segue le stesse regole: il testo della domanda, il contesto, la descrizione e i dettagli di ogni opzione sono resi come Markdown; le etichette delle opzioni, i pulsanti e la risposta libera mostrata nel riepilogo restano testo semplice.
- Ogni pulsante con testo della Board ha, oltre al testo, un'icona a sinistra del testo: quelli in fondo alle colonne, quelli delle schede (anche dentro una scheda di risoluzione) e `Close` degli avvisi. I chip dei riferimenti, i tag dei Task, i badge `blocked`, `waiting` e `Resolving`, le righe dei popup di quei badge, le righe dei Drift di una scheda di risoluzione e il menu del periodo della History restano senza icona.
- Le stesse azioni hanno la stessa icona anche nel Diagramma: `Approve`, `Reject` e `Dismiss Drift` nei dettagli. Gli altri controlli del Diagramma e le altre schede del pannello non cambiano.
- Le icone sono icone lucide, una per azione:
  - `Run all` e `Run` di un Task: `Play`.
  - `+ Add Work Item`: `Plus`; la sua freccetta, a sola icona: `ChevronUp`; le voci `Unify Drifts`, `Refine All` e `Cancel Refine All` del suo menu: nessuna icona.
  - `Resolve` di un Drift: `WandSparkles`.
  - `Scan System` nel menu laterale: `Search`.
  - `View on diagram`: `Network`.
  - `View requirements` e `View requirement`: `ListChecks`.
  - `Approve`: `Check`. `Reject`: `X`; la sua freccetta, a sola icona: `ChevronDown`; la voce `Rework with feedback…` del suo menu: nessuna icona.
  - `Dismiss Drift`: `Ban`; la sua freccetta, a sola icona: `ChevronDown`; la voce `Rework with feedback…` del suo menu: nessuna icona.
  - `Show details`: `ChevronDown`; `Hide details`: `ChevronUp`.
  - `Close` di un avviso, della modale di una voce di History, della modale del corpo di una Proposal e delle modali dei dettagli di Task e Drift: `X`.
  - `Ask more`: `MessageCircleQuestion`.
  - `Clear` in fondo alla colonna Done: `Trash2`.
- L'icona è grande 16 px, come quelle in fondo alle colonne, e resta a sinistra del testo anche quando lo spazio è poco: il testo non sparisce mai e il pulsante va a capo o si stringe come senza icona. Fa eccezione soltanto la modalità solo icone del menu laterale (`ui#menu-laterale`). Quando l'etichetta cambia (`Scan System · N`, `Show details` che diventa `Hide details`) l'icona resta, e cambia solo dove la mappa dà un'icona diversa.
- L'icona ha il colore del testo del pulsante, anche nei pulsanti primari e in quelli disabilitati; nessuna icona ha un colore proprio.
- L'icona è decorativa: testo, tooltip, nome accessibile e motivi di disabilitazione di ogni pulsante restano quelli di prima.
- La chevron della colonna Done è l'icona lucide `ChevronRight` quando la colonna è aperta e `ChevronLeft` quando è collassata, a 16 px come le altre icone, al posto dei caratteri `›` e `‹`. Resta un pulsante a sola icona, con gli stessi tooltip e nome accessibile.

## panel/Requirements

- Ogni Area mostra titolo, descrizione e introduzione, poi i suoi frammenti nell'ordine dei nomi dei file; ogni frammento è un gruppo con il titolo, il nome del file (`<frammento>.md`) in testo secondario, la descrizione e sotto le sue sezioni. La sezione General, in qualunque frammento stia, compare per prima nel suo frammento.
- Un'Area senza frammenti mostra, sotto la descrizione, la riga `No fragments.`
- Con una Proposal selezionata, i frammenti seguono le stesse etichette delle Aree: `new fragment` per uno nuovo, `fragment removed` per uno cancellato, nessuna per uno cambiato; le sezioni dentro tengono le loro (`added`, `removed`, `changed`). Una sezione spostata da un frammento a un altro compare solo nel frammento di arrivo, con l'etichetta `moved from <frammento>`, seguita da `changed` e dal testo di prima se anche il testo cambia.
