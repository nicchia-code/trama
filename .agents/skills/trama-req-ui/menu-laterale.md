# Requirements: Interfaccia, Interfaccia del menu laterale

Usa quando costruisci o cambi il menu laterale di Trama: icona nella barra delle attività, voci, Scan System e badge.

## menu-laterale

- A sinistra, nella barra delle attività dell'editor, c'è l'icona di Trama in ogni finestra, anche senza cartelle aperte e anche senza progetto Trama. È il logo di Trama (le barre intrecciate di `trama-icon.png`) in un solo colore, quello che l'editor dà alle icone della barra delle attività. Tooltip e nome accessibile: `Trama`.
- Il clic sull'icona apre la vista di Trama nella barra laterale, come ogni voce della barra delle attività. La vista ha il titolo `Trama`. Non c'è più la frase `Model, Board and Requirements of your project, in one panel.` né il pulsante `Open Trama`.
- In un progetto Trama, quando N > 0 schede aspettano una decisione (il numero della voce `Board`, `ui#panel/Board`), l'icona porta il badge dell'editor con N e il tooltip `N cards await a decision` (`1 card awaits a decision` al singolare). Con N = 0, e fuori da un progetto Trama, non c'è badge.
- Il menu usa il tema del pannello (`ui#General`, `trama.theme`) e i suoi componenti: ogni voce è un pulsante largo quanto la vista, con un'icona lucide a 16 px a sinistra del testo, nel colore del testo; le voci si raggiungono con Tab nell'ordine in cui compaiono e si attivano con Invio o Spazio.
- Senza cartelle aperte la vista mostra la frase `Open a folder to use Trama.`, sotto il pulsante primario `Open Folder` (icona `FolderOpen`), che apre la scelta della cartella dell'editor, e in fondo la voce `Settings`.
- In una cartella che non è un progetto Trama il menu ha soltanto le voci `Get Started` (icona `Rocket`), che apre il pannello su Get Started, e, in fondo, `Settings`.
- In un progetto Trama il menu ha, dall'alto: le voci `Board` (icona `SquareKanban`), `Diagram` (icona `Network`), `Requirements` (icona `ListChecks`), `Specs` (icona `Package`) e `History` (icona `History`); sotto, separato da uno spazio, il pulsante primario `Scan System` (icona `Search`); in fondo alla vista, separata da una linea, la voce `Settings` (icona `Settings`).
- La voce `Board` mostra a destra, con N > 0 schede che aspettano una decisione, un `Badge` con N; il nome accessibile della voce è allora `Board, N awaiting a decision`. Con N = 0 non c'è badge e il nome accessibile è `Board`.
- `Scan System` ha l'etichetta, il numero `· N`, il tooltip, il nome accessibile e la disattivazione con l'Advisor Scanner descritti in `ui#panel` per il pulsante che scansiona tutto il Sistema. Premerlo lancia lo scan senza aprire il pannello e senza spostare il focus.
- Con il pannello aperto, la voce della vista che il pannello mostra è evidenziata con lo stile selezionato dei componenti e ha `aria-current="page"`; l'evidenza cambia appena il pannello cambia vista. Con il pannello chiuso nessuna voce è evidenziata. Get Started e Settings si evidenziano allo stesso modo.
- Il tooltip di ogni voce è `Open <nome della voce> in the Trama panel` (per esempio `Open Board in the Trama panel`); il suo nome accessibile è il testo della voce.
- I comandi della palette `Trama: Show Board`, `Trama: Show Diagram`, `Trama: Show Requirements`, `Trama: Show Specs`, `Trama: Show History` e `Trama: Show Settings` fanno ciò che fanno le voci omonime del menu.
